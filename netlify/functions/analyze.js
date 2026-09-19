// netlify/functions/analyze.js
//
// Server-side proxy to Groq. The Groq API key never reaches the browser.
// Handles two request types:
//   { mode: "analyze", text, url, image }  -> full verification report
//   { mode: "assist", text, url, question, context } -> short follow-up answer
//
// Configure GROQ_API_KEY in Netlify environment variables (see README.md).

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Text-only model used for every request.
// (Groq deprecated llama-3.3-70b-versatile in mid-2026; openai/gpt-oss-120b is
// their recommended, currently-supported replacement. Override via env var
// if Groq's lineup changes again.)
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
// Vision-capable model used only when the user attaches a screenshot.
// qwen/qwen3.6-27b is Groq's current production vision model (supports JSON mode).
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

const MAX_TEXT_LENGTH = 6000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB, before base64 overhead
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const SYSTEM_PROMPT_ANALYZE = `You are the analysis engine behind CivicShield NG, a citizen-facing election integrity and digital-literacy tool for Nigeria.

Your job is to help an ordinary citizen understand a piece of election-related content they received (a message, a claim, or a link, and sometimes a screenshot). You are NOT a political commentator and you are NOT a search engine.

Hard rules, never break these:
- Stay strictly politically neutral. Never suggest who to vote for, which party is better, or take any position on a political question.
- Never invent sources, statistics, news events, or authoritative confirmations. You have not browsed the internet and you have not checked any external database. If you did not receive a source in the input, you must say verification against an authoritative source was not performed.
- Do not declare something "false" or "true" just because you personally cannot verify it. Use nuanced status labels only from this exact list: "Verified from available source", "Supported by available evidence", "Contradicted by available evidence", "Unverified", "Suspicious", "Potential threat".
- Clearly separate FACT (what the text literally says), EVIDENCE (what was actually provided to you), MISSING INFORMATION (what would be needed to verify this), and YOUR INTERPRETATION (your reasoning). Never blend these.
- Never ask the user for, or encourage sharing of, passwords, OTPs, bank PINs, BVN, NIN, or any other sensitive credential.
- Avoid sensational language ("DANGEROUS", "SCAM ALERT!!!"). Use calm, plain, respectful language a worried but capable adult can act on.
- If the content is benign, say so plainly rather than manufacturing risk.

You must respond with ONLY a single JSON object, no markdown fences, no commentary before or after it, matching exactly this shape:

{
  "main_claim": "one or two sentence neutral restatement of the core claim",
  "entities": { "people_or_orgs": ["..."], "election_entities": ["..."], "dates": ["..."], "urls": ["..."] },
  "threat_category": "one of: Possible misinformation | Potential phishing | Potential impersonation | Suspicious website | Potential scam | Potentially manipulated media | Unverified claim | No obvious threat detected",
  "status": "one of: Verified from available source | Supported by available evidence | Contradicted by available evidence | Unverified | Suspicious | Potential threat",
  "risk_summary": "one calm sentence describing the potential risk, in plain language, no sensational wording",
  "suspicious_indicators": ["short factual observations about the content itself, e.g. urgency language, mismatched domain, request for personal data"],
  "evidence": "what was actually provided or observable (from the user's text/url/image only) that supports the assessment - be explicit that no external database was checked",
  "missing_information": "what would be needed to actually verify or refute this claim",
  "recommended_actions": ["concrete, specific next steps the citizen can take, referencing official channels in general terms, never inventing a specific URL that was not given to you"],
  "educational_note": "2-4 sentences in simple language explaining the general pattern this resembles, so the user learns to recognize it themselves",
  "suggested_lesson": "the single most relevant lesson title from this fixed list, or null: Spotting Election Scams | Recognizing Fake Registration Links | Identifying Impersonation | Checking Political Claims | Recognizing Phishing | Understanding Manipulated Images | Understanding AI-Generated Audio and Video | Staying Safe on WhatsApp | Protecting Personal Information | Reporting Suspicious Information"
}

If an image was provided, describe only what is visually observable (layout, requested fields, sender name shown, visual quality/artifacts) inside "evidence" and "suspicious_indicators" - never assert the identity of a real organization or person from a logo alone with certainty; describe it as "the image displays a logo resembling X".`;

const SYSTEM_PROMPT_ASSIST = `You are the follow-up assistant inside CivicShield NG's "Verify" tool. A citizen has already received a JSON analysis of a specific piece of election-related content, and is now asking a short follow-up question about that specific submission.

Rules:
- Stay strictly focused on the submitted content. Do not become a general-purpose assistant and do not answer questions unrelated to this submission or to citizen digital safety.
- Stay politically neutral. Never recommend a candidate, party, or how to vote.
- Never invent sources or claim to have checked the internet.
- Never ask for or accept passwords, OTPs, bank PINs, BVN, NIN, or other sensitive credentials. If the user pastes any of these, tell them to remove it and do not repeat it back.
- Keep answers short: 2-5 plain sentences, no markdown headers, no bullet spam.
- If asked something you cannot know (e.g. "is this really from INEC?"), say plainly that you cannot confirm identity or authenticity and explain how the user can check through an official channel.

Respond with plain text only, not JSON.`;

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "This endpoint only accepts POST requests." });
  }

  if (!process.env.GROQ_API_KEY) {
    return respond(500, {
      error:
        "The analysis service is not configured yet. GROQ_API_KEY is missing from the server environment.",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return respond(400, { error: "The request could not be read. Please try again." });
  }

  const mode = payload.mode === "assist" ? "assist" : "analyze";
  const text = typeof payload.text === "string" ? payload.text.slice(0, MAX_TEXT_LENGTH) : "";
  const url = typeof payload.url === "string" ? payload.url.slice(0, 500) : "";
  const image = payload.image && typeof payload.image === "object" ? payload.image : null;

  if (mode === "analyze" && !text.trim() && !url.trim() && !image) {
    return respond(400, {
      error: "Please paste a message, a link, or attach a screenshot before analyzing.",
    });
  }

  if (image) {
    if (!ALLOWED_IMAGE_TYPES.includes((image.type || "").toLowerCase())) {
      return respond(400, {
        error: "That image type is not supported. Please upload a JPG, PNG, or WEBP file.",
      });
    }
    const approxBytes = Math.ceil(((image.data || "").length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return respond(400, { error: "That image is too large. Please upload a file under 6MB." });
    }
  }

  try {
    if (mode === "assist") {
      return await handleAssist(payload, text, url, headers);
    }
    return await handleAnalyze(text, url, image, headers);
  } catch (err) {
    console.error("CivicShield analyze error:", err.message);
    return respond(502, {
      error:
        "We couldn't reach the analysis service right now. Please check your connection and try again in a moment.",
    });
  }

  function respond(statusCode, body) {
    return { statusCode, headers, body: JSON.stringify(body) };
  }
};

async function handleAnalyze(text, url, image, headers) {
  const userContentParts = [];
  let modelToUse = TEXT_MODEL;

  let promptText = "Analyze the following submission from a Nigerian citizen.\n\n";
  promptText += `Message/claim text: ${text.trim() || "(none provided)"}\n`;
  promptText += `Included link: ${url.trim() || "(none provided)"}\n`;
  if (image) {
    promptText += "A screenshot has also been attached. Base your visual observations only on it.\n";
  }

  if (image) {
    modelToUse = VISION_MODEL;
    userContentParts.push({ type: "text", text: promptText });
    userContentParts.push({
      type: "image_url",
      image_url: { url: `data:${image.type};base64,${image.data}` },
    });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT_ANALYZE },
    {
      role: "user",
      content: image ? userContentParts : promptText,
    },
  ];

  let groqResult;
  try {
    groqResult = await callGroq(modelToUse, messages, true);
  } catch (err) {
    if (image && err.imageUnsupported) {
      // Gracefully degrade: retry as text-only and tell the user screenshot analysis was skipped.
      const textOnlyMessages = [
        { role: "system", content: SYSTEM_PROMPT_ANALYZE },
        {
          role: "user",
          content:
            promptText +
            "\n(Note: screenshot analysis is unavailable in the current deployment. Analyze only the text and link provided, and mention in evidence that the screenshot could not be processed.)",
        },
      ];
      const fallback = await callGroq(TEXT_MODEL, textOnlyMessages, true);
      fallback.image_analysis_skipped = true;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fallback),
      };
    }
    throw err;
  }

  return { statusCode: 200, headers, body: JSON.stringify(groqResult) };
}

async function handleAssist(payload, text, url, headers) {
  const question = typeof payload.question === "string" ? payload.question.slice(0, 500) : "";
  const context = typeof payload.context === "string" ? payload.context.slice(0, 4000) : "";

  if (!question.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Please enter a question." }) };
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT_ASSIST },
    {
      role: "user",
      content: `Submitted text: ${text || "(none)"}\nSubmitted link: ${url || "(none)"}\nPrior analysis summary: ${
        context || "(none)"
      }\n\nCitizen's question: ${question}`,
    },
  ];

  const completion = await callGroqRaw(TEXT_MODEL, messages, { jsonMode: false });
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ answer: completion.trim() }),
  };
}

// Calls Groq and parses the response as strict JSON. Retries once with a
// stricter reminder (and without JSON mode, in case that itself failed) if
// the model wraps the JSON in prose or fences.
async function callGroq(model, messages, expectJson) {
  let raw;
  try {
    raw = await callGroqRaw(model, messages, { jsonMode: expectJson });
  } catch (err) {
    if (expectJson && !err.imageUnsupported) {
      // Some models/configurations reject response_format itself — retry without it.
      raw = await callGroqRaw(model, messages, { jsonMode: false });
    } else {
      throw err;
    }
  }
  if (!expectJson) return raw;

  const parsed = tryParseJson(raw);
  if (parsed) return parsed;

  const retryMessages = messages.concat([
    {
      role: "user",
      content:
        "Your previous reply was not valid JSON. Respond again with ONLY the JSON object, no explanation, no markdown code fences.",
    },
  ]);
  const retryRaw = await callGroqRaw(model, retryMessages, { jsonMode: false });
  const retryParsed = tryParseJson(retryRaw);
  if (retryParsed) return retryParsed;

  throw new Error("Analysis service returned an unreadable response.");
}

function tryParseJson(raw) {
  if (!raw) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) {
        return null;
      }
    }
    return null;
  }
}

async function callGroqRaw(model, messages, options) {
  const jsonMode = Boolean(options && options.jsonMode);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("The analysis service timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new Error("The analysis service is receiving too many requests. Please try again shortly.");
    }
    if (
      response.status === 400 &&
      /image|vision|multimodal/i.test(errBody)
    ) {
      const err = new Error("Image analysis is unavailable with the current model configuration.");
      err.imageUnsupported = true;
      throw err;
    }
    throw new Error(`Analysis service error (status ${response.status}).`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  if (!content) {
    throw new Error("Analysis service returned an empty response.");
  }
  return content;
}
