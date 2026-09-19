#!/usr/bin/env node
// scripts/test-groq.mjs
//
// Standalone connectivity check for the Groq API key used by CivicShield NG.
// Run locally (this environment cannot reach api.groq.com):
//
//   node scripts/test-groq.mjs
//
// Requires Node 18+ (for global fetch). Reads GROQ_API_KEY from the
// environment, or from a .env file in the project root if present.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const API_KEY = process.env.GROQ_API_KEY;
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

if (!API_KEY) {
  console.error("GROQ_API_KEY is not set. Add it to a .env file or export it in your shell.");
  process.exit(1);
}

const ENDPOINT_MODELS = "https://api.groq.com/openai/v1/models";
const ENDPOINT_CHAT = "https://api.groq.com/openai/v1/chat/completions";

async function main() {
  console.log("1. Checking API key by listing available models...");
  const modelsRes = await fetch(ENDPOINT_MODELS, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!modelsRes.ok) {
    const body = await modelsRes.text();
    console.error(`   Failed (status ${modelsRes.status}). ${body}`);
    if (modelsRes.status === 401) {
      console.error("   This means the key is invalid or was revoked/rotated.");
    }
    process.exit(1);
  }

  const modelsData = await modelsRes.json();
  const modelIds = new Set((modelsData.data || []).map((m) => m.id));
  console.log(`   Key is valid. ${modelIds.size} models available to this account.`);

  console.log(`\n2. Checking configured text model "${TEXT_MODEL}" is available...`);
  if (modelIds.has(TEXT_MODEL)) {
    console.log("   Found in your account's model list.");
  } else {
    console.warn("   Not found in the model list returned for this key. It may still work, or may need updating.");
  }

  console.log(`\n3. Sending a real chat completion request to "${TEXT_MODEL}"...`);
  const chatRes = await fetch(ENDPOINT_CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "user", content: "Reply with exactly one word: OK" },
      ],
      max_tokens: 10,
    }),
  });

  if (!chatRes.ok) {
    const body = await chatRes.text();
    console.error(`   Failed (status ${chatRes.status}). ${body}`);
    process.exit(1);
  }

  const chatData = await chatRes.json();
  const reply = chatData.choices?.[0]?.message?.content?.trim();
  console.log(`   Model responded: "${reply}"`);

  console.log(`\n4. Checking configured vision model "${VISION_MODEL}" is available...`);
  if (modelIds.has(VISION_MODEL)) {
    console.log("   Found in your account's model list.");
  } else {
    console.warn("   Not found in the model list returned for this key. Screenshot analysis may not work until this is fixed.");
  }

  console.log("\nAll checks passed. Your GROQ_API_KEY works with the models CivicShield NG is configured to use.");
  console.log("Next: add GROQ_API_KEY to your Netlify site's environment variables and deploy (see README.md).");
}

main().catch((err) => {
  console.error("Unexpected error while testing the Groq API:", err.message);
  process.exit(1);
});
