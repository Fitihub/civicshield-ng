// js/app.js — router and app bootstrap.

(function () {
  const VALID_ROUTES = ["home", "verify", "learn", "reports", "about"];

  function currentRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    return VALID_ROUTES.includes(hash) ? hash : "home";
  }

  function showRoute(route) {
    document.querySelectorAll(".view").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.view === route);
    });
    document.querySelectorAll("[data-route]").forEach((link) => {
      if (link.dataset.route === route) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    closeMobileNav();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function handleRouteChange() {
    showRoute(currentRoute());
  }

  function setupNavToggle() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function closeMobileNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function setupLessonJumpLinks() {
    // Delegated: result cards render a "Open related lesson" link dynamically.
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-lesson-jump]");
      if (!link) return;
      const title = link.getAttribute("data-lesson-jump");
      // Let the hash change happen, then open the specific lesson.
      setTimeout(() => {
        if (typeof CivicLearn !== "undefined" && title) {
          CivicLearn.openLessonByTitle(title);
        }
      }, 30);
    });
  }

  function init() {
    // NOTE: CivicUI/CivicVerify/CivicLearn are top-level `const` bindings from
    // their own <script> files, not properties of `window` — so they must be
    // referenced directly (or via typeof checks), never as window.CivicX.
    if (typeof CivicUI !== "undefined") {
      CivicUI.renderTrustedSources("trustedSourcesHome");
      CivicUI.renderTrustedSources("trustedSourcesAbout");
      CivicUI.renderDemoReports("reportGrid");
    }
    if (typeof CivicVerify !== "undefined") CivicVerify.init();
    if (typeof CivicLearn !== "undefined") CivicLearn.init();

    setupNavToggle();
    setupLessonJumpLinks();

    window.addEventListener("hashchange", handleRouteChange);
    handleRouteChange();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
