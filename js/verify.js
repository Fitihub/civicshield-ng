// js/verify.js — the core "Check Something You Received" experience.

const CivicVerify = (function () {
  const API_ENDPOINT = "/api/analyze";

  const DEMO_TEXT =
    "URGENT: INEC has opened a new online registration portal. All voters must confirm their details within 24 hours using this link.";
  const DEMO_URL = "http://inec-voter-update.example-verify.com/confirm";

  let currentImage = null; // { type, data (base64 no prefix) }
  let lastSubmission = null; // { text, url } for assistant context
  let lastAnalysis = null;

  function init() {
    const form = document.getElementById("verifyForm");
    const uploadZone = document.getElementById("uploadZone");
    const fileInput = document.getElementById("verifyImage");
    const removeBtn = document.getElementById("removeImage");
    const demoBtn = document.getElementById("demoBtn");

    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      runAnalysis();
    });

    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", handleFileSelect);

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearImage();
    });

    demoBtn.addEventListener("click", () => {
      document.getElementById("verifyText").value = DEMO_TEXT;
      document.getElementById("verifyUrl").value = DEMO_URL;
      clearImage();
      CivicUI.toast("Demonstration example loaded");
      runAnalysis(true);
    });
  }

  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showError("That file type isn't supported. Please choose a JPG, PNG or WEBP image.");
      e.target.value = "";
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      showError("That image is too large. Please choose a file under 6MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      currentImage = { type: file.type, data: base64 };

      document.getElementById("uploadPreview").src = dataUrl;
      document.getElementById("uploadPrompt").style.display = "none";
      document.getElementById("uploadPreviewWrap").style.display = "block";
      document.getElementById("uploadZone").classList.add("has-image");
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    currentImage = null;
    document.getElementById("verifyImage").value = "";
    document.getElementById("uploadPrompt").style.display = "block";
    document.getElementById("uploadPreviewWrap").style.display = "none";
    document.getElementById("uploadZone").classList.remove("has-image");
  }

  function showError(message) {
    const errEl = document.getElementById("verifyError");
    errEl.textContent = message;
    errEl.style.display = "block";
  }

  function hideError() {
    const errEl = document.getElementById("verifyError");
    errEl.style.display = "none";
  }

  async function runAnalysis() {
    hideError();
    const text = document.getElementById("verifyText").value.trim();
    const url = document.getElementById("verifyUrl").value.trim();

    if (!text && !url && !currentImage) {
      showError("Please paste a message, a link, or attach a screenshot before analyzing.");
      return;
    }

    lastSubmission = { text, url };
    setLoading(true);
    document.getElementById("resultWrap").innerHTML = "";

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          text,
          url,
          image: currentImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Something went wrong while analyzing this submission.");
        setLoading(false);
        return;
      }

      lastAnalysis = data;
      renderResult(data);
    } catch (err) {
      showError("We couldn't reach the analysis service. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    document.getElementById("verifyLoading").style.display = isLoading ? "flex" : "none";
    document.getElementById("analyzeBtn").disabled = isLoading;
  }

  function renderResult(data) {
    const wrap = document.getElementById("resultWrap");
    const entities = data.entities || {};
    const statusClass = CivicUI.statusToClass(data.status);

    const chips = (arr) =>
      Array.isArray(arr) && arr.length
        ? `<div class="chip-row">${arr.map((v) => `<span class="chip">${CivicUI.escapeHtml(v)}</span>`).join("")}</div>`
        : `<p style="margin:0;color:var(--ink-faint);">None identified</p>`;

    const indicators =
      Array.isArray(data.suspicious_indicators) && data.suspicious_indicators.length
        ? `<ul>${data.suspicious_indicators.map((i) => `<li>${CivicUI.escapeHtml(i)}</li>`).join("")}</ul>`
        : `<p style="margin:0;">No specific suspicious indicators were identified in the content provided.</p>`;

    const actions =
      Array.isArray(data.recommended_actions) && data.recommended_actions.length
        ? `<ul>${data.recommended_actions.map((a) => `<li>${CivicUI.escapeHtml(a)}</li>`).join("")}</ul>`
        : "";

    const imageSkippedNote = data.image_analysis_skipped
      ? `<div class="form-error" style="background:var(--amber-100);border-color:var(--amber-700);color:var(--amber-700);">Screenshot analysis is unavailable in the current deployment, so this result is based on the text and link only. Please also describe what the image shows in words if it's important.</div>`
      : "";

    wrap.innerHTML = `
      <div class="card result-card">
        <div class="result-header">
          <div>
            <h3 style="margin-bottom:4px;">Assessment</h3>
            <p style="margin:0;">${CivicUI.escapeHtml(data.risk_summary || "")}</p>
          </div>
          <span class="status-pill ${statusClass}">${CivicUI.escapeHtml(data.status || "Unverified")}</span>
        </div>

        ${imageSkippedNote}

        <div class="result-section">
          <h4>Main Claim</h4>
          <p>${CivicUI.escapeHtml(data.main_claim || "No specific claim could be identified.")}</p>
        </div>

        <div class="result-section">
          <h4>Potential Risk</h4>
          <p><strong>${CivicUI.escapeHtml(data.threat_category || "Unverified claim")}</strong></p>
        </div>

        <div class="result-section">
          <h4>What We Found</h4>
          <p style="margin-bottom:6px;"><strong>Election entities:</strong></p>
          ${chips(entities.election_entities)}
          <p style="margin:12px 0 6px;"><strong>People or organizations mentioned:</strong></p>
          ${chips(entities.people_or_orgs)}
          <p style="margin:12px 0 6px;"><strong>Dates:</strong></p>
          ${chips(entities.dates)}
          <p style="margin:12px 0 6px;"><strong>Links:</strong></p>
          ${chips(entities.urls)}
          <p style="margin:14px 0 6px;"><strong>Suspicious indicators:</strong></p>
          ${indicators}
        </div>

        <div class="result-section">
          <h4>Evidence</h4>
          <p>${CivicUI.escapeHtml(data.evidence || "No external verification was performed for this submission.")}</p>
        </div>

        <div class="result-section">
          <h4>What Is Missing</h4>
          <p>${CivicUI.escapeHtml(data.missing_information || "Not specified.")}</p>
        </div>

        ${
          actions
            ? `<div class="result-section"><h4>What You Should Do</h4>${actions}</div>`
            : ""
        }

        <div class="result-section">
          <h4>Learn More</h4>
          <p>${CivicUI.escapeHtml(data.educational_note || "")}</p>
          ${
            data.suggested_lesson && data.suggested_lesson !== "null"
              ? `<a href="#/learn" class="btn btn-secondary btn-small" data-nav-link data-lesson-jump="${CivicUI.escapeHtml(
                  data.suggested_lesson
                )}">Open related lesson: ${CivicUI.escapeHtml(data.suggested_lesson)}</a>`
              : ""
          }
        </div>

        <div class="disclaimer-box">
          AI-generated analysis can be wrong. Always confirm important election information through authoritative sources.
        </div>
      </div>

      <div class="assistant">
        <h3>Ask about this result</h3>
        <div class="assistant-prompts">
          <button type="button" data-q="What makes this suspicious?">What makes this suspicious?</button>
          <button type="button" data-q="What should I check next?">What should I check next?</button>
          <button type="button" data-q="Explain this in simple terms.">Explain this in simple terms.</button>
          <button type="button" data-q="How can I avoid this type of scam?">How can I avoid this type of scam?</button>
        </div>
        <div class="assistant-thread" id="assistantThread"></div>
        <form class="assistant-form" id="assistantForm">
          <label class="visually-hidden" for="assistantInput">Ask a question about this submission</label>
          <input type="text" id="assistantInput" placeholder="Ask a question about this submission…" />
          <button type="submit" class="btn btn-accent">Ask</button>
        </form>
      </div>
    `;

    wrap.querySelectorAll("[data-q]").forEach((btn) => {
      btn.addEventListener("click", () => askAssistant(btn.getAttribute("data-q")));
    });

    const assistantForm = document.getElementById("assistantForm");
    assistantForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("assistantInput");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      askAssistant(q);
    });

    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function askAssistant(question) {
    const thread = document.getElementById("assistantThread");
    if (!thread) return;

    appendMessage(thread, "You", question, "user");
    const thinkingEl = appendMessage(thread, "CivicShield Assistant", "Thinking…", "assistant");

    try {
      const context = lastAnalysis
        ? `Status: ${lastAnalysis.status}. Threat category: ${lastAnalysis.threat_category}. Summary: ${lastAnalysis.risk_summary}`
        : "";

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assist",
          text: lastSubmission ? lastSubmission.text : "",
          url: lastSubmission ? lastSubmission.url : "",
          question,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        thinkingEl.querySelector("p").textContent =
          data.error || "I couldn't answer that just now. Please try again.";
        return;
      }
      thinkingEl.querySelector("p").textContent = data.answer;
    } catch (err) {
      thinkingEl.querySelector("p").textContent =
        "I couldn't reach the assistant service. Please check your connection.";
    }
  }

  function appendMessage(thread, who, text, cls) {
    const el = document.createElement("div");
    el.className = `assistant-msg ${cls}`;
    el.innerHTML = `<div class="who">${CivicUI.escapeHtml(who)}</div><p>${CivicUI.escapeHtml(text)}</p>`;
    thread.appendChild(el);
    return el;
  }

  return { init };
})();
