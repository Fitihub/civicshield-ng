<?php
// api/analyze.php
//
// PHP/Apache (XAMPP) equivalent of netlify/functions/analyze.js.
// Mirrors the exact same request/response contract, so js/verify.js works
// unchanged against either backend. Use this for local testing under
// XAMPP; use the Netlify Function for the real deployed site.
//
// Setup: copy api/config.example.php to api/config.local.php and add your
// Groq API key there. See the "Running on XAMPP" section in README.md.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'This endpoint only accepts POST requests.']);
    exit;
}

// ---------------- Config ----------------

$localConfig = [];
$localConfigPath = __DIR__ . '/config.local.php';
if (file_exists($localConfigPath)) {
    $localConfig = require $localConfigPath;
}

function cfg($config, $key, $default = null) {
    if (!empty($config[$key])) return $config[$key];
    $env = getenv($key);
    if ($env !== false && $env !== '') return $env;
    return $default;
}

define('GROQ_API_KEY', cfg($localConfig, 'GROQ_API_KEY'));
define('TEXT_MODEL', cfg($localConfig, 'GROQ_TEXT_MODEL', 'openai/gpt-oss-120b'));
define('VISION_MODEL', cfg($localConfig, 'GROQ_VISION_MODEL', 'qwen/qwen3.6-27b'));
define('GROQ_ENDPOINT', 'https://api.groq.com/openai/v1/chat/completions');
define('MAX_TEXT_LENGTH', 6000);
define('MAX_IMAGE_BYTES', 6 * 1024 * 1024); // 6MB, before base64 overhead

$ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

if (!GROQ_API_KEY) {
    http_response_code(500);
    echo json_encode([
        'error' => 'The analysis service is not configured yet. Copy api/config.example.php to api/config.local.php and add your GROQ_API_KEY.',
    ]);
    exit;
}

// ---------------- Request parsing ----------------

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) $payload = [];

$mode = (($payload['mode'] ?? '') === 'assist') ? 'assist' : 'analyze';
$text = (isset($payload['text']) && is_string($payload['text'])) ? substr($payload['text'], 0, MAX_TEXT_LENGTH) : '';
$url = (isset($payload['url']) && is_string($payload['url'])) ? substr($payload['url'], 0, 500) : '';
$image = (isset($payload['image']) && is_array($payload['image'])) ? $payload['image'] : null;

if ($mode === 'analyze' && trim($text) === '' && trim($url) === '' && !$image) {
    http_response_code(400);
    echo json_encode(['error' => 'Please paste a message, a link, or attach a screenshot before analyzing.']);
    exit;
}

if ($image) {
    $type = strtolower($image['type'] ?? '');
    if (!in_array($type, $ALLOWED_IMAGE_TYPES, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'That image type is not supported. Please upload a JPG, PNG, or WEBP file.']);
        exit;
    }
    $approxBytes = (int) ceil((strlen($image['data'] ?? '') * 3) / 4);
    if ($approxBytes > MAX_IMAGE_BYTES) {
        http_response_code(400);
        echo json_encode(['error' => 'That image is too large. Please upload a file under 6MB.']);
        exit;
    }
}

// ---------------- System prompts (identical wording to the Netlify function) ----------------

$SYSTEM_PROMPT_ANALYZE = <<<'PROMPT'
You are the analysis engine behind CivicShield NG, a citizen-facing election integrity and digital-literacy tool for Nigeria.

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

If an image was provided, describe only what is visually observable (layout, requested fields, sender name shown, visual quality/artifacts) inside "evidence" and "suspicious_indicators" - never assert the identity of a real organization or person from a logo alone with certainty; describe it as "the image displays a logo resembling X".
PROMPT;

$SYSTEM_PROMPT_ASSIST = <<<'PROMPT'
You are the follow-up assistant inside CivicShield NG's "Verify" tool. A citizen has already received a JSON analysis of a specific piece of election-related content, and is now asking a short follow-up question about that specific submission.

Rules:
- Stay strictly focused on the submitted content. Do not become a general-purpose assistant and do not answer questions unrelated to this submission or to citizen digital safety.
- Stay politically neutral. Never recommend a candidate, party, or how to vote.
- Never invent sources or claim to have checked the internet.
- Never ask for or accept passwords, OTPs, bank PINs, BVN, NIN, or other sensitive credentials. If the user pastes any of these, tell them to remove it and do not repeat it back.
- Keep answers short: 2-5 plain sentences, no markdown headers, no bullet spam.
- If asked something you cannot know (e.g. "is this really from INEC?"), say plainly that you cannot confirm identity or authenticity and explain how the user can check through an official channel.

Respond with plain text only, not JSON.
PROMPT;

// ---------------- Groq call helpers ----------------

class ImageUnsupportedException extends Exception {}

function callGroqRaw($model, $messages, $jsonMode) {
    $body = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => 0.3,
        'max_tokens' => 1500,
    ];
    if ($jsonMode) {
        $body['response_format'] = ['type' => 'json_object'];
    }

    $ch = curl_init(GROQ_ENDPOINT);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . GROQ_API_KEY,
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrNo = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlErrNo !== 0) {
        throw new Exception('The analysis service timed out or could not be reached' . ($curlError ? " ({$curlError})" : '') . '.');
    }

    if ($status < 200 || $status >= 300) {
        if ($status === 429) {
            throw new Exception('The analysis service is receiving too many requests. Please try again shortly.');
        }
        if ($status === 400 && preg_match('/image|vision|multimodal/i', (string) $response)) {
            throw new ImageUnsupportedException('Image analysis is unavailable with the current model configuration.');
        }
        throw new Exception("Analysis service error (status {$status}).");
    }

    $data = json_decode($response, true);
    $content = $data['choices'][0]['message']['content'] ?? '';
    if ($content === '') {
        throw new Exception('Analysis service returned an empty response.');
    }
    return $content;
}

function tryParseJson($raw) {
    if (!$raw) return null;
    $cleaned = trim($raw);
    $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
    $cleaned = preg_replace('/^```\s*/', '', $cleaned);
    $cleaned = preg_replace('/```\s*$/', '', $cleaned);
    $decoded = json_decode($cleaned, true);
    if (is_array($decoded)) return $decoded;
    if (preg_match('/\{[\s\S]*\}/', $cleaned, $m)) {
        $decoded2 = json_decode($m[0], true);
        if (is_array($decoded2)) return $decoded2;
    }
    return null;
}

// Calls Groq and parses the response as strict JSON, retrying once without
// JSON mode (in case response_format itself was rejected) and once more
// with a stricter reminder if the model wraps the JSON in prose or fences.
function callGroqJson($model, $messages) {
    try {
        $raw = callGroqRaw($model, $messages, true);
    } catch (ImageUnsupportedException $e) {
        throw $e;
    } catch (Exception $e) {
        $raw = callGroqRaw($model, $messages, false);
    }

    $parsed = tryParseJson($raw);
    if ($parsed) return $parsed;

    $retryMessages = $messages;
    $retryMessages[] = [
        'role' => 'user',
        'content' => 'Your previous reply was not valid JSON. Respond again with ONLY the JSON object, no explanation, no markdown code fences.',
    ];
    $retryRaw = callGroqRaw($model, $retryMessages, false);
    $retryParsed = tryParseJson($retryRaw);
    if ($retryParsed) return $retryParsed;

    throw new Exception('Analysis service returned an unreadable response.');
}

// ---------------- Mode handlers ----------------

function handleAnalyze($text, $url, $image, $systemPrompt) {
    $promptText = "Analyze the following submission from a Nigerian citizen.\n\n";
    $promptText .= 'Message/claim text: ' . (trim($text) !== '' ? $text : '(none provided)') . "\n";
    $promptText .= 'Included link: ' . (trim($url) !== '' ? $url : '(none provided)') . "\n";
    if ($image) {
        $promptText .= "A screenshot has also been attached. Base your visual observations only on it.\n";
    }

    $modelToUse = TEXT_MODEL;
    if ($image) {
        $modelToUse = VISION_MODEL;
        $userContent = [
            ['type' => 'text', 'text' => $promptText],
            ['type' => 'image_url', 'image_url' => ['url' => "data:{$image['type']};base64,{$image['data']}"]],
        ];
    } else {
        $userContent = $promptText;
    }

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userContent],
    ];

    try {
        $result = callGroqJson($modelToUse, $messages);
    } catch (ImageUnsupportedException $e) {
        $textOnlyMessages = [
            ['role' => 'system', 'content' => $systemPrompt],
            [
                'role' => 'user',
                'content' => $promptText . "\n(Note: screenshot analysis is unavailable in the current deployment. Analyze only the text and link provided, and mention in evidence that the screenshot could not be processed.)",
            ],
        ];
        $result = callGroqJson(TEXT_MODEL, $textOnlyMessages);
        $result['image_analysis_skipped'] = true;
    }

    echo json_encode($result);
}

function handleAssist($payload, $text, $url, $systemPrompt) {
    $question = (isset($payload['question']) && is_string($payload['question'])) ? substr($payload['question'], 0, 500) : '';
    $context = (isset($payload['context']) && is_string($payload['context'])) ? substr($payload['context'], 0, 4000) : '';

    if (trim($question) === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Please enter a question.']);
        return;
    }

    $userMsg = 'Submitted text: ' . ($text !== '' ? $text : '(none)')
        . "\nSubmitted link: " . ($url !== '' ? $url : '(none)')
        . "\nPrior analysis summary: " . ($context !== '' ? $context : '(none)')
        . "\n\nCitizen's question: " . $question;

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userMsg],
    ];

    $answer = callGroqRaw(TEXT_MODEL, $messages, false);
    echo json_encode(['answer' => trim($answer)]);
}

// ---------------- Dispatch ----------------

try {
    if ($mode === 'assist') {
        handleAssist($payload, $text, $url, $SYSTEM_PROMPT_ASSIST);
    } else {
        handleAnalyze($text, $url, $image, $SYSTEM_PROMPT_ANALYZE);
    }
} catch (Exception $e) {
    error_log('CivicShield analyze error: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode([
        'error' => "We couldn't reach the analysis service right now. Please check your connection and try again in a moment.",
    ]);
}
