// js/learn.js — the "Learn & Protect" lesson library.

const CivicLearn = (function () {
  const STORAGE_KEY = "civicshield_completed_lessons";

  const LESSONS = [
    {
      id: "spotting-scams",
      title: "Spotting Election Scams",
      explanation:
        "Election scams often create urgency and ask you to act immediately, before you have time to think or verify.",
      scenario:
        "You receive a WhatsApp message saying that you must click a link immediately to confirm your voting details, or you will lose your right to vote.",
      question: "What should you do first?",
      options: [
        { text: "Click immediately", correct: false },
        { text: "Forward it to friends so they can act fast too", correct: false },
        { text: "Verify the information through an authoritative source", correct: true },
        { text: "Reply with your voter details to be safe", correct: false },
      ],
      explanationAfter:
        "Legitimate electoral bodies do not threaten to remove your voting rights over a missed link. Pressure and urgency are common tactics used to stop you from checking.",
      takeaway: "Urgency is a warning sign, not a reason to act faster.",
    },
    {
      id: "fake-registration-links",
      title: "Recognizing Fake Registration Links",
      explanation:
        "Fake registration links often use domains that look similar to official ones, with small misspellings or extra words.",
      scenario:
        "You see a Facebook post with a link: 'inec-voterupdate-portal.com' asking you to re-register before the deadline.",
      question: "What is the biggest red flag here?",
      options: [
        { text: "The post uses the word 'deadline'", correct: false },
        { text: "The domain name does not match INEC's official domain", correct: true },
        { text: "The post is on Facebook", correct: false },
        { text: "The link uses HTTPS", correct: false },
      ],
      explanationAfter:
        "Official government domains are specific and consistent. A domain with extra words, hyphens, or a different ending is a common impersonation technique.",
      takeaway: "Always check the exact domain name before entering any information.",
    },
    {
      id: "identifying-impersonation",
      title: "Identifying Impersonation",
      explanation:
        "Impersonation accounts copy names, logos and writing styles of real organizations or officials to appear credible.",
      scenario:
        "An account with INEC's logo and a similar name posts an urgent announcement that is not on INEC's verified channels.",
      question: "What should you check?",
      options: [
        { text: "Whether the account has a lot of followers", correct: false },
        { text: "Whether the same announcement appears on the organization's verified official channel", correct: true },
        { text: "Whether the logo looks sharp", correct: false },
        { text: "Whether the post has many likes", correct: false },
      ],
      explanationAfter:
        "Follower counts and visual polish can be faked or bought. The most reliable check is whether the same information appears on a channel you already know is official.",
      takeaway: "A convincing logo is not proof of an authentic account.",
    },
    {
      id: "checking-political-claims",
      title: "Checking Political Claims",
      explanation:
        "Political claims spread quickly because they trigger strong emotions. Strong emotion is not evidence.",
      scenario:
        "A message claims a candidate said something outrageous in a speech, with no video, date or original source attached.",
      question: "What is the most useful next step?",
      options: [
        { text: "Share it since it seems important", correct: false },
        { text: "Look for the original speech or a primary source before forming a conclusion", correct: true },
        { text: "Assume it's true because it matches what you already believed", correct: false },
        { text: "Assume it's false because it seems dramatic", correct: false },
      ],
      explanationAfter:
        "CivicShield does not tell you what to believe. But claims without a traceable original source are unverified either way — pausing to look for the source is always reasonable.",
      takeaway: "No source, no date, no way to check: treat the claim as unverified.",
    },
    {
      id: "recognizing-phishing",
      title: "Recognizing Phishing",
      explanation:
        "Phishing messages try to trick you into entering personal information on a fake page that looks real.",
      scenario:
        "You receive an email asking you to 'log in to verify your voter status' through a link, with a form asking for your NIN and phone number.",
      question: "What should raise concern here?",
      options: [
        { text: "The email has a logo", correct: false },
        { text: "It asks for sensitive personal information through a link you didn't seek out", correct: true },
        { text: "It was sent in the evening", correct: false },
        { text: "The email is short", correct: false },
      ],
      explanationAfter:
        "Legitimate services rarely ask you to submit sensitive identifiers like your NIN through an unsolicited link. When in doubt, go directly to the official website instead of clicking through.",
      takeaway: "Never enter sensitive details through a link you did not go looking for yourself.",
    },
    {
      id: "manipulated-images",
      title: "Understanding Manipulated Images",
      explanation:
        "Images can be edited, cropped out of context, or paired with a false caption to imply something that never happened.",
      scenario:
        "A photo shows a large crowd with a caption claiming it was taken at a specific rally yesterday.",
      question: "What is a reasonable way to check this?",
      options: [
        { text: "Trust the caption because the photo looks real", correct: false },
        { text: "Search for the same image online to see where and when it originally appeared", correct: true },
        { text: "Assume all crowd photos are fake", correct: false },
        { text: "Judge based on how many people shared it", correct: false },
      ],
      explanationAfter:
        "A real photo can still be used with a false caption. Checking where an image first appeared often reveals whether it matches the claim being made about it.",
      takeaway: "A real photograph does not guarantee a true caption.",
    },
    {
      id: "ai-audio-video",
      title: "Understanding AI-Generated Audio and Video",
      explanation:
        "AI tools can now generate realistic-looking audio and video of real people saying things they never said.",
      scenario:
        "A video clip circulates showing a public figure appearing to make a controversial statement, with slightly unnatural mouth movement or audio timing.",
      question: "What is a sensible response?",
      options: [
        { text: "Share it immediately because it looks real", correct: false },
        { text: "Treat it as unverified and look for the same statement from an original, verifiable recording or transcript", correct: true },
        { text: "Assume all videos of public figures are fake from now on", correct: false },
        { text: "Judge it based on the video quality alone", correct: false },
      ],
      explanationAfter:
        "Realism is no longer proof of authenticity. Looking for the original, verifiable recording — not just judging the video by eye — is the more reliable approach.",
      takeaway: "Realistic does not mean real. Look for the original source.",
    },
    {
      id: "whatsapp-safety",
      title: "Staying Safe on WhatsApp",
      explanation:
        "WhatsApp forwards spread quickly and often lose their original context, source, or nuance along the way.",
      scenario:
        "A message forwarded many times claims urgent action is needed 'before it's too late,' with no clear original sender.",
      question: "What does a high forward count tell you?",
      options: [
        { text: "That the message must be true", correct: false },
        { text: "Nothing about accuracy — only that it spread widely", correct: true },
        { text: "That it came from an official source", correct: false },
        { text: "That it has been fact-checked", correct: false },
      ],
      explanationAfter:
        "A message can be forwarded thousands of times without anyone checking it. Popularity and accuracy are not the same thing.",
      takeaway: "A widely forwarded message is not automatically a verified one.",
    },
    {
      id: "protecting-personal-info",
      title: "Protecting Personal Information",
      explanation:
        "Your NIN, BVN, passwords, OTPs and bank PINs should never be requested through unsolicited messages or forms, for any reason related to voting.",
      scenario:
        "A message says you must provide your BVN and a one-time password to 'validate' your voter registration.",
      question: "What should you do?",
      options: [
        { text: "Provide the details since it mentions voting", correct: false },
        { text: "Refuse to share this information — no legitimate voting process requires it this way", correct: true },
        { text: "Share it only if the message looks official", correct: false },
        { text: "Share only the OTP, not the BVN", correct: false },
      ],
      explanationAfter:
        "No legitimate voter registration or verification process requires your OTP, BVN, PIN or password. Requests like this are a strong indicator of fraud.",
      takeaway: "Voting processes never require your OTP, BVN, PIN or password.",
    },
    {
      id: "reporting-suspicious-info",
      title: "Reporting Suspicious Information",
      explanation:
        "Reporting suspicious content helps limit its spread and alerts others, even if you're not fully sure it's malicious.",
      scenario:
        "You come across a suspicious message but you're not fully sure whether it's a scam or just poorly written.",
      question: "What is a reasonable action?",
      options: [
        { text: "Ignore it completely since you're unsure", correct: false },
        { text: "Report or flag it through the platform's tools and avoid interacting with any links inside it", correct: true },
        { text: "Reply asking the sender to clarify", correct: false },
        { text: "Click the link to investigate yourself", correct: false },
      ],
      explanationAfter:
        "You don't need certainty to report something. Reporting tools exist precisely for content you're unsure about, and avoiding interaction with links limits your own exposure.",
      takeaway: "When unsure, report and avoid interacting — don't investigate by clicking.",
    },
    {
      id: "pvc-bvas-basics",
      title: "How Accreditation and Voting Actually Work",
      explanation:
        "Only INEC issues the PVC and only INEC's BVAS (Bimodal Voter Accreditation System) accredits voters, using fingerprint or facial verification at the polling unit.",
      scenario:
        "A flyer claims you can pay an agent N2,000 to 'pre-register' your fingerprint at home so you skip queues on election day.",
      question: "What is wrong with this offer?",
      options: [
        { text: "It's a legitimate time-saving service", correct: false },
        { text: "Accreditation is free and can only happen through INEC's BVAS at the polling unit", correct: true },
        { text: "It's fine as long as the agent has a form", correct: false },
        { text: "It's only a problem if the fee is high", correct: false },
      ],
      explanationAfter:
        "Registration, PVC collection and accreditation are free and can only be done through INEC directly. Anyone charging money or offering to do it 'off-site' is running a scam.",
      takeaway: "PVC and accreditation are free, and only INEC handles them — never a paid agent.",
    },
    {
      id: "results-collation-irev",
      title: "How Results Are Announced",
      explanation:
        "Results are counted and announced at the polling unit itself, in the open, before being uploaded to INEC's public IReV portal and moving up for collation.",
      scenario:
        "A trending post shows a 'final result' for your state hours before polling units have finished counting, with no mention of IReV.",
      question: "How can you check if this result is genuine?",
      options: [
        { text: "Trust it because it has a lot of shares", correct: false },
        { text: "Compare it against your polling unit's result sheet and INEC's IReV upload", correct: true },
        { text: "Assume state-level results are always announced early", correct: false },
        { text: "Ignore it — all early results are automatically fake", correct: false },
      ],
      explanationAfter:
        "Polling unit results are pasted publicly and uploaded to IReV before collation continues upward. A 'result' that skips this trail, especially before counting is even done, cannot be verified.",
      takeaway: "A real result has a paper trail: polling unit sheet, then IReV, then collation.",
    },
    {
      id: "election-day-offenses",
      title: "Recognizing Election Offenses",
      explanation:
        "Nigerian electoral law treats vote buying, underage voting, ballot snatching and voter intimidation as offenses, not normal parts of the process.",
      scenario:
        "Someone at your polling unit is quietly offering cash in exchange for showing your marked ballot before dropping it in the box.",
      question: "What should you do?",
      options: [
        { text: "Take the money since others are doing it too", correct: false },
        { text: "Refuse, vote in secret, and report it to security agents or INEC officials present", correct: true },
        { text: "Ignore it and mind your own business", correct: false },
        { text: "Argue with the person publicly", correct: false },
      ],
      explanationAfter:
        "Vote buying and showing your ballot to anyone is illegal and undermines the secrecy of your vote. Security personnel and INEC officials are present specifically to receive reports like this.",
      takeaway: "Vote buying and ballot exposure are offenses — vote in secret and report them.",
    },
  ];

  let openLessonId = null;

  function getCompleted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function markCompleted(id) {
    try {
      const completed = new Set(getCompleted());
      completed.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
    } catch (e) {
      // localStorage unavailable — progress simply won't persist.
    }
  }

  function renderProgress() {
    const completed = getCompleted();
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    if (!fill || !label) return;
    const pct = Math.round((completed.length / LESSONS.length) * 100);
    fill.style.width = pct + "%";
    label.textContent = `${completed.length} of ${LESSONS.length} lessons completed`;
  }

  function renderList() {
    const listEl = document.getElementById("lessonList");
    if (!listEl) return;
    const completed = getCompleted();

    listEl.innerHTML = LESSONS.map((lesson, idx) => {
      const isDone = completed.includes(lesson.id);
      return `
        <button type="button" class="lesson-row" data-lesson-id="${lesson.id}">
          <span class="lesson-title">
            <span class="lesson-num">${String(idx + 1).padStart(2, "0")}</span>
            <span class="lesson-name">${CivicUI.escapeHtml(lesson.title)}</span>
          </span>
          <span class="lesson-status ${isDone ? "done" : ""}">${isDone ? "Completed" : "Not started"}</span>
        </button>`;
    }).join("");

    listEl.querySelectorAll("[data-lesson-id]").forEach((btn) => {
      btn.addEventListener("click", () => openLesson(btn.getAttribute("data-lesson-id")));
    });

    renderProgress();
  }

  function openLesson(id) {
    const lesson = LESSONS.find((l) => l.id === id);
    if (!lesson) return;
    openLessonId = id;

    document.getElementById("lessonListWrap").style.display = "none";

    const detailWrap = document.getElementById("lessonDetailWrap");
    detailWrap.innerHTML = `
      <button type="button" class="lesson-back" id="lessonBackBtn">&larr; Back to all lessons</button>
      <div class="card lesson-detail-inner">
        <h3>${CivicUI.escapeHtml(lesson.title)}</h3>
        <p>${CivicUI.escapeHtml(lesson.explanation)}</p>

        <div class="scenario-box">
          <span class="label">Scenario</span>
          <p style="margin:0;">${CivicUI.escapeHtml(lesson.scenario)}</p>
        </div>

        <h4>${CivicUI.escapeHtml(lesson.question)}</h4>
        <div class="quiz-options" id="quizOptions"></div>
        <div class="quiz-feedback" id="quizFeedback"></div>
        <div class="takeaway" id="quizTakeaway" style="display:none;">
          <strong>Practical takeaway:</strong> ${CivicUI.escapeHtml(lesson.takeaway)}
        </div>
      </div>
    `;

    document.getElementById("lessonBackBtn").addEventListener("click", closeLesson);

    const optionsEl = document.getElementById("quizOptions");
    lesson.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => answerQuiz(lesson, i));
      optionsEl.appendChild(btn);
    });

    detailWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function answerQuiz(lesson, chosenIndex) {
    const optionsEl = document.getElementById("quizOptions");
    const buttons = Array.from(optionsEl.querySelectorAll(".quiz-option"));
    const chosen = lesson.options[chosenIndex];

    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (lesson.options[i].correct) btn.classList.add("correct");
      else if (i === chosenIndex) btn.classList.add("incorrect");
    });

    const feedbackEl = document.getElementById("quizFeedback");
    feedbackEl.classList.add("is-visible");
    feedbackEl.innerHTML = `<strong>${chosen.correct ? "Correct." : "Not quite."}</strong> ${CivicUI.escapeHtml(
      lesson.explanationAfter
    )}`;

    document.getElementById("quizTakeaway").style.display = "block";
    markCompleted(lesson.id);
  }

  function closeLesson() {
    openLessonId = null;
    document.getElementById("lessonDetailWrap").innerHTML = "";
    document.getElementById("lessonListWrap").style.display = "block";
    renderList();
  }

  function openLessonByTitle(title) {
    const lesson = LESSONS.find((l) => l.title === title);
    if (lesson) openLesson(lesson.id);
  }

  function init() {
    renderList();
  }

  return { init, openLessonByTitle };
})();
