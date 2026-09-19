// js/ui.js — small shared helpers used across the app.
// No frameworks: plain DOM utilities only.

const CivicUI = (function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toast(message) {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s ease";
      setTimeout(() => el.remove(), 260);
    }, 3800);
  }

  // Official reference links. Real, publicly known government domains only —
  // presented as information resources, never as proof a specific claim is true or false.
  const TRUSTED_SOURCES = [
    {
      name: "INEC — Independent National Electoral Commission",
      desc: "Official voter registration, election guidelines and results information.",
      url: "https://www.inec.gov.ng",
    },
    {
      name: "Nigeria Police Force",
      desc: "Report crimes, threats, and suspicious activity to law enforcement.",
      url: "https://www.npf.gov.ng",
    },
    {
      name: "NITDA — National Information Technology Development Agency",
      desc: "Guidance on cybersecurity, data protection and reporting online threats.",
      url: "https://nitda.gov.ng",
    },
    {
      name: "Nigerian Communications Commission",
      desc: "Report SMS/phone-based scams and telecom-related fraud.",
      url: "https://www.ncc.gov.ng",
    },
  ];

  function renderTrustedSources(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = TRUSTED_SOURCES.map(
      (s) => `
      <a class="trust-link" href="${s.url}" target="_blank" rel="noopener noreferrer">
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="desc">${escapeHtml(s.desc)}</span>
      </a>`
    ).join("");
  }

  // Clearly labelled demonstration data only — never presented as live reports.
  const DEMO_REPORTS = [
    {
      category: "Suspicious registration link",
      location: "Lagos State (demonstration)",
      date: "2026-08-14",
      description:
        "A message circulated on WhatsApp asking recipients to 're-confirm' voter details on a link resembling an official domain but hosted elsewhere.",
      status: "Under community review",
    },
    {
      category: "Impersonation attempt",
      location: "Kaduna State (demonstration)",
      date: "2026-08-10",
      description:
        "A social media account used an official-looking name and logo to share unverified announcements about polling unit changes.",
      status: "Flagged for awareness",
    },
    {
      category: "Fake election announcement",
      location: "Rivers State (demonstration)",
      date: "2026-08-05",
      description:
        "A forwarded message claimed a change to election dates without linking to any official statement or source.",
      status: "Unverified claim",
    },
    {
      category: "Potential phishing message",
      location: "Abuja, FCT (demonstration)",
      date: "2026-07-29",
      description:
        "An SMS asked recipients to enter personal identification details to 'validate' their voter card through a shortened link.",
      status: "Consistent with known phishing patterns",
    },
  ];

  function renderDemoReports(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = DEMO_REPORTS.map(
      (r) => `
      <article class="card report-card">
        <span class="category">${escapeHtml(r.category)}</span>
        <p style="margin:0;">${escapeHtml(r.description)}</p>
        <div class="report-meta">
          <span>${escapeHtml(r.location)}</span>
          <span>${escapeHtml(r.date)}</span>
        </div>
        <span class="report-status">${escapeHtml(r.status)}</span>
      </article>`
    ).join("");
  }

  function statusToClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("verified") || s.includes("no obvious") || s.includes("supported")) return "status-clear";
    if (s.includes("potential threat") || s.includes("contradicted")) return "status-risk";
    if (s.includes("suspicious")) return "status-caution";
    return "status-neutral";
  }

  return {
    escapeHtml,
    toast,
    renderTrustedSources,
    renderDemoReports,
    statusToClass,
  };
})();
