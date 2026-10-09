/* CursorJS - aplicação principal */
const DEV_NAME = "Gledison Arruda"; // troque pelo nome do desenvolvedor
const STORE = "cursorjs.v1";
const TOTAL = CHALLENGES.length;
const xpOf = (c, hints) => Math.max(5, c.lvl * 10 + 10 - hints * 3);
const MAX_XP = CHALLENGES.reduce((s, c) => s + c.lvl * 10 + 10, 0);
const RANKS = [[0, "Iniciante"], [100, "Aprendiz"], [300, "Dev Júnior"], [700, "Dev Pleno"], [1200, "Mestre JS"]];

const $ = id => document.getElementById(id);
const levelOf = n => LEVELS[n - 1];

let state = load();
let cur = state.last || 1;
let lastResults = null;

function load() {
  try { return Object.assign({ done: {}, codes: {}, hints: {}, sol: {}, last: 1 }, JSON.parse(localStorage.getItem(STORE))); }
  catch { return { done: {}, codes: {}, hints: {}, sol: {}, last: 1 }; }
}
const save = () => localStorage.setItem(STORE, JSON.stringify(state));
const totalXp = () => Object.values(state.done).reduce((s, d) => s + d.xp, 0);

/* ---------- Sandbox em Web Worker (protege contra laços infinitos) ---------- */
const WORKER_SRC = `
self.onmessage = async (ev) => {
  const { code, fn, tests } = ev.data, logs = [];
  console.log = (...a) => logs.push(a.map(x => typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })()).join(' '));
  let f;
  try { f = new Function(code + '\\nreturn typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')(); }
  catch (e) { return self.postMessage({ fatal: String(e.message), logs }); }
  if (!f) return self.postMessage({ fatal: 'A função ' + fn + ' não foi encontrada.', logs });
  const results = [];
  for (const t of tests) {
    try {
      let r = t.f ? await (new Function('return ' + t.f))()(f) : await f(...t.a);
      const ok = JSON.stringify(r) === JSON.stringify(t.e);
      if (typeof r === 'function' || typeof r === 'symbol') r = String(r);
      results.push({ ok, got: r });
    } catch (e) { results.push({ ok: false, err: String(e) }); }
  }
  self.postMessage({ results, logs });
};`;

function runInWorker(code, ch) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const w = new Worker(url);
    const end = out => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(out); };
    const timer = setTimeout(() => end({ fatal: "Tempo esgotado (3s): possível laço infinito.", logs: [] }), 3000);
    w.onmessage = e => end(e.data);
    w.onerror = e => end({ fatal: e.message || "Erro de execução.", logs: [] });
    const tests = ch.tests.map(t => t.f ? { f: t.f.toString(), e: t.e } : { a: t.a, e: t.e });
    w.postMessage({ code, fn: ch.fn, tests });
  });
}

/* ---------- Renderização ---------- */
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function md(s) {
  const blocks = [];
  s = esc(s).replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => { blocks.push(`<pre>${c}</pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/_(.+?)_/g, "<i>$1</i>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}
const fmt = v => v === undefined ? "undefined" : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();

function renderList() {
  let html = "";
  LEVELS.forEach(L => {
    const items = CHALLENGES.filter(c => c.lvl === L.n);
    const d = items.filter(c => state.done[c.id]).length;
    html += `<div class="lvl-title" style="--c:${L.color}"><span>Nível ${L.n} · ${L.name}</span><b>${d}/${items.length}</b></div>`;
    items.forEach(c => {
      html += `<div class="item ${state.done[c.id] ? "done" : ""} ${c.id === cur ? "active" : ""}" data-id="${c.id}"><div class="n">${state.done[c.id] ? "✓" : c.id}</div><span class="t">${esc(c.t)}</span></div>`;
    });
  });
  $("list").innerHTML = html;
}

function renderStats() {
  const xp = totalXp();
  $("xp").textContent = xp;
  $("doneCount").textContent = `${Object.keys(state.done).length}/${TOTAL}`;
  $("rank").textContent = [...RANKS].reverse().find(r => xp >= r[0])[1];
  $("xpFill").style.width = Math.min(100, xp / MAX_XP * 100) + "%";
}

function updateGutter() {
  const n = $("code").value.split("\n").length;
  $("gutter").textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
}

function openChallenge(id, announce = true) {
  cur = id; state.last = id; save();
  const c = CHALLENGES[id - 1], L = levelOf(c.lvl);
  $("chBadge").textContent = `Nível ${c.lvl} · ${L.name}`;
  $("chBadge").style.setProperty("--c", L.color);
  $("chTitle").textContent = `#${c.id} ${c.t}`;
  $("chDesc").innerHTML = md(c.d);
  $("code").value = state.codes[id] ?? c.start;
  $("hintCount").textContent = state.hints[id] || 0;
  $("results").innerHTML = '<p class="muted">Execute os testes para ver os resultados.</p>';
  $("console").textContent = "";
  lastResults = null;
  const d = state.done[id];
  $("chStatus").textContent = d ? `Concluído · +${d.xp} XP` : `Vale até ${xpOf(c, 0)} XP`;
  $("chStatus").className = "status" + (d ? " done" : "");
  $("btnPrev").disabled = id === 1;
  $("btnNext").disabled = id === TOTAL;
  updateGutter(); renderList(); renderStats();
  if (announce) say(`Desafio **#${c.id} ${c.t}** aberto. Precisa de ajuda? Use **Dica** ou me pergunte.`);
}

/* ---------- Chat ---------- */
function say(text, who = "ai", type = "") {
  const m = document.createElement("div");
  m.className = `msg ${who} ${type}`;
  m.innerHTML = who === "ai" ? md(text) : esc(text);
  $("msgs").appendChild(m);
  $("msgs").scrollTop = $("msgs").scrollHeight;
}

function doHint() {
  const c = CHALLENGES[cur - 1], used = state.hints[cur] || 0;
  say(Tutor.hint(c, used));
  if (used < c.h.length) { state.hints[cur] = used + 1; save(); $("hintCount").textContent = state.hints[cur]; }
}
function doReview() {
  const c = CHALLENGES[cur - 1];
  Tutor.review($("code").value, c, lastResults).forEach(r => say(r.msg, "ai", r.type));
}
function doSolution() {
  const c = CHALLENGES[cur - 1];
  if (!state.done[cur] && !state.sol[cur] && !confirm("Ver a solução zera o XP deste desafio. Continuar?")) return;
  state.sol[cur] = true; save();
  say(Tutor.solution(c));
}

function chat(q) {
  const s = q.toLowerCase().trim();
  if (!s) return;
  say(q, "me");
  const c = CHALLENGES[cur - 1];
  if (/^(dica|ajuda|hint)/.test(s)) doHint();
  else if (/^(explic)/.test(s)) say(Tutor.explain(c));
  else if (/^(revis|analis)/.test(s)) doReview();
  else if (/solu[cç]/.test(s)) doSolution();
  else if (/pr[oó]ximo|proximo|o que fazer/.test(s)) say(Tutor.nextStep(state, TOTAL));
  else say(Tutor.answer(q, c));
}

/* ---------- Execução ---------- */
async function run() {
  const c = CHALLENGES[cur - 1], code = $("code").value;
  state.codes[cur] = code; save();
  $("btnRun").disabled = true; $("btnRun").textContent = "Executando...";
  const out = await runInWorker(code, c);
  $("btnRun").disabled = false; $("btnRun").textContent = "Executar testes";
  $("console").textContent = (out.logs || []).join("\n");

  if (out.fatal) {
    lastResults = null;
    $("results").innerHTML = `<div class="res bad"><b class="bad">Erro</b> ${esc(out.fatal)}</div>`;
    say(Tutor.review(code, c, null).map(r => r.msg).join("\n") || out.fatal, "ai", "err");
    return;
  }
  lastResults = c.tests.map((t, i) => ({ ...out.results[i], exp: t.e }));
  $("results").innerHTML = lastResults.map((r, i) => {
    const t = c.tests[i];
    const label = t.f ? (t.l || `Teste ${i + 1}`) : `${c.fn}(${t.a.map(fmt).join(", ")})`;
    const det = r.ok ? "" : `<div class="det">${r.err ? "Erro: " + esc(r.err) : `esperado ${esc(fmt(t.e))} · recebido ${esc(fmt(r.got))}`}</div>`;
    return `<div class="res ${r.ok ? "ok" : "bad"}"><b class="${r.ok ? "ok" : "bad"}">${r.ok ? "✔" : "✘"}</b><span>${esc(label)}</span>${det}</div>`;
  }).join("");

  if (lastResults.every(r => r.ok)) {
    if (!state.done[cur]) {
      const xp = state.sol[cur] ? 0 : xpOf(c, state.hints[cur] || 0);
      state.done[cur] = { xp, hints: state.hints[cur] || 0, at: Date.now() };
      save(); renderList(); renderStats();
      $("chStatus").textContent = `Concluído · +${xp} XP`; $("chStatus").className = "status done";
      say(`Parabéns! Desafio concluído e **+${xp} XP**. ${Tutor.nextStep(state, TOTAL)}`, "ai", "ok");
    } else say("Todos os testes passaram novamente.", "ai", "ok");
  } else {
    const r = Tutor.review(code, c, lastResults);
    say(r.map(x => x.msg).join("\n"), "ai", "warn");
  }
}

/* ---------- Gráficos (canvas puro) ---------- */
function setup(cv) { const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.font = "12px Segoe UI"; return x; }

function drawDonut() {
  const cv = $("chDonut"), x = setup(cv), cx = 150, cy = 115, r = 80, w = 22;
  const done = Object.keys(state.done).length, pct = done / TOTAL;
  x.lineWidth = w; x.strokeStyle = "#0006"; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  const g = x.createLinearGradient(0, 0, 300, 240); g.addColorStop(0, "#6366f1"); g.addColorStop(1, "#ec4899");
  x.strokeStyle = g; x.lineCap = "round"; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); if (pct > 0) x.stroke();
  x.fillStyle = "#e6ebff"; x.textAlign = "center"; x.font = "bold 32px Segoe UI"; x.fillText(Math.round(pct * 100) + "%", cx, cy + 8);
  x.font = "12px Segoe UI"; x.fillStyle = "#8b97c7"; x.fillText(`${done} de ${TOTAL} desafios`, cx, cy + 30);
  x.fillText(`${totalXp()} XP de ${MAX_XP}`, cx, 225);
}

function drawBars() {
  const cv = $("chBars"), x = setup(cv), base = 195, bw = 50, gap = 28, top = 30, hMax = base - top;
  LEVELS.forEach((L, i) => {
    const items = CHALLENGES.filter(c => c.lvl === L.n), d = items.filter(c => state.done[c.id]).length;
    const px = 30 + i * (bw + gap), h = hMax * d / items.length;
    x.fillStyle = "#0006"; x.fillRect(px, top, bw, hMax);
    x.fillStyle = L.color; x.fillRect(px, base - h, bw, h);
    x.fillStyle = "#e6ebff"; x.textAlign = "center"; x.fillText(`${d}/${items.length}`, px + bw / 2, base - h - 6 < top + 10 ? top + 14 : base - h - 6);
    x.fillStyle = "#8b97c7"; x.fillText("Nível " + L.n, px + bw / 2, base + 16);
    x.fillText(L.name.split(" ")[0], px + bw / 2, base + 31);
  });
}

function drawLine() {
  const cv = $("chLine"), x = setup(cv), l = 36, r = 400, t = 20, b = 200;
  const list = Object.entries(state.done).sort((a, b) => a[1].at - b[1].at);
  x.strokeStyle = "#25305a"; x.fillStyle = "#8b97c7";
  for (let i = 0; i <= 4; i++) { const y = b - (b - t) * i / 4; x.beginPath(); x.moveTo(l, y); x.lineTo(r, y); x.stroke(); x.textAlign = "right"; x.fillText(Math.round(MAX_XP * i / 4), l - 4, y + 4); }
  if (!list.length) { x.textAlign = "center"; x.fillText("Conclua desafios para ver a evolução", (l + r) / 2, (t + b) / 2); return; }
  let acc = 0; const pts = list.map(([, d], i) => { acc += d.xp; return [l + (r - l) * (i + 1) / list.length, b - (b - t) * acc / MAX_XP]; });
  pts.unshift([l, b]);
  const g = x.createLinearGradient(0, t, 0, b); g.addColorStop(0, "#8b5cf655"); g.addColorStop(1, "#8b5cf600");
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.lineTo(pts.at(-1)[0], b); x.lineTo(l, b); x.fillStyle = g; x.fill();
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.strokeStyle = "#8b5cf6"; x.lineWidth = 2.5; x.stroke();
  x.fillStyle = "#ec4899"; pts.slice(1).forEach(p => { x.beginPath(); x.arc(p[0], p[1], 3, 0, 7); x.fill(); });
}

function renderDashboard() {
  drawDonut(); drawBars(); drawLine();
  $("map").innerHTML = CHALLENGES.map(c => `<div class="cell ${state.done[c.id] ? "done" : ""}" style="--c:${levelOf(c.lvl).color}" data-id="${c.id}" title="${esc(c.t)}">${c.id}</div>`).join("");
  const done = Object.keys(state.done).map(Number), cnt = n => done.filter(id => CHALLENGES[id - 1].lvl === n).length;
  const full = n => cnt(n) === CHALLENGES.filter(c => c.lvl === n).length;
  const noHint = Object.values(state.done).filter(d => d.hints === 0 && d.xp > 0).length;
  const A = [
    ["Primeiro código", "Conclua 1 desafio", done.length >= 1], ["Aquecimento", "Conclua 10 desafios", done.length >= 10],
    ["Meio caminho", "Conclua 25 desafios", done.length >= 25], ["Mestre", "Conclua os 50 desafios", done.length === TOTAL],
    ["Independente", "5 desafios sem dicas", noHint >= 5], ["Fundamentos", "Complete o nível 1", full(1)],
    ["Arquiteto de dados", "Complete o nível 3", full(3)], ["Ninja Assíncrono", "Complete o nível 5", full(5)]
  ];
  $("badges").innerHTML = A.map(a => `<div class="ach ${a[2] ? "on" : ""}"><b>${a[2] ? "🏆" : "🔒"} ${a[0]}</b><small>${a[1]}</small></div>`).join("");
}

/* ---------- Eventos ---------- */
function showView(v) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  $("view-challenges").classList.toggle("hidden", v !== "challenges");
  $("view-dashboard").classList.toggle("hidden", v !== "dashboard");
  if (v === "dashboard") renderDashboard();
}

document.querySelectorAll(".tab").forEach(t => t.onclick = () => showView(t.dataset.view));
$("list").onclick = e => { const it = e.target.closest(".item"); if (it) openChallenge(+it.dataset.id); };
$("map").onclick = e => { const c = e.target.closest(".cell"); if (c) { showView("challenges"); openChallenge(+c.dataset.id); } };
$("btnRun").onclick = run;
$("btnHint").onclick = doHint;
$("btnReview").onclick = doReview;
$("btnSol").onclick = doSolution;
$("btnReset").onclick = () => { if (confirm("Restaurar o código inicial?")) { delete state.codes[cur]; save(); openChallenge(cur, false); } };
$("btnPrev").onclick = () => openChallenge(cur - 1);
$("btnNext").onclick = () => openChallenge(cur + 1);
$("btnWipe").onclick = () => { if (confirm("Apagar todo o progresso?")) { localStorage.removeItem(STORE); location.reload(); } };
$("chatForm").onsubmit = e => { e.preventDefault(); chat($("chatInput").value); $("chatInput").value = ""; };
document.querySelectorAll(".chips button").forEach(b => b.onclick = () => chat(b.dataset.q));

const code = $("code");
code.addEventListener("input", () => { updateGutter(); state.codes[cur] = code.value; save(); });
code.addEventListener("scroll", () => $("gutter").scrollTop = code.scrollTop);
code.addEventListener("keydown", e => {
  if (e.key === "Tab") { e.preventDefault(); const s = code.selectionStart; code.setRangeText("  ", s, code.selectionEnd, "end"); updateGutter(); }
  if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); run(); }
});
$("gutter").style.overflow = "hidden";

$("year").textContent = new Date().getFullYear();
$("dev").textContent = DEV_NAME;
say("Olá! Sou o **Tutor IA** do CursorJS, funcionando 100% no seu navegador. Posso dar dicas progressivas, revisar seu código e explicar conceitos. Use **Ctrl+Enter** para executar.");
openChallenge(cur, false);
