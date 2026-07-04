const API_BASE = "http://127.0.0.1:8000";
const TOTAL_QUESTIONS = 5;

let currentIndex = 0;      // 0-based, becomes 1..TOTAL_QUESTIONS for display
let scores = [];           // collected numeric scores
let answered = 0;
let awaitingSubmit = false;

const el = {
  tabbar: document.getElementById("tabbar"),
  questionText: document.getElementById("questionText"),
  answer: document.getElementById("answer"),
  startBtn: document.getElementById("startBtn"),
  submitBtn: document.getElementById("submitBtn"),
  terminalBody: document.getElementById("terminalBody"),
  progressLabel: document.getElementById("progressLabel"),
  progressFill: document.getElementById("progressFill"),
  avgScore: document.getElementById("avgScore"),
  connStatus: document.getElementById("connStatus"),
};

// ---------------- Tab bar ----------------

function renderTabs(){
  el.tabbar.innerHTML = "";
  for(let i = 0; i < TOTAL_QUESTIONS; i++){
    const tab = document.createElement("div");
    tab.className = "tab";
    if(i < answered) tab.classList.add("done");
    if(i === currentIndex && i === answered) tab.classList.add("active");
    tab.textContent = (i < answered ? "✓ " : "") + `q${i + 1}.py`;
    el.tabbar.appendChild(tab);
  }
}
renderTabs();

// ---------------- Connection check ----------------

async function checkConnection(){
  try{
    const res = await fetch(`${API_BASE}/`);
    if(res.ok){
      el.connStatus.className = "conn online";
      el.connStatus.querySelector(".conn-label").textContent = "backend online";
      return true;
    }
    throw new Error("bad status");
  }catch(e){
    el.connStatus.className = "conn offline";
    el.connStatus.querySelector(".conn-label").textContent = "backend offline";
    return false;
  }
}
checkConnection();

// ---------------- Progress ----------------

function updateProgress(){
  el.progressLabel.textContent = `${answered} / ${TOTAL_QUESTIONS} answered`;
  el.progressFill.style.width = `${(answered / TOTAL_QUESTIONS) * 100}%`;
  if(scores.length){
    const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
    el.avgScore.textContent = `avg score ${avg}/10`;
  }
}

// ---------------- Fetch a question ----------------

async function startInterview(){
  if(answered >= TOTAL_QUESTIONS) return;

  el.startBtn.disabled = true;
  el.submitBtn.disabled = true;
  el.answer.disabled = true;
  el.questionText.innerHTML = "loading next question…";
  setTerminal(`<span class="muted">fetching question ${answered + 1} from model…</span><span class="cursor"></span>`);

  const online = await checkConnection();
  if(!online){
    el.questionText.textContent = "Could not reach the backend.";
    setTerminal(`<span class="score-low">✗ connection failed — is the FastAPI server running on ${API_BASE}?</span>`);
    el.startBtn.disabled = false;
    return;
  }

  try{
    const res = await fetch(`${API_BASE}/question`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    currentIndex = answered;
    el.questionText.textContent = data.question;
    el.answer.disabled = false;
    el.answer.value = "";
    el.answer.focus();
    el.submitBtn.disabled = false;
    el.startBtn.textContent = "▶ Run interview";
    el.startBtn.disabled = true; // re-enabled only after submit/skip logic below
    setTerminal(`<span class="muted">waiting for your answer…</span><span class="cursor"></span>`);
    renderTabs();
  }catch(err){
    console.error(err);
    el.questionText.textContent = "Failed to load a question.";
    setTerminal(`<span class="score-low">✗ error loading question: ${escapeHtml(err.message)}</span>`);
    el.startBtn.disabled = false;
  }
}

// ---------------- Submit + evaluate ----------------

async function submitAnswer(){
  const answer = el.answer.value.trim();
  if(!answer){
    el.answer.focus();
    setTerminal(`<span class="score-mid">write an answer before submitting.</span>`);
    return;
  }
  if(awaitingSubmit) return;
  awaitingSubmit = true;

  el.submitBtn.disabled = true;
  el.answer.disabled = true;
  setTerminal(`<span class="muted">evaluating your answer…</span><span class="cursor"></span>`);

  try{
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const parsed = parseFeedback(data.feedback || "");
    if(parsed.score !== null) scores.push(parsed.score);
    answered += 1;
    updateProgress();
    renderTabs();
    renderFeedback(parsed);

  }catch(err){
    console.error(err);
    setTerminal(`<span class="score-low">✗ error evaluating answer: ${escapeHtml(err.message)}</span>`);
  }finally{
    awaitingSubmit = false;
  }

  if(answered >= TOTAL_QUESTIONS){
    el.questionText.innerHTML = "🎉 <strong>Interview complete</strong>";
    el.startBtn.textContent = "↻ Restart interview";
    el.startBtn.disabled = false;
    el.startBtn.onclick = restartInterview;
  }else{
    el.startBtn.disabled = false;
    el.startBtn.textContent = "▶ Next question";
    el.startBtn.onclick = startInterview;
  }
}

function restartInterview(){
  answered = 0;
  currentIndex = 0;
  scores = [];
  updateProgress();
  renderTabs();
  el.startBtn.onclick = startInterview;
  el.startBtn.textContent = "▶ Run interview";
  el.questionText.textContent = "Click Run to load your first question…";
  setTerminal(`<span class="muted">waiting for input…</span><span class="cursor"></span>`);
  startInterview();
}

// ---------------- Feedback parsing / rendering ----------------

function parseFeedback(text){
  const scoreMatch = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

  const feedbackMatch = text.match(/Feedback:\s*([\s\S]*?)(?:Correct Answer:|$)/i);
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : text.trim();

  const correctMatch = text.match(/Correct Answer:\s*([\s\S]*)/i);
  const correct = correctMatch ? correctMatch[1].trim() : "";

  return { score, feedback, correct, raw: text };
}

function renderFeedback(parsed){
  const scoreClass = parsed.score === null ? "score-mid"
    : parsed.score >= 7 ? "score-high"
    : parsed.score >= 4 ? "score-mid"
    : "score-low";

  const scoreLine = parsed.score !== null
    ? `<div class="score-line">Score: <span class="score-value ${scoreClass}">${parsed.score}/10</span></div>`
    : "";

  const feedbackBlock = parsed.feedback
    ? `<span class="fb-label">Feedback</span><div class="fb-block">${escapeHtml(parsed.feedback)}</div>`
    : "";

  const correctBlock = parsed.correct
    ? `<span class="fb-label">Correct answer</span><div class="fb-block fb-answer">${escapeHtml(parsed.correct)}</div>`
    : "";

  setTerminal(scoreLine + feedbackBlock + correctBlock);
}

function setTerminal(html){
  el.terminalBody.innerHTML = html;
  el.terminalBody.scrollTop = el.terminalBody.scrollHeight;
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------- Wire up buttons ----------------

el.startBtn.onclick = startInterview;
el.submitBtn.addEventListener("click", submitAnswer);

// submit on Ctrl/Cmd+Enter
el.answer.addEventListener("keydown", (e) => {
  if((e.ctrlKey || e.metaKey) && e.key === "Enter" && !el.submitBtn.disabled){
    submitAnswer();
  }
});

updateProgress();