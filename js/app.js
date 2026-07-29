// ==========================================================
//  FORMAT'UPGRADE x QUICK HOUDEMONT - Logique de l'application
// ==========================================================

const IMG_BASE = ""; // chemins relatifs directs depuis la racine du repo

let state = {
  screen: "hub",
  pendingBack: null, // callback si on confirme le retour au menu
};

// ---------- Utilitaires ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  state.screen = id;
}

// ---------- Navigation / bouton retour ----------
function goToHub() {
  showScreen("screen-hub");
}

function confirmBackToMenu() {
  const overlay = el("div", "modal-overlay");
  const box = el("div", "modal-box");
  box.innerHTML = `<p>Es-tu sûr.e de vouloir retourner au menu ?</p>`;
  const actions = el("div", "modal-actions");
  const yes = el("button", "modal-btn yes", "Oui");
  const no = el("button", "modal-btn no", "Non");
  yes.onclick = () => { overlay.remove(); goToHub(); };
  no.onclick = () => overlay.remove();
  actions.append(no, yes);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ---------- Splash logo (flottant + bouton Commencer) puis header rétréci ----------
function playSplash(logoSrc, headerContainerId, callback) {
  // Prépare déjà le header du jeu (vide, avec le bouton retour) pour connaître sa position cible
  const header = document.getElementById(headerContainerId);
  header.innerHTML = "";
  const backBtn = el("button", "btn-back", "← Menu");
  backBtn.onclick = confirmBackToMenu;
  const logoPlaceholder = el("span");
  header.append(logoPlaceholder, backBtn);

  const overlay = el("div", "splash-overlay");
  const overlayBack = el("button", "btn-back splash-back", "← Menu");
  overlayBack.onclick = confirmBackToMenu;
  const img = el("img", "splash-logo");
  img.src = logoSrc;
  const startBtn = el("button", "splash-start-btn", "Commencer");

  overlay.append(overlayBack, img, startBtn);
  document.body.appendChild(overlay);

  startBtn.onclick = () => {
    startBtn.remove();
    overlayBack.remove();

    // Calcule la position/taille cible (celle qu'aura le logo dans le header)
    const targetRect = logoPlaceholder.getBoundingClientRect();
    const startRect = img.getBoundingClientRect();

    img.classList.add("shrinking");
    const scaleRatio = 68 / startRect.height;
    const deltaX = targetRect.left - startRect.left - (startRect.width - startRect.width * scaleRatio) / 2;
    const deltaY = targetRect.top - startRect.top - (startRect.height - startRect.height * scaleRatio) / 2;

    requestAnimationFrame(() => {
      img.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleRatio})`;
    });

    setTimeout(() => {
      overlay.remove();
      const logo = el("img", "game-logo");
      logo.src = logoSrc;
      logoPlaceholder.replaceWith(logo);
      if (callback) callback();
    }, 620);
  };
}

// ==========================================================
//  QUIZ : Questions pour un Giant
// ==========================================================
let quizState = {};

function startQuizFlow() {
  showScreen("screen-quiz-mode");
}

function launchQuiz(mode) {
  const questions = buildQuizSet(mode);
  quizState = { questions, index: 0, score: 0, log: [], answered: false };
  showScreen("screen-quiz-play");
  playSplash("Autres/Logo_Quick_Quizz.png", "quiz-game-header", renderQuizQuestion);
}

function buildQuizSet(mode) {
  if (mode === "aleatoire") {
    return pick(QUIZ_QUESTIONS, 15);
  }
  // mode équilibré : 6 faciles / 6 moyennes / 3 difficiles
  const faciles = pick(QUIZ_QUESTIONS.filter(q => q.diff === "facile"), 6);
  const moyennes = pick(QUIZ_QUESTIONS.filter(q => q.diff === "moyenne"), 6);
  const difficiles = pick(QUIZ_QUESTIONS.filter(q => q.diff === "difficile"), 3);
  return shuffle([...faciles, ...moyennes, ...difficiles]);
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.index];
  quizState.answered = false;

  // Mélange des choix en gardant la trace de la bonne réponse
  const correctText = q.choices[q.answer];
  const shuffledChoices = shuffle(q.choices);

  const container = document.getElementById("quiz-content");
  container.innerHTML = "";

  // Progress bar
  const progressWrap = el("div", "quiz-progress");
  const track = el("div", "progress-bar-track");
  const fill = el("div", "progress-bar-fill");
  fill.style.width = `${(quizState.index / quizState.questions.length) * 100}%`;
  track.appendChild(fill);
  const label = el("div", "progress-label", `<span>Question ${quizState.index + 1} / ${quizState.questions.length}</span><span>Score : ${quizState.score}</span>`);
  progressWrap.append(track, label);
  container.appendChild(progressWrap);

  // Question card
  const card = el("div", "question-card");
  const tags = el("div", "question-tags");
  tags.appendChild(el("span", "tag tag-cat", q.cat));
  tags.appendChild(el("span", `tag tag-diff-${q.diff}`, q.diff));
  card.appendChild(tags);
  card.appendChild(el("div", "question-text", q.q));

  const choicesWrap = el("div", "choices");
  shuffledChoices.forEach(choiceText => {
    const btn = el("button", "choice-btn", choiceText);
    btn.onclick = () => handleQuizAnswer(btn, choiceText, correctText, choicesWrap, q);
    choicesWrap.appendChild(btn);
  });
  card.appendChild(choicesWrap);

  const nextBtn = el("button", "next-btn", quizState.index === quizState.questions.length - 1 ? "Voir les résultats" : "Question suivante →");
  nextBtn.id = "quiz-next-btn";
  nextBtn.onclick = nextQuizQuestion;
  card.appendChild(nextBtn);

  container.appendChild(card);
}

function handleQuizAnswer(btn, chosenText, correctText, choicesWrap, q) {
  if (quizState.answered) return;
  quizState.answered = true;

  const isCorrect = chosenText === correctText;
  if (isCorrect) {
    quizState.score++;
    launchConfetti();
  }
  quizState.log.push({ q: q.q, cat: q.cat, correct: isCorrect });

  [...choicesWrap.children].forEach(c => {
    c.classList.add("disabled");
    if (c.textContent === correctText) c.classList.add("correct");
    else if (c === btn) c.classList.add("incorrect");
  });

  document.getElementById("quiz-next-btn").classList.add("show");
}

function nextQuizQuestion() {
  quizState.index++;
  if (quizState.index >= quizState.questions.length) {
    renderQuizResults();
  } else {
    renderQuizQuestion();
  }
}

function renderQuizResults() {
  const container = document.getElementById("quiz-content");
  container.innerHTML = "";
  const total = quizState.questions.length;
  const score = quizState.score;
  const pct = Math.round((score / total) * 100);

  let emoji = "🍔";
  if (pct >= 80) emoji = "🏆";
  else if (pct >= 50) emoji = "👍";
  else emoji = "📖";

  const screen = el("div", "results-screen");
  screen.innerHTML = `
    <div class="results-emoji">${emoji}</div>
    <div class="results-title">Quiz terminé !</div>
    <div class="results-score">${score}/${total}</div>
    <div class="results-detail">${pct}% de bonnes réponses</div>
  `;

  const list = el("div", "results-list");
  quizState.log.forEach(item => {
    const row = el("div", `results-list-item ${item.correct ? "ok" : "ko"}`, `<span>${item.q.length > 46 ? item.q.slice(0, 46) + "…" : item.q}</span><span>${item.correct ? "✓" : "✗"}</span>`);
    list.appendChild(row);
  });
  screen.appendChild(list);

  const replayBtn = el("button", "btn-primary-full", "Rejouer");
  replayBtn.onclick = startQuizFlow;
  const menuBtn = el("button", "btn-secondary-full", "Retour au menu");
  menuBtn.onclick = goToHub;
  screen.append(replayBtn, menuBtn);

  container.appendChild(screen);
}

// ==========================================================
//  BLUR-GER
// ==========================================================
let blurState = {};

function launchBlurGer() {
  const rounds = pick(BLURGER_PRODUCTS, 10);
  blurState = { rounds, index: 0, score: 0, timer: null, log: [] };
  showScreen("screen-blurger-play");
  playSplash("Autres/Logo_Blur-Ger.png", "blurger-game-header", renderBlurRound);
}

function getLeurres(product) {
  const sameFamily = BLURGER_PRODUCTS.filter(p => p.family === product.family && p.name !== product.name);
  const others = BLURGER_PRODUCTS.filter(p => p.family !== product.family && p.name !== product.name);
  let leurres = pick(sameFamily, 3);
  if (leurres.length < 3) {
    leurres = leurres.concat(pick(others, 3 - leurres.length));
  }
  return leurres;
}

function renderBlurRound() {
  const product = blurState.rounds[blurState.index];
  const file = product.files[Math.floor(Math.random() * product.files.length)];
  const imgPath = `${product.folder}/${file}`;

  const choices = shuffle([product.name, ...getLeurres(product).map(p => p.name)]);

  const container = document.getElementById("blurger-content");
  container.innerHTML = "";

  const stage = el("div", "blurger-stage");
  const scoreRow = el("div", "blurger-score-row", `<span>Image ${blurState.index + 1} / ${blurState.rounds.length}</span><strong>${blurState.score} pts</strong>`);
  stage.appendChild(scoreRow);

  const imgWrap = el("div", "blurger-image-wrap");
  const img = el("img", "blurger-image");
  img.src = imgPath;
  img.style.filter = "blur(20px)";
  imgWrap.appendChild(img);
  stage.appendChild(imgWrap);

  const timerTrack = el("div", "blurger-timer-track");
  const timerFill = el("div", "blurger-timer-fill");
  timerFill.style.width = "100%";
  timerTrack.appendChild(timerFill);
  stage.appendChild(timerTrack);

  const choicesWrap = el("div", "blurger-choices");
  choices.forEach(name => {
    const btn = el("button", "blurger-choice-btn", name);
    btn.onclick = () => handleBlurAnswer(btn, name, product.name, choicesWrap, imgWrap);
    choicesWrap.appendChild(btn);
  });
  stage.appendChild(choicesWrap);

  container.appendChild(stage);

  // Chrono 15 secondes, flou de 20px à 0px
  const DURATION = 15000;
  const start = Date.now();
  clearInterval(blurState.timer);
  let answered = false;

  blurState.timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const ratio = Math.min(elapsed / DURATION, 1);
    const blurVal = 20 * (1 - ratio);
    img.style.filter = `blur(${blurVal}px)`;
    timerFill.style.width = `${(1 - ratio) * 100}%`;

    if (ratio >= 1 && !answered) {
      answered = true;
      clearInterval(blurState.timer);
      revealBlurAnswer(choicesWrap, product.name, null);
      blurState.log.push({ name: product.name, points: 0, missed: true });
      showBlurNextButton();
    }
  }, 50);

  window.__blurAnswered = () => { answered = true; };
  window.__blurStart = start;
  window.__blurDuration = DURATION;
}

function handleBlurAnswer(btn, chosenName, correctName, choicesWrap, imgWrap) {
  if (window.__blurAnswered_flag) return;
  window.__blurAnswered_flag = true;
  clearInterval(blurState.timer);
  if (window.__blurAnswered) window.__blurAnswered();

  const elapsed = Date.now() - window.__blurStart;
  const ratio = Math.min(elapsed / window.__blurDuration, 1);
  const isCorrect = chosenName === correctName;

  let points = 0;
  if (isCorrect) {
    points = Math.max(10, Math.round(100 - ratio * 90));
    blurState.score += points;
    launchConfetti();
    const flash = el("div", "points-flash", `+${points}`);
    imgWrap.appendChild(flash);
    setTimeout(() => flash.remove(), 900);
  }
  blurState.log.push({ name: correctName, points, missed: !isCorrect });

  revealBlurAnswer(choicesWrap, correctName, btn);
  document.querySelector(".blurger-image").style.filter = "blur(0px)";
  showBlurNextButton();
}

function revealBlurAnswer(choicesWrap, correctName, chosenBtn) {
  [...choicesWrap.children].forEach(c => {
    c.style.pointerEvents = "none";
    if (c.textContent === correctName) c.classList.add("correct");
    else if (c === chosenBtn) c.classList.add("incorrect");
  });
}

function showBlurNextButton() {
  const stage = document.querySelector(".blurger-stage");
  const nextBtn = el("button", "next-btn show", blurState.index === blurState.rounds.length - 1 ? "Voir les résultats" : "Image suivante →");
  nextBtn.onclick = nextBlurRound;
  stage.appendChild(nextBtn);
}

function nextBlurRound() {
  window.__blurAnswered_flag = false;
  blurState.index++;
  if (blurState.index >= blurState.rounds.length) {
    renderBlurResults();
  } else {
    renderBlurRound();
  }
}

function renderBlurResults() {
  const container = document.getElementById("blurger-content");
  container.innerHTML = "";
  const screen = el("div", "results-screen");
  const missed = blurState.log.filter(l => l.missed).length;

  screen.innerHTML = `
    <div class="results-emoji">🍔</div>
    <div class="results-title">Partie terminée !</div>
    <div class="results-score">${blurState.score} pts</div>
    <div class="results-detail">${blurState.rounds.length - missed}/${blurState.rounds.length} produits trouvés</div>
  `;

  const list = el("div", "results-list");
  blurState.log.forEach(item => {
    const row = el("div", `results-list-item ${item.missed ? "ko" : "ok"}`, `<span>${item.name}</span><span>${item.missed ? "Raté" : "+" + item.points}</span>`);
    list.appendChild(row);
  });
  screen.appendChild(list);

  const replayBtn = el("button", "btn-primary-full", "Rejouer");
  replayBtn.onclick = launchBlurGer;
  const menuBtn = el("button", "btn-secondary-full", "Retour au menu");
  menuBtn.onclick = goToHub;
  screen.append(replayBtn, menuBtn);

  container.appendChild(screen);
}

// ==========================================================
//  CONFETTIS
// ==========================================================
function launchConfetti() {
  const colors = ["#E4032E", "#E8B84B", "#F5F3F0", "#2ECC71"];
  for (let i = 0; i < 22; i++) {
    const piece = el("div", "confetti-piece");
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (1.2 + Math.random() * 0.8) + "s";
    piece.style.opacity = "1";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2200);
  }
}

// ==========================================================
//  FICHES DE RÉVISION
// ==========================================================
function toggleAccordion(headerEl) {
  headerEl.parentElement.classList.toggle("open");
}

function renderRevision() {
  const container = document.getElementById("revision-list");
  if (container.dataset.rendered) return;
  container.dataset.rendered = "1";

  const categories = [...new Set(QUIZ_QUESTIONS.map(q => q.cat))];
  categories.forEach(cat => {
    const acc = el("div", "revision-accordion");
    const head = el("div", "revision-accordion-head", `<span>${cat}</span><span class="arrow">▼</span>`);
    head.onclick = () => toggleAccordion(head);
    const body = el("div", "revision-accordion-body");

    const facts = QUIZ_QUESTIONS.filter(q => q.cat === cat);
    facts.forEach(f => {
      const correct = f.choices[f.answer];
      body.appendChild(el("div", "revision-fact", `${f.q}<br><strong>→ ${correct}</strong>`));
    });

    acc.append(head, body);
    container.appendChild(acc);
  });
}

// ==========================================================
//  INIT
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("card-quiz").onclick = startQuizFlow;
  document.getElementById("card-blurger").onclick = launchBlurGer;
  document.getElementById("card-revision").onclick = () => { showScreen("screen-revision"); renderRevision(); };

  document.getElementById("mode-aleatoire").onclick = () => launchQuiz("aleatoire");
  document.getElementById("mode-equilibre").onclick = () => launchQuiz("equilibre");

  document.querySelectorAll("[data-back]").forEach(btn => btn.onclick = confirmBackToMenu);

  showScreen("screen-hub");
});
