# CivicShield NG

**Verify Before You Act.**

CivicShield NG is an AI-powered election integrity, citizen protection and digital-literacy platform for Nigerians. It helps people check suspicious election-related messages, links and screenshots, understand potential threats in plain language, and learn to recognize similar threats themselves.

CivicShield is **politically neutral**. It never ranks candidates or parties, never tells anyone how to vote, and never produces political persuasion. It focuses entirely on information verification, citizen protection and digital literacy.

This is a hackathon MVP built to deploy directly to Netlify with no database and no build step.

---

## How it's built

- **Frontend:** plain HTML5, CSS3 and vanilla JavaScript (no framework, no bundler).
- **Backend:** a single Netlify Function (`netlify/functions/analyze.js`) that talks to the Groq API.
- **AI provider:** [Groq](https://groq.com) — a fast LLM API. The Groq API key is only ever used **server-side**, inside the Netlify Function. It is never sent to the browser.
- **Storage:** none. Learning progress is stored in the visitor's own browser via `localStorage`. Threat Reports are clearly labelled demonstration data, not a live database.

```
/
├── index.html            Single-page shell (Home, Verify, Learn, Reports, About)
├── css/
│   └── style.css         Design system and layout
├── js/
│   ├── ui.js             Shared helpers, trusted sources, demo threat reports
│   ├── verify.js         Verify form, upload, API calls, result rendering, assistant
│   ├── learn.js          Learn & Protect lessons, quizzes, progress tracking
│   └── app.js            Hash router and app bootstrap
├── netlify/
│   └── functions/
│       └── analyze.js    Serverless proxy to Groq (analysis + follow-up assistant)
├── netlify.toml           Netlify build/redirect configuration
└── README.md
```

## Deploying to Netlify

1. **Push this project to a Git repository** (GitHub, GitLab, or Bitbucket), or deploy the folder directly via the Netlify CLI / drag-and-drop deploy.

2. **Create a new site on Netlify** and point it at this repository. Netlify will detect `netlify.toml` automatically:
   - Publish directory: `.` (project root)
   - Functions directory: `netlify/functions`
   - No build command is required — this project has no build step.

3. **Add your Groq API key as an environment variable:**
   - In the Netlify dashboard, go to **Site configuration → Environment variables**.
   - Click **Add a variable**.
   - Key: `GROQ_API_KEY`
   - Value: your Groq API key (get one at [console.groq.com](https://console.groq.com)).
   - Save, then **redeploy the site** so the function picks up the new variable.

4. **(Optional) Choose specific Groq models.** By default the function uses:
   - `GROQ_TEXT_MODEL` (default: `openai/gpt-oss-120b`) for text-only analysis and the follow-up assistant.
   - `GROQ_VISION_MODEL` (default: `qwen/qwen3.6-27b`) for screenshot analysis.

   These are Groq's current recommended models as of this writing (`llama-3.3-70b-versatile` and the old `llama-3.2-*-vision-preview` models have since been deprecated by Groq). Groq's model lineup changes fairly often — check [console.groq.com/docs/models](https://console.groq.com/docs/models) and [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations) if a deploy starts failing, and override either variable with a current model ID.

5. **Deploy.** Once the environment variable is set, redeploy (or trigger a new deploy) so the function has access to it.

## Removing the "Powered by Netlify" badge

Netlify shows a small "Powered by Netlify" badge on new public projects on its Free plan. It's injected at Netlify's edge, not part of this project's code, so it's controlled per-project in the dashboard:

1. Open your site in the Netlify dashboard.
2. Go to **Project configuration → General → Powered by Netlify badge**.
3. Turn it off and save. It takes effect on the next request — no redeploy needed.

This project's `netlify.toml` also sets a strict `Content-Security-Policy` (no `unsafe-inline` in `script-src`), which independently prevents the badge's inline frame from rendering at all, as a backup. If you ever loosen that CSP, use the dashboard toggle above as the primary control.

## Running on XAMPP

If you'd rather not install Node.js or the Netlify CLI, the project also includes a plain PHP version of the backend (`api/analyze.php`) that does exactly what `netlify/functions/analyze.js` does, using cURL instead of `fetch`. `js/verify.js` calls `/api/analyze` either way, so the same frontend works against either backend unchanged.

1. **Copy the whole `civicshield-ng` folder into your XAMPP `htdocs`**, e.g. `C:\xampp\htdocs\civicshield-ng`.
2. **Add your Groq key** to `api/config.local.php` (git-ignored, only used locally — never uploaded to Netlify). Open the file and replace `PASTE_YOUR_GROQ_KEY_HERE` with your actual key.
3. **Start Apache** from the XAMPP control panel (MySQL isn't needed — this project has no database).
4. **Open** `http://localhost/civicshield-ng/` in your browser.

If Verify gives a 404 instead of a result when you click Analyze, `.htaccess` isn't being applied — this is the one common snag:

- Open `C:\xampp\apache\conf\httpd.conf` (or `extra/httpd-vhosts.conf` if you use a virtual host).
- Find the `<Directory "C:/xampp/htdocs">` block and make sure it has `AllowOverride All` (not `None`).
- Make sure `mod_rewrite` is uncommented in `httpd.conf` (`LoadModule rewrite_module modules/mod_rewrite.so`).
- Restart Apache after any change here.

If you'd rather skip `.htaccess` entirely, you can instead open `js/verify.js` and change:
```js
const API_ENDPOINT = "/api/analyze";
```
to:
```js
const API_ENDPOINT = "api/analyze.php";
```
— just remember to change it back (or keep both versions) before deploying to Netlify, since Netlify doesn't have `analyze.php`.

## Local development (Netlify CLI)

You can preview the frontend by opening `index.html` directly, but the **Verify** page needs the Netlify Function to work, so local testing is best done with the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

Copy `.env.example` to `.env` (do not commit `.env` — it's already in `.gitignore`) and fill in your key:

```
GROQ_API_KEY=your_key_here
```

`netlify dev` will serve the site and proxy `/api/analyze` to the local function, exactly as it works in production.

### Verifying your Groq API key works

Before deploying, you can confirm your key and the configured models are working with a small standalone script (no Netlify CLI needed, just Node 18+):

```bash
node scripts/test-groq.mjs
```

It reads `GROQ_API_KEY` from your `.env` file (or the environment), lists your account's available models, confirms the configured text and vision model IDs are available to your key, and sends one real chat completion request. If it prints "All checks passed", your key is good to add to Netlify.

> **A note on API keys and this project's files:** neither `.env` nor `api/config.local.php` ship with a real key in them — both use a `PASTE_YOUR_GROQ_KEY_HERE` placeholder you need to replace yourself. This is deliberate: a zip with a live secret key embedded in a file can trip antivirus/browser heuristics (a script that reads input and forwards it to an external host with a hardcoded `Authorization` header looks similar to a credential-exfiltration pattern), and more importantly, a key sitting in a downloadable file is a key that's easy to leak by accident. Paste your own key into whichever of the two files matches how you're running the project (`.env` for `netlify dev`, `api/config.local.php` for XAMPP), and never commit either file — both are already in `.gitignore`.

## What the AI does and does not do

- It reasons only over the text, link and screenshot you provide, plus the fixed list of official reference links shown in the app. It does not browse the internet.
- It never claims to have independently confirmed a fact against an external database — if that didn't happen, the result says so under "What Is Missing" / "Evidence".
- It never recommends a candidate, a party, or how to vote.
- It never asks for, and will not accept, passwords, OTPs, bank PINs, BVN, NIN or similar sensitive credentials.
- If the configured Groq model can't process an uploaded image, the app tells the user plainly and falls back to text-only analysis rather than pretending to have analyzed the image.

## Limitations of this MVP

- No database: the Threat Reports page shows clearly labelled demonstration data, not live, community-submitted reports.
- No accounts: lesson progress is stored only in the visitor's browser and will not sync across devices.
- No independent fact-checking database: the AI's assessment is based on reasoning over the submitted content, not a live search of authoritative sources. Always confirm important election information directly with an official source such as INEC.
