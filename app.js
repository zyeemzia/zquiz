/* ZQuiz screens: home, library, maker, host, player and solo. */
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get(k, d) { try { const v = localStorage.getItem('zq.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('zq.' + k, JSON.stringify(v)); } catch (e) {} } };
const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); };
const SHAPES = ['★', '⬢', '☾', '⚡'], AVATARS = ['🦊', '🐯', '🐼', '🦄', '🐸', '🐙', '🦉', '🐝', '🚀', '👾', '🤖', '🌟', '🔥', '🌈', '⚽', '🎧'], RX = ['🎉', '🔥', '😂', '😮', '👏', '💜'];
const TYPES = { quiz: 'Multiple choice', tf: 'True or false', multi: 'Pick several', type: 'Type the answer', slider: 'Slider', order: 'Put in order', poll: 'Poll (no score)', cloud: 'Word cloud (no score)' };
const NAMES1 = ['Swift', 'Lucky', 'Cosmic', 'Brave', 'Neon', 'Jolly', 'Mighty', 'Clever'], NAMES2 = ['Tiger', 'Comet', 'Otter', 'Falcon', 'Mango', 'Pixel', 'Rocket', 'Panda'];
let cur = { cleanup: null };
document.documentElement.dataset.theme = store.get('theme', 'aurora');
const leave = () => { if (cur.cleanup) cur.cleanup(); cur = { cleanup: null }; Music.stop(); clearInterval(window.__zt); window.onbeforeunload = null; };

/* Sound: all generated in the browser, so nothing needs downloading. */
const Music = {
  on: store.get('sound', true), ctx: null, timer: null,
  ac() { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  note(f, d, v, type) { const c = this.ac(); if (!c || !this.on) return; const o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v || .05, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + d); },
  /* Original generative pieces: a calm jazz lounge for the lobby, a quiet thinking pulse for questions. */
  hz: m => 440 * 2 ** ((m - 69) / 12),
  chord(ms, d, v) { ms.forEach((m, i) => setTimeout(() => { this.note(this.hz(m), d, v, 'sine'); this.note(this.hz(m) * 2, d * .5, v * .18, 'sine'); }, i * 18)); },
  loop(fast) {
    this.stop(); let b = 0;
    const lounge = [[50, [65, 69, 72, 76]], [55, [65, 69, 71, 76]], [48, [64, 67, 71, 74]], [57, [64, 67, 70, 73]]];
    const think = [[45, [64, 69, 72]], [41, [65, 69, 72]], [48, [64, 67, 72]], [43, [62, 67, 71]]];
    const prog = fast === 'lounge' ? lounge : think, beat = fast === 'lounge' ? 420 : fast ? 300 : 400;
    const melody = [76, 74, 72, 71, 72, 74, 79, 76];
    const step = () => {
      const [root, ch] = prog[Math.floor(b / 4) % prog.length], s = b % 4;
      if (s === 0) this.chord(ch, beat * 3.4 / 1000, fast === 'lounge' ? .022 : .016);
      this.note(this.hz(root - (s === 2 ? -7 : 0)), beat * .9 / 1000, .04, 'sine');
      if (fast === 'lounge' && s === 2 && b % 8 === 2) this.note(this.hz(melody[Math.floor(b / 8) % 8]), .9, .02, 'sine');
      if (fast !== 'lounge') this.note(this.hz(ch[s % ch.length] + 12), .12, .012, 'triangle');
      b++;
    };
    step(); this.timer = setInterval(step, beat);
  },
  stop() { clearInterval(this.timer); this.timer = null; },
  fx(k) {
    if (k === 'roll') { for (let i = 0; i < 14; i++) setTimeout(() => this.note(70 + i * 3, .1, .02 + i * .002, 'sine'), i * 85); return; }
    const m = { ok: [72, 76, 79], bad: [57, 53], join: [79, 84], third: [67, 72, 76], second: [69, 72, 76, 81], win: [60, 67, 72, 76, 79, 84] }[k] || [];
    m.forEach((n, i) => setTimeout(() => { this.note(this.hz(n), k === 'win' ? .8 : .3, .05, 'sine'); this.note(this.hz(n) * 2, .3, .012, 'sine'); }, i * 130));
    if (k === 'win') setTimeout(() => this.chord([60, 64, 67, 72, 76], 2.6, .04), 800);
  }
};
const buzz = p => { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } };
const speak = t => { if (store.get('voice', false) && window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); } };

/* Confetti on a canvas; skipped for people who ask for reduced motion. */
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const c = $('#fx'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#ff5470', '#7c4dff', '#00e5c3', '#f59e0b', '#fff'], ps = Array.from({ length: n || 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height / 2, r: 4 + Math.random() * 6, v: 2 + Math.random() * 4, s: Math.random() * 6, col: cols[Math.floor(Math.random() * 5)] }));
  let f = 0; (function draw() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.y += p.v; p.x += Math.sin(p.s + f / 20); x.fillStyle = p.col; x.fillRect(p.x, p.y, p.r, p.r * 1.6); }); if (++f < 240) requestAnimationFrame(draw); else x.clearRect(0, 0, c.width, c.height); })();
}
const floatRx = e => { const d = document.createElement('div'); d.className = 'rx'; d.textContent = e; d.style.left = 5 + Math.random() * 88 + 'vw'; document.body.append(d); setTimeout(() => d.remove(), 2600); };

/* Saved quizzes, plus sharing through the link itself (no account or server needed). */
const myQuizzes = () => store.get('quizzes', []);
const saveQuiz = q => { const a = myQuizzes().filter(x => x.id !== q.id); a.unshift(q); store.set('quizzes', a); };
const encodeQ = q => btoa(unescape(encodeURIComponent(JSON.stringify(q)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decodeQ = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const findQuiz = id => ZQ_TEMPLATES.concat(myQuizzes()).find(q => q.id === id);
/* Checks a quiz from a file, link or chatbot, and fills in safe defaults. Returns error text or the clean quiz. */
function validateQuiz(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.qs) || !o.qs.length) return 'A quiz needs a "qs" list with at least one question.';
  if (o.qs.length > 100) return 'A quiz can have at most 100 questions.';
  const qs = []; for (let i = 0; i < o.qs.length; i++) {
    const q = o.qs[i], at = 'Question ' + (i + 1) + ': '; if (!TYPES[q.type]) return at + 'unknown type.'; if (!q.text || typeof q.text !== 'string') return at + 'needs text.';
    const c = { type: q.type, text: q.text.slice(0, 300), time: Math.min(120, Math.max(5, Number(q.time) || 20)) };
    if ([1, 2, 0].includes(q.points)) c.points = q.points; if (q.emoji) c.emoji = String(q.emoji).slice(0, 8); if (/^https:\/\//.test(q.image || '')) c.image = q.image;
    if (['quiz', 'tf', 'multi', 'poll'].includes(q.type)) { if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) return at + 'needs 2 to 4 options.'; c.options = q.options.map(x => String(x).slice(0, 90)); }
    if (['quiz', 'tf', 'multi'].includes(q.type)) { if (!Array.isArray(q.correct) || !q.correct.length || q.correct.some(x => !Number.isInteger(x) || x < 0 || x >= c.options.length)) return at + 'mark the correct option.'; c.correct = q.correct; }
    if (q.type === 'type') { if (!Array.isArray(q.accept) || !q.accept.length) return at + 'needs accepted answers.'; c.accept = q.accept.map(String); }
    if (q.type === 'slider') { c.min = Number(q.min); c.max = Number(q.max); c.answer = Number(q.answer); c.tolerance = Number(q.tolerance) || 0; if (![c.min, c.max, c.answer].every(Number.isFinite) || c.min >= c.max || c.answer < c.min || c.answer > c.max) return at + 'check the slider numbers.'; }
    if (q.type === 'order') { if (!Array.isArray(q.order) || q.order.length < 2 || q.order.length > 6) return at + 'needs 2 to 6 items.'; c.order = q.order.map(String); }
    qs.push(c);
  }
  return { id: o.id || 'q' + Date.now().toString(36), title: String(o.title || 'Untitled quiz').slice(0, 80), emoji: String(o.emoji || '🎯').slice(0, 8), desc: String(o.desc || '').slice(0, 140), qs };
}

/* ---------- Home ---------- */
function home() {
  leave();
  const pin = new URLSearchParams(location.search).get('pin') || '';
  app.innerHTML = `<div class="center"><div class="logo">ZQuiz</div><p class="tag">Make a quiz. Share a PIN. Play together.</p>
  <form class="card joinbox" id="jf"><input class="pin" id="jp" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Game PIN" aria-label="Game PIN" value="${esc(pin)}"><button class="btn big">Enter</button></form>
  <div class="row" style="justify-content:center"><a class="btn" href="#/library">🎮 Host a game</a><a class="btn ghost" href="#/make">✏️ Create a quiz</a><a class="btn ghost" href="#/library?solo">🏃 Play solo</a></div>
  <div class="features"><div><b>⚡ 8 question types</b>Choice, slider, order, typing, polls and word clouds</div><div><b>🛡️ Power-ups</b>Double points, 50/50 and shield</div><div><b>🎉 Live reactions</b>Emoji float across the big screen</div><div><b>☠️ Survival & teams</b>Three lives, or play as a squad</div><div><b>🤖 Chatbot import</b>Have any AI draft a quiz, then paste it in</div><div><b>📊 Reports</b>Hardest questions and a CSV export</div></div>
  <label class="small" style="margin-top:10px">Theme <select id="th">${['aurora', 'neon', 'sunrise', 'ocean'].map(t => `<option ${store.get('theme', 'aurora') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
  <div class="ft">© ${new Date().getFullYear()} ZyeemZia™ · <a href="https://zyeemzia.com">zyeemzia.com</a> · <a href="https://academy.zyeemzia.com">Academy</a></div>`;
  $('#jf').onsubmit = e => { e.preventDefault(); const p = $('#jp').value.replace(/\D/g, ''); if (p.length !== 6) return toast('A game PIN has 6 digits.'); location.hash = '#/join/' + p; };
  $('#th').onchange = e => { document.documentElement.dataset.theme = e.target.value; store.set('theme', e.target.value); };
}
const topbar = r => `<div class="top"><a class="brand" href="#/">ZQuiz</a><div class="row">${r || ''}</div></div>`;

/* ---------- Library ---------- */
function library(solo) {
  leave();
  const card = (q, mine) => `<div class="card qcard"><div class="cover">${esc(q.emoji || '🎯')}</div><h3>${esc(q.title)}</h3><p class="mut small">${q.qs.length} questions${q.desc ? ' · ' + esc(q.desc) : ''}</p><div class="row">${solo ? '' : `<a class="btn sm" href="#/setup/${esc(q.id)}">Host</a>`}<a class="btn ${solo ? 'sm' : 'sm ghost'}" href="#/solo/${esc(q.id)}">Solo</a>${mine ? `<a class="btn sm ghost" href="#/make/${esc(q.id)}">Edit</a><button class="btn sm ghost" data-share="${esc(q.id)}">Share</button><button class="btn sm ghost" data-del="${esc(q.id)}">Delete</button>` : ''}</div></div>`;
  const mine = myQuizzes();
  app.innerHTML = topbar('<a class="btn sm" href="#/make">+ New quiz</a>') + `<div class="wrap">${mine.length ? `<h2>My quizzes</h2><div class="grid">${mine.map(q => card(q, true)).join('')}</div>` : ''}<h2>${solo ? 'Choose a quiz to play alone' : 'Ready to play'}</h2><div class="grid">${ZQ_TEMPLATES.map(q => card(q)).join('')}</div></div>`;
  app.onclick = e => {
    const s = e.target.dataset.share, d = e.target.dataset.del;
    if (s) { const url = location.origin + location.pathname + '#/import/' + encodeQ(findQuiz(s)); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied. It contains the answers, so share it with hosts only.'), () => prompt('Copy this link', url)); }
    if (d && confirm('Delete this quiz from this browser?')) { store.set('quizzes', myQuizzes().filter(x => x.id !== d)); library(solo); }
  };
  cur.cleanup = () => { app.onclick = null; };
}

/* ---------- Maker ---------- */
const AI_PROMPT = `Write a quiz about [TOPIC] as JSON only, in this shape:
{"title":"...","emoji":"🎯","qs":[
{"type":"quiz","text":"...","options":["a","b","c","d"],"correct":[0],"time":20},
{"type":"tf","text":"...","options":["True","False"],"correct":[1],"time":10},
{"type":"multi","text":"...","options":["a","b","c","d"],"correct":[0,2],"time":25},
{"type":"type","text":"...","accept":["answer"],"time":20},
{"type":"slider","text":"...","min":0,"max":100,"answer":42,"tolerance":2,"time":15},
{"type":"order","text":"...","order":["first","second","third"],"time":25},
{"type":"poll","text":"...","options":["a","b"],"time":15},
{"type":"cloud","text":"...","time":20}]}
Make 10 accurate questions and vary the types.`;
function maker(id) {
  leave();
  const base = id && findQuiz(id); let quiz = base && myQuizzes().some(q => q.id === id) ? JSON.parse(JSON.stringify(base)) : base ? Object.assign(JSON.parse(JSON.stringify(base)), { id: 'q' + Date.now().toString(36) }) : { id: 'q' + Date.now().toString(36), title: '', emoji: '🎯', qs: [{ type: 'quiz', text: '', options: ['', '', '', ''], correct: [0], time: 20 }] };
  const opts = (q, i) => {
    if (['quiz', 'tf', 'multi', 'poll'].includes(q.type)) return `<div class="two">${q.options.map((o, k) => `<div class="opt">${q.type === 'poll' ? '' : `<input type="checkbox" aria-label="Correct" data-c="${i},${k}" ${(q.correct || []).includes(k) ? 'checked' : ''}>`}<input data-o="${i},${k}" value="${esc(o)}" placeholder="Option ${k + 1}" ${q.type === 'tf' ? 'readonly' : ''}></div>`).join('')}</div>`;
    if (q.type === 'type') return `<label>Accepted answers, comma separated<input data-f="${i},accept" value="${esc((q.accept || []).join(', '))}"></label>`;
    if (q.type === 'slider') return `<div class="two">${['min', 'max', 'answer', 'tolerance'].map(k => `<label>${k}<input type="number" data-f="${i},${k}" value="${esc(q[k] == null ? '' : q[k])}"></label>`).join('')}</div>`;
    if (q.type === 'order') return `<label>Items in the right order, one per line<textarea data-f="${i},order">${esc((q.order || []).join('\n'))}</textarea></label>`;
    return '<p class="mut small">Players type a short word. Popular answers grow bigger.</p>';
  };
  const draw = () => {
    app.innerHTML = topbar('<a class="btn sm ghost" href="#/library">Library</a><button class="btn sm" id="save">Save</button>') + `<div class="wrap"><div class="card mq"><div class="two"><label>Quiz title<input id="tt" value="${esc(quiz.title)}" placeholder="My amazing quiz"></label><label>Cover emoji<input id="te" value="${esc(quiz.emoji)}" maxlength="8"></label></div>
    <details><summary>🤖 Draft with any AI chatbot, or import a file</summary><p class="small mut">Copy this prompt into a chatbot, then paste its reply below. Check the facts before you play.</p><textarea readonly id="aip">${esc(AI_PROMPT)}</textarea><div class="row"><button class="btn sm ghost" id="copy">Copy prompt</button></div><label style="margin-top:8px">Paste the quiz JSON<textarea id="pj"></textarea></label><div class="row" style="margin-top:8px"><button class="btn sm" id="imp">Import</button><button class="btn sm ghost" id="exp">Download this quiz</button></div></details></div>
    ${quiz.qs.map((q, i) => `<div class="card mq"><div class="row"><b class="grow">Question ${i + 1}</b><button class="btn sm ghost" data-up="${i}" aria-label="Move up">↑</button><button class="btn sm ghost" data-rm="${i}">Remove</button></div>
    <label>Question<input data-f="${i},text" value="${esc(q.text)}" maxlength="300"></label>
    <div class="two"><label>Type<select data-type="${i}">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Seconds<input type="number" min="5" max="120" data-f="${i},time" value="${q.time}"></label><label>Points<select data-f="${i},points"><option value="1" ${q.points !== 2 && q.points !== 0 ? 'selected' : ''}>Standard</option><option value="2" ${q.points === 2 ? 'selected' : ''}>Double</option><option value="0" ${q.points === 0 ? 'selected' : ''}>None</option></select></label><label>Emoji (optional)<input data-f="${i},emoji" value="${esc(q.emoji || '')}" maxlength="8"></label></div>
    <label>Image link (optional, https)<input data-f="${i},image" value="${esc(q.image || '')}"></label>${opts(q, i)}</div>`).join('')}
    <button class="btn ghost" id="add">+ Add question</button></div>`;
  };
  const defaults = t => ({ quiz: { options: ['', '', '', ''], correct: [0] }, tf: { options: ['True', 'False'], correct: [0] }, multi: { options: ['', '', '', ''], correct: [0, 1] }, poll: { options: ['', ''] }, type: { accept: [] }, slider: { min: 0, max: 100, answer: 50, tolerance: 0 }, order: { order: [] }, cloud: {} })[t];
  app.oninput = e => {
    const d = e.target.dataset; if (e.target.id === 'tt') quiz.title = e.target.value; if (e.target.id === 'te') quiz.emoji = e.target.value;
    if (d.o) { const [i, k] = d.o.split(','); quiz.qs[i].options[k] = e.target.value; }
    if (d.c) { const [i, k] = d.c.split(',').map(Number), q = quiz.qs[i]; if (q.type === 'multi') { q.correct = e.target.checked ? [...new Set(q.correct.concat(k))] : q.correct.filter(x => x !== k); } else { q.correct = [k]; app.querySelectorAll(`[data-c^="${i},"]`).forEach(x => { x.checked = x === e.target; }); } }
    if (d.f) { const [i, k] = d.f.split(','), q = quiz.qs[i], v = e.target.value; if (k === 'accept') q.accept = v.split(',').map(s => s.trim()).filter(Boolean); else if (k === 'order') q.order = v.split('\n').map(s => s.trim()).filter(Boolean); else if (['time', 'min', 'max', 'answer', 'tolerance', 'points'].includes(k)) q[k] = Number(v); else q[k] = v; }
    if (d.type) { const q = quiz.qs[d.type]; quiz.qs[d.type] = Object.assign({ type: e.target.value, text: q.text, time: q.time, emoji: q.emoji, image: q.image }, defaults(e.target.value)); draw(); }
  };
  app.onclick = e => {
    const d = e.target.dataset, id = e.target.id;
    if (id === 'add') { quiz.qs.push({ type: 'quiz', text: '', options: ['', '', '', ''], correct: [0], time: 20 }); draw(); }
    if (d.rm) { if (quiz.qs.length > 1) { quiz.qs.splice(d.rm, 1); draw(); } }
    if (d.up && +d.up > 0) { const a = quiz.qs; [a[d.up - 1], a[d.up]] = [a[d.up], a[d.up - 1]]; draw(); }
    if (id === 'copy' && navigator.clipboard) navigator.clipboard.writeText(AI_PROMPT).then(() => toast('Prompt copied'));
    if (id === 'imp') { try { const m = validateQuiz(JSON.parse($('#pj').value.replace(/^```(json)?|```$/gm, ''))); if (typeof m === 'string') return toast(m); quiz = m; draw(); toast('Imported ' + m.qs.length + ' questions. Check them, then save.'); } catch (x) { toast('That is not valid JSON.'); } }
    if (id === 'exp') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(quiz, null, 1)], { type: 'application/json' })); a.download = (quiz.title || 'quiz') + '.json'; a.click(); }
    if (id === 'save') {
      const bad = quiz.qs.findIndex(q => (q.options && q.options.some(o => !o.trim()))); if (bad >= 0) return toast('Question ' + (bad + 1) + ' has an empty option.');
      const blank = quiz.qs.findIndex(q => !q.text.trim()); if (blank >= 0) return toast('Question ' + (blank + 1) + ' needs text.');
      const m = validateQuiz(quiz); if (typeof m === 'string') return toast(m); m.id = quiz.id; saveQuiz(m); toast('Saved in this browser'); location.hash = '#/library';
    }
  };
  draw(); cur.cleanup = () => { app.oninput = app.onclick = null; };
}

/* ---------- Host ---------- */
function setup(id) {
  leave(); const q = findQuiz(id); if (!q) return location.hash = '#/library';
  const m = store.get('hostopts', { mode: 'classic', auto: false, shuffle: false });
  app.innerHTML = topbar() + `<div class="center"><div class="cover" style="font-size:56px">${esc(q.emoji)}</div><h1>${esc(q.title)}</h1><div class="card joinbox" style="text-align:left">
  <label>Game mode<select id="mode"><option value="classic">Classic: highest score wins</option><option value="team">Teams: four squads, average score</option><option value="survival">Survival: three lives each</option></select></label>
  <label class="opt" style="display:flex"><input type="checkbox" id="auto" style="width:24px"> Auto-advance, with no host clicks</label><label class="opt" style="display:flex"><input type="checkbox" id="shuf" style="width:24px"> Shuffle questions</label><label class="opt" style="display:flex"><input type="checkbox" id="voice" style="width:24px"> Read questions aloud</label><label class="opt" style="display:flex"><input type="checkbox" id="snd" style="width:24px"> Music and sound effects</label>
  <button class="btn big" id="go">Open lobby</button></div></div>`;
  $('#mode').value = m.mode; $('#auto').checked = m.auto; $('#shuf').checked = m.shuffle; $('#voice').checked = store.get('voice', false); $('#snd').checked = Music.on;
  $('#go').onclick = () => { const o = { mode: $('#mode').value, auto: $('#auto').checked, shuffle: $('#shuf').checked }; store.set('hostopts', o); store.set('voice', $('#voice').checked); Music.on = $('#snd').checked; store.set('sound', Music.on); Music.ac(); host(q, o); };
}
function host(quiz, opts) {
  leave(); window.onbeforeunload = () => 'Leaving ends this game.';
  const newPin = () => String(100000 + Math.floor(Math.random() * 900000));
  let pin = newPin(), net, g, attempts = 0; const hostId = 'h' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const send = (to, m) => net.send(to, m);
  g = new ZQ.Game(quiz, opts, send, (ev, x) => {
    if (ev === 'react') return floatRx(x);
    if (ev === 'join') { Music.fx('join'); if (g.phase === 'lobby') lobby(); return; }
    if (ev === 'leave') { if (g.phase === 'lobby') lobby(); return; }
    if (ev === 'answer') { const el = $('#cnt'); if (el) el.textContent = g.answers.size + ' of ' + g.active().length + ' answered'; return; }
    draw();
  });
  const connect = () => { net = new ZQ.Net(pin, 'host', hostId, (from, m) => { if (m && m.t === 'gone') { const p = g.players.get(from); if (p) p.connected = false; return; } g.handle(from, m); }, (s, code) => { if (s === 'rejected' && code === 4001 && attempts++ < 5) { net.close(); pin = newPin(); connect(); lobby(); } if (s === 'retry') toast('Reconnecting…'); }); };
  connect();
  const lobby = () => {
    const url = location.origin + location.pathname + '?pin=' + pin + (location.search.includes('local=1') ? '&local=1' : '') + '#/join/' + pin;
    app.innerHTML = `<div class="wrap"><div class="card lobbyhead"><div><div class="mut">Join at <b>${esc(location.host)}</b> with PIN</div><div class="bigpin" id="pin">${pin.slice(0, 3)} ${pin.slice(3)}</div><div class="row"><button class="btn sm ghost" id="cp">Copy join link</button><button class="btn sm ghost" id="lock">${g.opts.locked ? '🔒 Locked' : '🔓 Lock game'}</button><button class="btn sm ghost" id="bots">+ 3 practice bots</button></div></div><div id="qr" role="img" aria-label="QR code to join"></div></div>
    <h2 style="text-align:center;margin-top:14px">${g.players.size} player${g.players.size === 1 ? '' : 's'} · ${esc(quiz.title)}</h2><div class="players">${g.list().map(p => `<button class="chip" data-kick="${esc(p.pid)}" title="Remove player">${esc(p.avatar)} ${esc(p.name)}</button>`).join('') || '<span class="mut">Waiting for players…</span>'}</div>
    <div style="text-align:center"><button class="btn big" id="st" ${g.players.size ? '' : 'disabled'}>Start game</button><p class="small mut">Click a name to remove a player.</p></div></div>`;
    if (window.QRCode) new QRCode($('#qr'), { text: url, width: 132, height: 132 }); else $('#qr').style.display = 'none';
    $('#cp').onclick = () => navigator.clipboard && navigator.clipboard.writeText(url).then(() => toast('Join link copied'));
    $('#lock').onclick = () => { g.opts.locked = !g.opts.locked; lobby(); };
    $('#bots').onclick = () => { for (let i = 0; i < 3; i++) addBot(g); };
    $('#st').onclick = () => g.start();
    app.querySelectorAll('[data-kick]').forEach(b => { b.onclick = () => g.kick(b.dataset.kick); });
    if (!Music.timer) Music.loop('lounge');
  };
  const ansBlocks = (q, st) => (q.options || []).map((o, i) => `<div class="ans i${i} ${st && !(st.correct || []).includes(i) && st.scored ? 'dim' : ''} ${st && (st.correct || []).includes(i) ? 'ok' : ''}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></div>`).join('');
  const qHead = q => `${q.emoji ? `<div class="qemoji">${esc(q.emoji)}</div>` : ''}<div class="qtext">${esc(q.text)}</div>${q.image ? `<img class="qimg" src="${esc(q.image)}" alt="" referrerpolicy="no-referrer">` : ''}`;
  const draw = () => {
    clearInterval(window.__zt); const q = g.q;
    if (g.phase === 'lobby') return lobby();
    const ctrl = `<div class="row"><button class="btn sm ghost" id="snd">${Music.on ? '🔊' : '🔇'}</button></div>`;
    if (g.phase === 'get') { Music.stop(); speak(q.text); app.innerHTML = `<div class="center"><div class="mut">Question ${g.i + 1} of ${g.qs.length}${q.points === 2 ? ' · Double points!' : ''}</div><div class="qtext">${esc(q.text)}</div></div>`; return; }
    if (g.phase === 'answer') {
      Music.loop(q.time <= 10); const end = g.started + q.time * 1000;
      const body = q.options ? `<div class="answers">${ansBlocks(q)}</div>` : q.type === 'slider' ? `<div class="card" style="text-align:center;font-size:24px">Slide between ${q.min} and ${q.max}</div>` : q.type === 'order' ? `<div class="order">${q._shuffled.map(x => `<div class="oitem"><span>${esc(x)}</span></div>`).join('')}</div>` : `<div class="card" style="text-align:center;font-size:24px">Players are typing on their phones ✍️</div>`;
      app.innerHTML = `<div class="wrap" style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="hud"><span>${g.i + 1}/${g.qs.length}</span><span id="cnt">0 of ${g.active().length} answered</span><div class="row">${ctrl}<button class="btn sm ghost" id="skip">Skip timer</button><div class="timer" id="tm"><span></span></div></div></div>${qHead(q)}${body}</div>`;
      const tick = () => { const left = Math.max(0, end - Date.now()), el = $('#tm'); if (!el) return; el.style.setProperty('--p', left / (q.time * 10) + '%'); el.firstChild.textContent = Math.ceil(left / 1000); };
      tick(); window.__zt = setInterval(tick, 200);
      $('#skip').onclick = () => g.close(); $('#snd').onclick = () => { Music.on = !Music.on; store.set('sound', Music.on); draw2Snd(); };
      return;
    }
    if (g.phase === 'reveal') {
      Music.stop(); const m = g.last, scored = ZQ.scored(q), max = Math.max(1, ...m.tally);
      const chart = q.options ? `<div class="bars">${m.tally.map((n, i) => `<div class="bar"><span>${n}</span><i class="ans i${i}" style="padding:0;min-height:6px;height:${Math.round(n / max * 100)}%;box-shadow:none"></i></div>`).join('')}</div><div class="answers">${ansBlocks(q, { correct: m.correct, scored })}</div>` : '';
      const extra = q.type === 'type' ? `<div class="card" style="text-align:center;font-size:24px">Accepted: <b>${esc(q.accept.join(', '))}</b></div>` : q.type === 'slider' ? `<div class="card" style="text-align:center;font-size:28px">Answer: <b>${esc(q.answer)}</b></div>` : q.type === 'order' ? `<ol class="card" style="font-size:20px">${q.order.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : q.type === 'cloud' ? cloud(m.words) : '';
      app.innerHTML = `<div class="wrap" style="flex:1;display:flex;flex-direction:column;gap:10px"><div class="hud"><span>${g.i + 1}/${g.qs.length}</span>${scored ? `<span>${m.nRight} of ${m.n} got it right</span>` : '<span>Results</span>'}<button class="btn" id="nx">Next</button></div><div class="qtext">${esc(q.text)}</div>${chart}${extra}</div>`;
      $('#nx').onclick = () => g.board(); if (scored) Music.fx(m.nRight ? 'ok' : 'bad'); return;
    }
    if (g.phase === 'board') {
      const m = g.last, rows = m.teams ? m.teams.map(t => `<div class="rowb"><span>🏅 ${esc(t.name)}</span><span>${t.score}</span></div>`) : m.top.map((p, i) => `<div class="rowb" style="animation-delay:${i * 90}ms"><span>${i + 1}. ${esc(p.avatar)} ${esc(p.name)} ${p.streak > 2 ? '🔥' + p.streak : ''}${p.out ? ' ☠️' : ''}</span><span>${p.score}</span></div>`);
      app.innerHTML = `<div class="wrap" style="flex:1"><div class="hud"><h2>${m.teams ? 'Team scores' : 'Leaderboard'}</h2><button class="btn" id="nx">${g.i + 1 >= g.qs.length ? 'See the podium' : 'Next question'}</button></div><div class="board">${rows.join('')}</div></div>`;
      $('#nx').onclick = () => g.next(); return;
    }
    if (g.phase === 'end') { window.onbeforeunload = null; Music.stop(); endScreen(g); }
  };
  const draw2Snd = () => { const b = $('#snd'); if (b) b.textContent = Music.on ? '🔊' : '🔇'; if (!Music.on) Music.stop(); };
  lobby();
  cur.cleanup = () => { clearTimeout(g.t); net.send('*', { t: 'ended' }); setTimeout(() => net.close(), 100); };
}
const cloud = w => { const e = Object.entries(w || {}), max = Math.max(1, ...e.map(x => x[1])); return `<div class="card cloud">${e.map(([k, n]) => `<span style="font-size:${18 + 34 * n / max}px">${esc(k)}</span>`).join('') || '<span class="mut">No words yet</span>'}</div>`; };
function addBot(g) { const pid = 'bot' + Math.random().toString(36).slice(2); const n = NAMES1[Math.floor(Math.random() * 8)] + ' ' + NAMES2[Math.floor(Math.random() * 8)] + ' 🤖'; const p = g.addPlayer(pid, n, AVATARS[Math.floor(Math.random() * 16)], true); if (p) p.skill = .45 + Math.random() * .4; }
function endScreen(g) {
  const m = g.last, order = [m.top[1], m.top[0], m.top[2]], hts = [120, 180, 90], place = ['🥈', '🥇', '🥉'], titles = ['Runner-up', 'Champion', 'Third place'];
  const hardest = g.log.filter(l => l.scored && l.n).sort((a, b) => a.nRight / a.n - b.nRight / b.n)[0];
  app.innerHTML = `<div class="wrap"><h1 style="text-align:center">${esc(g.quiz.title)}: final results</h1>${m.teams ? `<h2 style="text-align:center">🏆 ${esc(m.teams[0] ? m.teams[0].name : '')} win!</h2>` : ''}
  <p class="announce" id="ann" aria-live="polite">And the results are in…</p>
  <div class="podium">${order.map((p, i) => p ? `<div class="pod hidden" id="pod${i}"><div class="pav">${esc(p.avatar)}</div><div class="ptitle">${titles[i]}</div>${esc(p.name)}<div class="mut">${p.score} points</div><div class="blk" style="height:${hts[i]}px">${place[i]}</div></div>` : '').join('')}</div>
  ${m.awards && m.awards.length ? `<div class="awards">${m.awards.map(a => `<div class="award"><div>${a.icon}</div><b>${esc(a.title)}</b><span>${esc(a.name)}</span><small class="mut">${esc(a.note)}</small></div>`).join('')}</div>` : ''}
  <div class="row" style="justify-content:center;margin:0 0 14px"><button class="btn sm ghost" id="replay">🎬 Replay ceremony</button></div>
  <div class="card"><h3>Report</h3>${hardest ? `<p>Hardest question: <b>${esc(hardest.text)}</b> (${hardest.nRight} of ${hardest.n} right)</p>` : ''}<div class="tbl"><table><tr><th>#</th><th>Question</th><th>Right</th><th>Average time</th></tr>${g.log.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.text)}</td><td>${l.scored ? l.nRight + '/' + l.n : 'n/a'}</td><td>${l.avg}s</td></tr>`).join('')}</table></div><div class="row" style="margin-top:10px"><button class="btn sm" id="csv">Download CSV</button><a class="btn sm ghost" href="#/library">New game</a></div></div></div>`;
  /* Build suspense: third place, then the runner-up, then a roll for the champion. */
  const ceremony = () => {
    [0, 1, 2].forEach(i => { const el = $('#pod' + i); if (el) el.classList.add('hidden'); });
    const reveal = (i, snd, txt) => { const el = $('#pod' + i), a = $('#ann'); if (!el || !a) return; el.classList.remove('hidden'); a.textContent = txt; Music.fx(snd); };
    (cur.ceremony || []).forEach(clearTimeout); cur.ceremony = [];
    const later = (ms, fn) => cur.ceremony.push(setTimeout(fn, ms));
    later(1200, () => reveal(2, 'third', m.top[2] ? 'In third place…' : ''));
    later(3400, () => reveal(0, 'second', m.top[1] ? 'Our runner-up…' : ''));
    later(5600, () => { const a = $('#ann'); if (a) a.textContent = 'And the champion is…'; Music.fx('roll'); });
    later(7000, () => { reveal(1, 'win', m.top[0] ? 'Congratulations, ' + m.top[0].name + '!' : ''); confetti(220); later(1000, () => confetti(120)); });
  };
  $('#replay').onclick = ceremony; ceremony();
  $('#csv').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + g.csv()], { type: 'text/csv' })); a.download = 'zquiz-report.csv'; a.click(); };
}

/* ---------- Player (shared by online play and solo) ---------- */
function playerView(sendUp, soloExit) {
  const P = { me: null, phase: 'wait', q: null, sel: [], picked: false, removed: [], order: null };
  const bar = () => P.me ? `<div class="pbar"><span>${esc(P.me.avatar)} ${esc(P.me.name)}${P.me.team ? ' · ' + esc(P.me.team) : ''}</span><span>${P.me.mode === 'survival' ? '❤️'.repeat(Math.max(0, P.me.lives)) + ' ' : ''}${P.me.streak > 1 ? '🔥' + P.me.streak + ' ' : ''}${P.me.score}</span></div>` : '';
  const rxs = () => soloExit ? '' : `<div class="rxs">${RX.map(e => `<button data-rx="${e}" aria-label="React ${e}">${e}</button>`).join('')}</div>`;
  const say = (big, sub, cls) => { app.innerHTML = `<div class="pscreen">${bar()}<div class="center"><div class="result ${cls || ''}">${big}</div><div class="mut">${sub || ''}</div></div>${rxs()}</div>`; };
  const submit = v => { if (P.picked) return; P.picked = true; sendUp({ t: 'ans', v }); buzz(30); say('Locked in!', 'Waiting for the others…'); };
  const powers = () => { const q = P.q; if (!P.me || !ZQ.scored(q)) return ''; const can = { double: P.me.power.double, half: P.me.power.half && ['quiz', 'tf'].includes(q.type) && q.options.length > 2, shield: P.me.power.shield }; return `<div class="powers"><button class="pw" data-pw="double" ${can.double ? '' : 'disabled'}>✖️2 Double</button><button class="pw" data-pw="half" ${can.half ? '' : 'disabled'}>✂️ 50/50</button><button class="pw" data-pw="shield" ${can.shield ? '' : 'disabled'}>🛡️ Shield</button></div>`; };
  const drawQ = () => {
    const q = P.q; let body = '';
    if (q.options) { const multi = q.type === 'multi'; body = `<div class="answers">${q.options.map((o, i) => `<button class="ans i${i} ${P.removed.includes(i) ? 'gone' : ''} ${P.sel.includes(i) ? 'sel' : ''}" data-a="${i}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>${multi ? '<button class="btn big" id="sm">Submit</button>' : ''}`; }
    else if (q.type === 'type' || q.type === 'cloud') body = `<form id="tf" class="center"><input id="tv" maxlength="60" autocomplete="off" placeholder="Type here" aria-label="Your answer"><button class="btn big">Send</button></form>`;
    else if (q.type === 'slider') { const mid = P.slide == null ? Math.round((q.min + q.max) / 2) : P.slide; body = `<div class="center"><div class="result" id="sv">${mid}</div><input type="range" id="sl" min="${q.min}" max="${q.max}" value="${mid}" aria-label="Your answer"><button class="btn big" id="sm">Submit</button></div>`; }
    else if (q.type === 'order') { P.order = P.order || q.items.slice(); body = `<div class="order grow">${P.order.map((x, i) => `<div class="oitem"><span>${esc(x)}</span><button class="btn sm ghost" data-m="${i},-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-m="${i},1" aria-label="Move down">↓</button></div>`).join('')}</div><button class="btn big" id="sm">Submit</button>`; }
    app.innerHTML = `<div class="pscreen">${bar()}<div class="center" style="flex:none;padding:4px"><b style="font-size:1.15rem">${esc(q.text)}</b></div>${powers()}${body}</div>`;
    const tf = $('#tf'); if (tf) { tf.onsubmit = e => { e.preventDefault(); const v = $('#tv').value.trim(); if (v) submit(v); }; $('#tv').focus(); }
    const sl = $('#sl'); if (sl) sl.oninput = () => { P.slide = +sl.value; $('#sv').textContent = sl.value; };
  };
  app.onclick = e => {
    const t = e.target.closest('button'); if (!t) return; const d = t.dataset;
    if (d.rx) { sendUp({ t: 'react', e: d.rx }); floatRx(d.rx); }
    if (d.pw) { sendUp({ t: 'power', k: d.pw }); t.disabled = true; t.classList.add('on'); toast({ double: 'Double points armed', half: 'Two wrong answers removed', shield: 'Shield up: a miss will not hurt' }[d.pw]); }
    if (d.a != null && P.phase === 'answer') { const i = +d.a; if (P.q.type === 'multi') { P.sel = P.sel.includes(i) ? P.sel.filter(x => x !== i) : P.sel.concat(i); drawQ(); } else submit(i); }
    if (d.m) { const [i, s] = d.m.split(',').map(Number), a = P.order, j = i + s; if (a[j] != null) { [a[i], a[j]] = [a[j], a[i]]; drawQ(); } }
    if (t.id === 'sm') { const q = P.q; if (q.type === 'multi') { if (P.sel.length) submit(P.sel); else toast('Pick at least one.'); } else if (q.type === 'slider') { submit(P.slide == null ? Math.round((q.min + q.max) / 2) : P.slide); } else if (q.type === 'order') submit(P.order); }
  };
  return {
    P,
    onMsg(m) {
      if (m.t === 'welcome') { P.me = m.me; return; }
      if (m.t === 'half') { P.removed = m.remove; drawQ(); return; }
      if (m.t === 'locked') return;
      if (m.t === 'you') {
        P.me = m.me; if (m.final) return;
        if (m.right === null) say('Thanks!', 'Your answer is in.');
        else if (m.right) { Music.fx('ok'); buzz([40, 40, 80]); say('Correct!', '+' + m.gain + (m.me.streak > 1 ? ' · 🔥 ' + m.me.streak + ' streak' : '') + ' · Rank ' + m.me.rank, 'good'); confetti(40); }
        else { Music.fx('bad'); buzz(200); say(m.answered ? 'Not this time' : 'Too slow', (m.me.out ? '☠️ You are out, but stay and watch. ' : '') + 'Rank ' + m.me.rank, 'bad'); }
        return;
      }
      if (m.t !== 'phase') return; P.phase = m.phase;
      if (m.phase === 'lobby') say('You’re in!', 'Look for your name on the big screen 👀');
      if (m.phase === 'get') { P.sel = []; P.picked = false; P.removed = []; P.order = null; P.slide = null; say('Get ready', 'Question ' + (m.idx + 1) + ' of ' + m.total); }
      if (m.phase === 'answer') { P.q = m.q; if (P.me && P.me.out) say('☠️', 'You are out. Enjoy the show!'); else if (!P.picked) drawQ(); }
      if (m.phase === 'board' && P.me) { const leader = m.top && m.top[0]; say('#' + P.me.rank, leader ? 'Leader: ' + esc(leader.name) + ' with ' + leader.score : ''); if (soloExit) setTimeout(() => soloExit.next(), 1800); }
      if (m.phase === 'end') { const r = P.me ? P.me.rank : 0, mine = (m.awards || []).filter(a => P.me && a.name === P.me.name).map(a => a.icon + ' ' + esc(a.title)).join(' · '); if (r <= 3 && r > 0) { Music.fx(r === 1 ? 'win' : r === 2 ? 'second' : 'third'); confetti(r === 1 ? 220 : 90); } say(r === 1 ? '🥇 Champion!' : r === 2 ? '🥈 Runner-up!' : r === 3 ? '🥉 Third place!' : 'Rank #' + r, (P.me ? P.me.score : 0) + ' points' + (mine ? '<br>' + mine : '')); const s = app.querySelector('.pscreen'); if (s) s.insertAdjacentHTML('beforeend', `<a class="btn" href="#/">${soloExit ? 'Back home' : 'Play again'}</a>`); window.onbeforeunload = null; }
    },
    say
  };
}
function join(pin) {
  leave();
  const avatar0 = store.get('avatar', AVATARS[Math.floor(Math.random() * 16)]); let avatar = avatar0;
  const suggest = () => NAMES1[Math.floor(Math.random() * 8)] + ' ' + NAMES2[Math.floor(Math.random() * 8)];
  app.innerHTML = `<div class="center"><div class="logo" style="font-size:48px">ZQuiz</div><p class="mut">Game PIN ${esc(pin)}</p><form class="card joinbox" id="nf"><input id="nn" maxlength="18" placeholder="Nickname" aria-label="Nickname" value="${esc(store.get('name', ''))}"><button type="button" class="btn sm ghost" id="rnd">🎲 Pick a fun name</button><div class="avatars">${AVATARS.map(a => `<button type="button" data-av="${a}" aria-label="Avatar ${a}" class="${a === avatar ? 'on' : ''}">${a}</button>`).join('')}</div><button class="btn big">Join</button></form></div>`;
  $('#rnd').onclick = () => { $('#nn').value = suggest(); };
  app.querySelectorAll('[data-av]').forEach(b => { b.onclick = () => { avatar = b.dataset.av; app.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x === b)); }; });
  $('#nf').onsubmit = e => {
    e.preventDefault(); const name = ZQ.cleanName($('#nn').value); if (!name) return toast('Please choose a nickname.');
    store.set('name', name); store.set('avatar', avatar); Music.ac();
    let id; try { id = sessionStorage.getItem('zq.pid.' + pin); if (!id) { id = 'p' + crypto.randomUUID(); sessionStorage.setItem('zq.pid.' + pin, id); } } catch (x) { id = 'p' + crypto.randomUUID(); }
    let view; const net = new ZQ.Net(pin, 'player', id, m => {
      if (m.t === 'refused') { toast(m.why); net.close(); setTimeout(() => join(pin), 200); return; }
      if (m.t === 'kicked' || m.t === 'ended') { net.close(); app.onclick = null; view.say(m.t === 'kicked' ? 'Removed' : 'Game over', m.t === 'kicked' ? 'The host removed you from this game.' : 'The host has ended the game.'); return; }
      view.onMsg(m);
    }, (s, code) => { if (s === 'rejected') { toast(code === 4004 ? 'No game with that PIN. Check it and try again.' : 'Could not join.'); location.hash = '#/'; } if (s === 'retry') toast('Reconnecting…'); if (s === 'open') net.send({ t: 'hello', name, avatar }); });
    view = playerView(m => net.send(m));
    view.say('Joining…', ''); cur.cleanup = () => { app.onclick = null; net.close(); };
  };
}
/* Solo: same engine in the browser, racing practice bots. */
function solo(id) {
  leave(); const q = findQuiz(id); if (!q) return location.hash = '#/library'; Music.ac();
  let view, g; const pid = 'you';
  const send = (to, m) => { if (to === '*' || to === pid) setTimeout(() => view.onMsg(m), 0); };
  const exit = { next: () => { if (g.phase === 'board') g.next(); } };
  g = new ZQ.Game(q, { mode: 'classic', getMs: 1500 }, send, ev => { if (ev === 'phase' && g.phase === 'reveal') setTimeout(() => { if (g.phase === 'reveal') g.board(); }, 2400); });
  view = playerView(m => g.handle(pid, m), exit);
  g.addPlayer(pid, store.get('name', 'You') || 'You', store.get('avatar', '🦊')); for (let i = 0; i < 4; i++) addBot(g);
  setTimeout(() => g.start(), 300);
  cur.cleanup = () => { clearTimeout(g.t); g.phase = 'end'; app.onclick = null; };
}
/* ---------- Router ---------- */
function route() {
  const h = location.hash.replace(/^#\/?/, ''), [a, b] = h.split('/');
  try {
    if (a === 'library' || a.startsWith('library?')) return library(a.includes('solo'));
    if (a === 'make') return maker(b);
    if (a === 'setup') return setup(b);
    if (a === 'solo') return solo(b);
    if (a === 'join' && /^\d{6}$/.test(b)) return join(b);
    if (a === 'import' && b) { const m = validateQuiz(decodeQ(b)); if (typeof m === 'string') throw new Error(m); m.id = 'q' + Date.now().toString(36); saveQuiz(m); toast('Quiz added to your library'); location.hash = '#/library'; return; }
  } catch (e) { toast('That link did not work.'); }
  home();
}
addEventListener('hashchange', route); route();
