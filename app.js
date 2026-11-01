/* ZQuiz screens: home, library, maker, host, player and solo. */
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get(k, d) { try { const v = localStorage.getItem('zq.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('zq.' + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem('zq.' + k); } catch (e) {} } };
const urlLang = new URLSearchParams(location.search).get('lang');
let lang = ['en', 'bn', 'fr'].includes(urlLang) ? urlLang : store.get('lang', (navigator.language || 'en').slice(0, 2));
if (!['en', 'bn', 'fr'].includes(lang)) lang = 'en';
document.documentElement.lang = lang;
const t = s => (window.ZQ_I18N[lang] && (window.ZQ_I18N[lang][s] || window.ZQ_I18N_MORE[lang][s])) || s;
const toast = m => { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2800); };
const SHAPES = ['★', '⬢', '☾', '⚡'], AVATARS = ['🦊', '🐯', '🐼', '🦄', '🐸', '🐙', '🦉', '🐝', '🚀', '👾', '🤖', '🌟', '🔥', '🌈', '⚽', '🎧'], RX = ['🎉', '🔥', '😂', '😮', '👏', '💜'];
const TYPES = { quiz: 'Multiple choice', tf: 'True or false', multi: 'Pick several', type: 'Type the answer', slider: 'Slider', order: 'Put in order', poll: 'Poll (no score)', cloud: 'Word cloud (no score)' };
const NAMES1 = ['Swift', 'Lucky', 'Cosmic', 'Brave', 'Neon', 'Jolly', 'Mighty', 'Clever'], NAMES2 = ['Tiger', 'Comet', 'Otter', 'Falcon', 'Mango', 'Pixel', 'Rocket', 'Panda'];
const API = window.ZQ_RELAY.replace(/^wss:/, 'https:').replace(/\/$/, '');
const GOOGLE_CLIENT = '263569409532-o59be67f62mk9je2kgerpah84kg8vn4e.apps.googleusercontent.com';
const SAVE_KEY = 'hostgame', THEMES = ['aurora', 'neon', 'sunrise', 'ocean'];
const setTheme = x => { document.documentElement.dataset.theme = x || store.get('theme', 'aurora'); };
let cur = { cleanup: null };
document.documentElement.dataset.theme = store.get('theme', 'aurora');
const leave = () => { setTheme(); if (cur.cleanup) cur.cleanup(); (cur.ceremony || []).forEach(clearTimeout); cur = { cleanup: null }; Music.stop(); clearInterval(window.__zt); app.onclick = app.oninput = null; };
const clip = (text, ok) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(ok), () => prompt(t('Copy this link'), text));

/* Sound: all generated in the browser, so nothing needs downloading. */
const Music = {
  on: store.get('sound', true), ctx: null, timer: null,
  ac() { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  note(f, d, v, type) { const c = this.ac(); if (!c || !this.on) return; const o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v || .05, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + d); },
  /* Original generative pieces: a calm jazz lounge for the lobby, a quiet thinking pulse for questions. */
  hz: m => 440 * 2 ** ((m - 69) / 12),
  chord(ms, d, v) { ms.forEach((m, i) => setTimeout(() => { this.note(this.hz(m), d, v, 'sine'); this.note(this.hz(m) * 2, d * .5, v * .18, 'sine'); }, i * 18)); },
  loop(kind) {
    this.stop(); let b = 0; const lounge = kind === 'lounge';
    const prog = lounge ? [[50, [65, 69, 72, 76]], [55, [65, 69, 71, 76]], [48, [64, 67, 71, 74]], [57, [64, 67, 70, 73]]] : [[45, [64, 69, 72]], [41, [65, 69, 72]], [48, [64, 67, 72]], [43, [62, 67, 71]]];
    const beat = lounge ? 420 : kind ? 300 : 400, melody = [76, 74, 72, 71, 72, 74, 79, 76];
    const step = () => {
      const [root, ch] = prog[Math.floor(b / 4) % prog.length], s = b % 4;
      if (s === 0) this.chord(ch, beat * 3.4 / 1000, lounge ? .022 : .016);
      this.note(this.hz(root + (s === 2 ? 7 : 0)), beat * .9 / 1000, .04, 'sine');
      if (lounge && b % 8 === 2) this.note(this.hz(melody[Math.floor(b / 8) % 8]), .9, .02, 'sine');
      if (!lounge) this.note(this.hz(ch[s % ch.length] + 12), .12, .012, 'triangle');
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
const buzz = p => { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) { try { navigator.vibrate(p); } catch (e) {} } };
const speak = s => { if (store.get('voice', false) && window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(s)); } };

/* Confetti on a canvas; skipped for people who ask for reduced motion. */
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const c = $('#fx'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#ff5470', '#7c4dff', '#00e5c3', '#f59e0b', '#fff'], ps = Array.from({ length: n || 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height / 2, r: 4 + Math.random() * 6, v: 2 + Math.random() * 4, s: Math.random() * 6, col: cols[Math.floor(Math.random() * 5)] }));
  let f = 0; (function draw() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.y += p.v; p.x += Math.sin(p.s + f / 20); x.fillStyle = p.col; x.fillRect(p.x, p.y, p.r, p.r * 1.6); }); if (++f < 240) requestAnimationFrame(draw); else x.clearRect(0, 0, c.width, c.height); })();
}
const floatRx = e => { const d = document.createElement('div'); d.className = 'rx'; d.textContent = e; d.style.left = 5 + Math.random() * 88 + 'vw'; document.body.append(d); setTimeout(() => d.remove(), 2600); };

/* ---------- Sign-in and cloud storage ---------- */
const Auth = {
  token: () => { const a = store.get('auth', null); return a && a.exp > Date.now() ? a.token : null; },
  name: () => { const a = store.get('auth', null); return a && a.exp > Date.now() ? a.name : ''; },
  set(tok) {
    try { const p = JSON.parse(decodeURIComponent(escape(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); store.set('auth', { token: tok, exp: p.exp * 1000, name: p.given_name || p.name || '' }); } catch (e) {}
  },
  out() { store.del('auth'); },
  async call(path, method, body) {
    const tok = this.token(); if (!tok) throw new Error('signin');
    const r = await fetch(API + path, { method: method || 'GET', headers: { Authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { this.out(); throw new Error('signin'); }
    if (!r.ok) throw new Error('server'); return r.json();
  }
};
function signInBlock() {
  if (Auth.token()) return `<div class="row small"><span>✅ ${esc(t('Signed in'))}${Auth.name() ? ': ' + esc(Auth.name()) : ''}</span><button class="btn sm ghost" id="so">${esc(t('Sign out'))}</button></div>`;
  return `<div class="card small"><p style="margin:0 0 8px">${esc(t('Sign in with Google to save quizzes across devices and create answer-free challenge links.'))}</p><div id="gbtn"></div></div>`;
}
function wireSignIn(after) {
  const so = $('#so'); if (so) so.onclick = () => { Auth.out(); after(); };
  const b = $('#gbtn'); if (!b) return;
  const go = () => { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT, callback: r => { Auth.set(r.credential); syncQuizzes().finally(after); } }); google.accounts.id.renderButton(b, { theme: 'filled_blue', size: 'large', locale: lang }); };
  if (window.google && google.accounts) return go();
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go; document.head.append(s);
}
/* Merge by newest edit, so a quiz changed on either device survives. */
async function syncQuizzes() {
  if (!Auth.token()) return;
  const { quizzes } = await Auth.call('/api/quizzes'), local = new Map(myQuizzes().map(q => [q.id, q]));
  const deleted = store.get('deleted', []);
  for (const q of quizzes) { if (deleted.includes(q.id)) continue; const l = local.get(q.id); if (!l || (l.updated || 0) < (q.updated || 0)) local.set(q.id, q); }
  store.set('quizzes', [...local.values()]);
  const remote = new Map(quizzes.map(q => [q.id, q]));
  for (const q of local.values()) { const r = remote.get(q.id); if (!r || (r.updated || 0) < (q.updated || 0)) await Auth.call('/api/quizzes/' + q.id, 'PUT', q); }
  for (const id of deleted) await Auth.call('/api/quizzes/' + id, 'DELETE');
  store.set('deleted', []);
}

/* Saved quizzes */
const myQuizzes = () => store.get('quizzes', []);
const saveQuiz = q => { q.updated = Date.now(); const a = myQuizzes().filter(x => x.id !== q.id); a.unshift(q); store.set('quizzes', a); if (Auth.token()) Auth.call('/api/quizzes/' + q.id, 'PUT', q).catch(() => toast(t('Could not reach the server. Your quiz is saved in this browser.'))); };
const decodeQ = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const findQuiz = id => ZQ_TEMPLATES.concat(myQuizzes()).find(q => q.id === id);
/* Checks a quiz from a file, link or chatbot, and fills in safe defaults. Returns error text or the clean quiz. */
function validateQuiz(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.qs) || !o.qs.length) return 'A quiz needs a "qs" list with at least one question.';
  if (o.qs.length > 100) return 'A quiz can have at most 100 questions.';
  const qs = []; for (let i = 0; i < o.qs.length; i++) {
    const q = o.qs[i], at = t('Question') + ' ' + (i + 1) + ': '; if (!q || !TYPES[q.type]) return at + 'unknown type.'; if (!q.text || typeof q.text !== 'string') return at + 'needs text.';
    const c = { type: q.type, text: q.text.slice(0, 300), time: Math.min(120, Math.max(5, Number(q.time) || 20)) };
    if ([1, 2, 0].includes(q.points)) c.points = q.points; if (q.emoji) c.emoji = [...String(q.emoji)].slice(0, 4).join(''); if (/^https:\/\//.test(q.image || '')) c.image = q.image;
    if (['quiz', 'tf', 'multi', 'poll'].includes(q.type)) { if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) return at + 'needs 2 to 4 options.'; c.options = q.options.map(x => String(x).slice(0, 90)); }
    if (['quiz', 'tf', 'multi'].includes(q.type)) { if (!Array.isArray(q.correct) || !q.correct.length || q.correct.some(x => !Number.isInteger(x) || x < 0 || x >= c.options.length)) return at + 'mark the correct option.'; c.correct = q.correct; }
    if (q.type === 'type') { if (!Array.isArray(q.accept) || !q.accept.length) return at + 'needs accepted answers.'; c.accept = q.accept.map(String); }
    if (q.type === 'slider') { c.min = Number(q.min); c.max = Number(q.max); c.answer = Number(q.answer); c.tolerance = Number(q.tolerance) || 0; if (![c.min, c.max, c.answer].every(Number.isFinite) || c.min >= c.max || c.answer < c.min || c.answer > c.max) return at + 'check the slider numbers.'; }
    if (q.type === 'order') { if (!Array.isArray(q.order) || q.order.length < 2 || q.order.length > 6) return at + 'needs 2 to 6 items.'; c.order = q.order.map(String); }
    qs.push(c);
  }
  const s = o.settings && typeof o.settings === 'object' ? o.settings : {};
  const settings = { mode: ['classic', 'team', 'survival'].includes(s.mode) ? s.mode : 'classic', theme: THEMES.includes(s.theme) ? s.theme : '', count: Math.max(0, Math.floor(Number(s.count)) || 0), shuffle: !!s.shuffle, shuffleOpts: !!s.shuffleOpts, auto: !!s.auto };
  return { id: /^[\w-]{1,40}$/.test(o.id || '') ? o.id : 'q' + Date.now().toString(36), title: String(o.title || 'Untitled quiz').slice(0, 80), emoji: [...String(o.emoji || '🎯')].slice(0, 4).join(''), desc: String(o.desc || '').slice(0, 140), settings, qs };
}

/* ---------- Home ---------- */
const langPick = () => `<select id="lg" aria-label="${esc(t('Language'))}" class="lg">${[['en', 'English'], ['bn', 'বাংলা'], ['fr', 'Français']].map(([k, v]) => `<option value="${k}" ${k === lang ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
const wireLang = () => { const l = $('#lg'); if (l) l.onchange = e => { lang = e.target.value; store.set('lang', lang); document.documentElement.lang = lang; route(); }; };
function home() {
  leave();
  const pin = new URLSearchParams(location.search).get('pin') || '', saved = store.get(SAVE_KEY, null), live = saved && Date.now() - saved.at < 2 * 3600e3;
  const F = [['⚡', '8 question types', 'Choice, slider, order, typing, polls and word clouds'], ['🛡️', 'Power-ups', 'Double points, 50/50 and shield'], ['🎉', 'Live reactions', 'Emoji float across the big screen'], ['☠️', 'Survival and teams', 'Three lives, or play as a squad'], ['🤖', 'Chatbot import', 'Have any AI draft a quiz, then paste it in'], ['📊', 'Reports', 'Hardest questions and a CSV export']];
  app.innerHTML = `<div class="center"><div class="logo">ZQuiz</div><p class="tag">${esc(t('Make a quiz. Share a PIN. Play together.'))}</p>
  ${live ? `<div class="card row" style="justify-content:center"><b>🎮 ${esc(saved.title)}</b><a class="btn sm" href="#/host">${esc(t('Resume your game'))}</a><button class="btn sm ghost" id="dis">${esc(t('Discard'))}</button></div>` : ''}
  <form class="card joinbox" id="jf"><input class="pin" id="jp" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="${esc(t('Game PIN'))}" aria-label="${esc(t('Game PIN'))}" value="${esc(pin)}"><button class="btn big">${esc(t('Enter'))}</button></form>
  <div class="row" style="justify-content:center"><a class="btn" href="#/library">🎮 ${esc(t('Host a game'))}</a><a class="btn ghost" href="#/make">✏️ ${esc(t('Create a quiz'))}</a><a class="btn ghost" href="#/library/solo">🏃 ${esc(t('Play solo'))}</a></div>
  <div class="features">${F.map(f => `<div><b>${f[0]} ${esc(t(f[1]))}</b>${esc(t(f[2]))}</div>`).join('')}</div>
  <div class="row" style="justify-content:center;margin-top:10px"><label class="small">${esc(t('Theme'))} <select id="th">${['aurora', 'neon', 'sunrise', 'ocean'].map(x => `<option ${store.get('theme', 'aurora') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="small">${esc(t('Language'))} ${langPick()}</label></div></div>
  <div class="ft">© ${new Date().getFullYear()} ZyeemZia™ · <a href="https://zyeemzia.com">zyeemzia.com</a> · <a href="https://academy.zyeemzia.com">Academy</a> · <a href="privacy.html">${esc(t('Privacy'))}</a></div>`;
  $('#jf').onsubmit = e => { e.preventDefault(); const p = $('#jp').value.replace(/\D/g, ''); if (p.length !== 6) return toast(t('A game PIN has 6 digits.')); location.hash = '#/join/' + p; };
  $('#th').onchange = e => { document.documentElement.dataset.theme = e.target.value; store.set('theme', e.target.value); };
  wireLang(); const d = $('#dis'); if (d) d.onclick = () => { store.del(SAVE_KEY); home(); };
}
const topbar = r => `<div class="top"><a class="brand" href="#/">ZQuiz</a><div class="row">${r || ''}</div></div>`;

/* ---------- Library ---------- */
function library(solo) {
  leave();
  const draw = () => {
    const card = (q, mine) => `<div class="card qcard"><div class="cover">${esc(q.emoji || '🎯')}</div><h3>${esc(q.title)}</h3><p class="mut small">${q.qs.length} ${esc(t('questions'))}${q.desc ? ' · ' + esc(q.desc) : ''}</p><div class="row">${solo ? '' : `<a class="btn sm" href="#/setup/${esc(q.id)}">${esc(t('Host'))}</a>`}<a class="btn ${solo ? 'sm' : 'sm ghost'}" href="#/solo/${esc(q.id)}">${esc(t('Solo'))}</a>${mine ? `<a class="btn sm ghost" href="#/make/${esc(q.id)}">${esc(t('Edit'))}</a><button class="btn sm ghost" data-share="${esc(q.id)}">${esc(t('Share'))}</button><button class="btn sm ghost" data-del="${esc(q.id)}">${esc(t('Delete'))}</button>` : ''}</div></div>`;
    const mine = myQuizzes();
    app.innerHTML = topbar(`<a class="btn sm" href="#/make">+ ${esc(t('New quiz'))}</a>`) + `<div class="wrap">${ZQ.isLocal() ? '' : signInBlock()}${mine.length ? `<h2>${esc(t('My quizzes'))}</h2><div class="grid">${mine.map(q => card(q, true)).join('')}</div>` : ''}<h2>${esc(t(solo ? 'Choose a quiz to play alone' : 'Ready to play'))}</h2><div class="grid">${ZQ_TEMPLATES.map(q => card(q)).join('')}</div></div>`;
    wireSignIn(draw);
  };
  app.onclick = async e => {
    const s = e.target.dataset && e.target.dataset.share, d = e.target.dataset && e.target.dataset.del;
    if (s) {
      if (!Auth.token()) return toast(t('Please sign in first.'));
      try { const { code } = await Auth.call('/api/publish', 'POST', findQuiz(s)); clip(location.origin + location.pathname + '#/c/' + code, t('Challenge link copied. It contains no answers.')); }
      catch (x) { toast(t(x.message === 'signin' ? 'Sign-in has expired. Please sign in again.' : 'Could not reach the server. Your quiz is saved in this browser.')); draw(); }
    }
    if (d && confirm(t('Delete this quiz?'))) { store.set('quizzes', myQuizzes().filter(x => x.id !== d)); if (Auth.token()) Auth.call('/api/quizzes/' + d, 'DELETE').catch(() => {}); else store.set('deleted', store.get('deleted', []).concat(d)); draw(); }
  };
  draw();
  if (Auth.token()) syncQuizzes().then(() => { if (/^#\/library/.test(location.hash)) draw(); }, () => {});
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
  const fresh = () => 'q' + Date.now().toString(36), base = id && findQuiz(id);
  let quiz = base && myQuizzes().some(q => q.id === id) ? JSON.parse(JSON.stringify(base)) : base ? Object.assign(JSON.parse(JSON.stringify(base)), { id: fresh() }) : { id: fresh(), title: '', emoji: '🎯', qs: [{ type: 'quiz', text: '', options: ['', '', '', ''], correct: [0], time: 20 }] };
  const opts = (q, i) => {
    if (['quiz', 'tf', 'multi', 'poll'].includes(q.type)) return `<div class="two">${q.options.map((o, k) => `<div class="opt">${q.type === 'poll' ? '' : `<input type="checkbox" aria-label="${esc(t('Correct'))}" data-c="${i},${k}" ${(q.correct || []).includes(k) ? 'checked' : ''}>`}<input data-o="${i},${k}" value="${esc(o)}" placeholder="${esc(t('Option'))} ${k + 1}" maxlength="90"></div>`).join('')}</div>`;
    if (q.type === 'type') return `<label>${esc(t('Accepted answers, comma separated'))}<input data-f="${i},accept" value="${esc((q.accept || []).join(', '))}"></label>`;
    if (q.type === 'slider') return `<div class="two">${['min', 'max', 'answer', 'tolerance'].map(k => `<label>${k}<input type="number" data-f="${i},${k}" value="${esc(q[k] == null ? '' : q[k])}"></label>`).join('')}</div>`;
    if (q.type === 'order') return `<label>${esc(t('Items in the right order, one per line'))}<textarea data-f="${i},order">${esc((q.order || []).join('\n'))}</textarea></label>`;
    return `<p class="mut small">${esc(t('Players type a short word. Popular answers grow bigger.'))}</p>`;
  };
  quiz.settings = Object.assign({ mode: 'classic', theme: '', count: 0, shuffle: false, shuffleOpts: false, auto: false }, quiz.settings);
  const draw = () => {
    const S = quiz.settings, flag = (k, l) => `<label class="opt" style="display:flex"><input type="checkbox" data-s="${k}" style="width:24px" ${S[k] ? 'checked' : ''}> ${esc(t(l))}</label>`;
    app.innerHTML = topbar(`<a class="btn sm ghost" href="#/library">${esc(t('Library'))}</a><button class="btn sm" id="save">${esc(t('Save'))}</button>`) + `<div class="wrap">${ZQ.isLocal() ? '' : signInBlock()}<div class="card mq"><div class="two"><label>${esc(t('Quiz title'))}<input id="tt" value="${esc(quiz.title)}" placeholder="${esc(t('My amazing quiz'))}" maxlength="80"></label><label>${esc(t('Cover emoji'))}<input id="te" value="${esc(quiz.emoji)}"></label></div>
    <label>${esc(t('Description'))}<input id="td" value="${esc(quiz.desc || '')}" maxlength="140"></label>
    <h3>${esc(t('Game settings'))}</h3><div class="two"><label>${esc(t('Game mode'))}<select data-s="mode">${[['classic', 'Classic: highest score wins'], ['team', 'Teams: four squads, average score'], ['survival', 'Survival: three lives each']].map(([k, v]) => `<option value="${k}" ${S.mode === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select></label><label>${esc(t('Theme'))}<select data-s="theme"><option value="">${esc(t('Player’s choice'))}</option>${THEMES.map(x => `<option ${S.theme === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>${esc(t('Questions per game (0 = all)'))}<input type="number" min="0" max="${quiz.qs.length}" data-s="count" value="${S.count}"></label><label>${esc(t('Set all questions to seconds'))}<input type="number" min="5" max="120" id="allt" placeholder="20"></label></div>${flag('shuffle', 'Shuffle questions')}${flag('shuffleOpts', 'Shuffle answer options')}${flag('auto', 'Auto-advance, with no host clicks')}<p class="small mut" style="margin:0">${quiz.qs.length} ${esc(t('questions'))}</p></div>
    <div class="card mq">
    <details><summary>🤖 ${esc(t('Draft with any AI chatbot, or import a file'))}</summary><p class="small mut">${esc(t('Copy this prompt into a chatbot, then paste its reply below. Check the facts before you play.'))}</p><textarea readonly id="aip">${esc(AI_PROMPT)}</textarea><div class="row"><button class="btn sm ghost" id="copy">${esc(t('Copy prompt'))}</button></div><label style="margin-top:8px">${esc(t('Paste the quiz JSON'))}<textarea id="pj"></textarea></label><input type="file" id="pf" accept=".json,application/json" aria-label="${esc(t('Import'))}" style="margin-top:8px"><div class="row" style="margin-top:8px"><button class="btn sm" id="imp">${esc(t('Import'))}</button><button class="btn sm ghost" id="exp">${esc(t('Download this quiz'))}</button></div></details></div>
    ${quiz.qs.map((q, i) => `<div class="card mq"><div class="row"><b class="grow">${esc(t('Question'))} ${i + 1}</b><button class="btn sm ghost" data-up="${i}" aria-label="Move up">↑</button><button class="btn sm ghost" data-dup="${i}">${esc(t('Duplicate'))}</button><button class="btn sm ghost" data-rm="${i}">${esc(t('Remove'))}</button></div>
    <label>${esc(t('Question'))}<input data-f="${i},text" value="${esc(q.text)}" maxlength="300"></label>
    <div class="two"><label>${esc(t('Type'))}<select data-type="${i}">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select></label><label>${esc(t('Seconds'))}<input type="number" min="5" max="120" data-f="${i},time" value="${q.time}"></label>${['poll', 'cloud'].includes(q.type) ? '' : `<label>${esc(t('Points'))}<select data-f="${i},points"><option value="1" ${q.points !== 2 && q.points !== 0 ? 'selected' : ''}>${esc(t('Standard'))}</option><option value="2" ${q.points === 2 ? 'selected' : ''}>${esc(t('Double'))}</option><option value="0" ${q.points === 0 ? 'selected' : ''}>${esc(t('None'))}</option></select></label>`}<label>${esc(t('Emoji (optional)'))}<input data-f="${i},emoji" value="${esc(q.emoji || '')}"></label></div>
    <label>${esc(t('Image link (optional, https)'))}<input data-f="${i},image" value="${esc(q.image || '')}"></label>${opts(q, i)}</div>`).join('')}
    <button class="btn ghost" id="add">+ ${esc(t('Add question'))}</button></div>`;
    const pf = $('#pf'); if (pf) pf.onchange = async () => { if (pf.files[0]) { $('#pj').value = await pf.files[0].text(); doImport(); } };
    wireSignIn(draw);
  };
  const doImport = () => { try { const m = validateQuiz(JSON.parse($('#pj').value.replace(/^\s*```(json)?|```\s*$/g, ''))); if (typeof m === 'string') return toast(m); m.id = quiz.id; quiz = m; draw(); toast(t('Imported questions. Check them, then save.')); } catch (x) { toast(t('Not valid JSON.')); } };
  const defaults = k => ({ quiz: { options: ['', '', '', ''], correct: [0] }, tf: { options: [t('True') === 'True' ? 'True' : t('True'), 'False'], correct: [0] }, multi: { options: ['', '', '', ''], correct: [0, 1] }, poll: { options: ['', ''] }, type: { accept: [] }, slider: { min: 0, max: 100, answer: 50, tolerance: 0 }, order: { order: [] }, cloud: {} })[k];
  app.oninput = e => {
    const d = e.target.dataset; if (e.target.id === 'tt') quiz.title = e.target.value; if (e.target.id === 'te') quiz.emoji = e.target.value; if (e.target.id === 'td') quiz.desc = e.target.value;
    if (d.s) quiz.settings[d.s] = e.target.type === 'checkbox' ? e.target.checked : d.s === 'count' ? Number(e.target.value) || 0 : e.target.value;
    if (e.target.id === 'allt') { const n = Number(e.target.value); if (n >= 5 && n <= 120) { quiz.qs.forEach(q => { q.time = n; }); app.querySelectorAll('[data-f$=",time"]').forEach(x => { x.value = n; }); } }
    if (d.o) { const [i, k] = d.o.split(','); quiz.qs[i].options[k] = e.target.value; }
    if (d.c) { const [i, k] = d.c.split(',').map(Number), q = quiz.qs[i]; if (q.type === 'multi') { q.correct = e.target.checked ? [...new Set(q.correct.concat(k))] : q.correct.filter(x => x !== k); } else { q.correct = [k]; app.querySelectorAll(`[data-c^="${i},"]`).forEach(x => { x.checked = x === e.target; }); } }
    if (d.f) { const [i, k] = d.f.split(','), q = quiz.qs[i], v = e.target.value; if (k === 'accept') q.accept = v.split(',').map(s => s.trim()).filter(Boolean); else if (k === 'order') q.order = v.split('\n').map(s => s.trim()).filter(Boolean); else if (['time', 'min', 'max', 'answer', 'tolerance', 'points'].includes(k)) q[k] = Number(v); else q[k] = v; }
    if (d.type) { const q = quiz.qs[d.type]; quiz.qs[d.type] = Object.assign({ type: e.target.value, text: q.text, time: q.time, emoji: q.emoji, image: q.image }, defaults(e.target.value)); draw(); }
  };
  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset, bid = b.id;
    if (bid === 'add') { quiz.qs.push({ type: 'quiz', text: '', options: ['', '', '', ''], correct: [0], time: 20 }); draw(); }
    if (d.dup != null) { if (quiz.qs.length < 100) { quiz.qs.splice(+d.dup + 1, 0, JSON.parse(JSON.stringify(quiz.qs[+d.dup]))); draw(); } }
    if (d.rm != null) { if (quiz.qs.length > 1) { quiz.qs.splice(+d.rm, 1); draw(); } }
    if (d.up != null && +d.up > 0) { const a = quiz.qs, n = +d.up; [a[n - 1], a[n]] = [a[n], a[n - 1]]; draw(); }
    if (bid === 'copy') clip(AI_PROMPT, t('Prompt copied'));
    if (bid === 'imp') doImport();
    if (bid === 'exp') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(quiz, null, 1)], { type: 'application/json' })); a.download = (quiz.title || 'quiz').replace(/[^\wঀ-৿ -]/g, '') + '.json'; a.click(); }
    if (bid === 'save') {
      const n1 = quiz.qs.findIndex(q => q.options && q.options.some(o => !o.trim())); if (n1 >= 0) return toast(t('Has an empty option:') + ' ' + (n1 + 1));
      const n2 = quiz.qs.findIndex(q => !q.text.trim()); if (n2 >= 0) return toast(t('Needs text:') + ' ' + (n2 + 1));
      const m = validateQuiz(quiz); if (typeof m === 'string') return toast(m); m.id = quiz.id; if (m.settings.count > m.qs.length) m.settings.count = 0; saveQuiz(m); toast(t('Saved')); location.hash = '#/library';
    }
  };
  draw();
}

/* ---------- Host ---------- */
function setup(id) {
  leave(); const q = findQuiz(id); if (!q) { location.hash = '#/library'; return; }
  const m = Object.assign({ mode: 'classic', auto: false, shuffle: false, shuffleOpts: false, count: 0 }, store.get('hostopts', {}), q.settings), n = q.qs.length;
  const check = (i, s) => `<label class="opt" style="display:flex"><input type="checkbox" id="${i}" style="width:24px"> ${esc(t(s))}</label>`;
  app.innerHTML = topbar() + `<div class="center"><div class="cover" style="font-size:56px">${esc(q.emoji)}</div><h1>${esc(q.title)}</h1><div class="card joinbox" style="text-align:left">
  <label>${esc(t('Game mode'))}<select id="mode"><option value="classic">${esc(t('Classic: highest score wins'))}</option><option value="team">${esc(t('Teams: four squads, average score'))}</option><option value="survival">${esc(t('Survival: three lives each'))}</option></select></label>
  <div class="two"><label>${esc(t('Number of questions'))} (1–${n})<input type="number" id="cnt" min="1" max="${n}" value="${m.count > 0 && m.count <= n ? m.count : n}"></label><label>${esc(t('Seconds per question (blank = as set)'))}<input type="number" id="secs" min="5" max="120"></label></div>
  ${check('auto', 'Auto-advance, with no host clicks')}${check('shuf', 'Shuffle questions')}${check('shufo', 'Shuffle answer options')}${check('voice', 'Read questions aloud')}${check('snd', 'Music and sound effects')}
  <button class="btn big" id="go">${esc(t('Open lobby'))}</button></div></div>`;
  $('#mode').value = m.mode; $('#auto').checked = m.auto; $('#shuf').checked = m.shuffle; $('#shufo').checked = m.shuffleOpts; $('#voice').checked = store.get('voice', false); $('#snd').checked = Music.on;
  $('#go').onclick = () => { const o = { mode: $('#mode').value, auto: $('#auto').checked, shuffle: $('#shuf').checked, shuffleOpts: $('#shufo').checked }; store.set('hostopts', o); o.count = Math.min(n, Math.max(1, Math.floor(Number($('#cnt').value)) || n)); const sec = Number($('#secs').value); if (sec) o.time = Math.min(120, Math.max(5, sec)); if (q.settings && q.settings.theme) o.theme = q.settings.theme; store.set('voice', $('#voice').checked); Music.on = $('#snd').checked; store.set('sound', Music.on); Music.ac(); host(q, o); };
}
function host(quiz, opts, saved) {
  leave(); if (location.hash !== '#/host') history.replaceState(null, '', '#/host');
  const newPin = () => String(100000 + Math.floor(Math.random() * 900000));
  let pin = saved ? saved.pin : newPin(), net, g, attempts = 0, resumed = false; const hostId = saved ? saved.hostId : 'h' + crypto.randomUUID().replace(/-/g, '');
  const send = (to, m) => net && net.send(to, m);
  const persist = () => { if (g.phase === 'end') store.del(SAVE_KEY); else store.set(SAVE_KEY, { at: Date.now(), pin, hostId, title: quiz.title, game: g.snapshot() }); };
  const onChange = (ev, x) => {
    if (ev === 'react') return floatRx(x);
    persist();
    if (ev === 'join') { Music.fx('join'); if (g.phase === 'lobby') lobby(); return; }
    if (ev === 'leave') { if (g.phase === 'lobby') lobby(); return; }
    if (ev === 'answer') { const el = $('#cnt'); if (el) el.textContent = g.answers.size + ' ' + t('of') + ' ' + g.active().length + ' ' + t('answered'); return; }
    draw();
  };
  g = saved ? ZQ.Game.restore(saved.game, send, onChange) : new ZQ.Game(quiz, opts, send, onChange);
  setTheme(g.opts.theme);
  const connect = () => { net = new ZQ.Net(pin, 'host', hostId, (from, m) => { if (m && m.t === 'gone') { const p = g.players.get(from); if (p) p.connected = false; return; } g.handle(from, m); }, (s, code) => {
    if (s === 'rejected' && code === 4001) { if (saved) { store.del(SAVE_KEY); location.hash = '#/'; return; } if (attempts++ < 5) { net.close(); pin = newPin(); connect(); lobby(); } }
    if (s === 'retry') toast(t('Reconnecting…'));
    if (s === 'open' && saved && !resumed) { resumed = true; g.resume(); draw(); }
  }); };
  const endGame = () => { if (confirm(t('End this game for everyone?'))) { send('*', { t: 'ended' }); store.del(SAVE_KEY); setTimeout(() => { location.hash = '#/library'; }, 100); } };
  app.onclick = e => { const b = e.target.closest('button'); if (b && b.id === 'endg') endGame(); };
  const lobby = () => {
    const url = location.origin + location.pathname + '?' + (location.search.includes('local=1') ? 'local=1&' : '') + 'pin=' + pin + '#/join/' + pin;
    app.innerHTML = `<div class="wrap"><div class="card lobbyhead"><div><div class="mut">${esc(t('Join at'))} <b>${esc(location.host)}</b> ${esc(t('with PIN'))}</div><div class="bigpin" id="pin">${pin.slice(0, 3)} ${pin.slice(3)}</div><div class="row"><button class="btn sm ghost" id="cp">${esc(t('Copy join link'))}</button><button class="btn sm ghost" id="lock">${g.opts.locked ? '🔒 ' + esc(t('Locked')) : '🔓 ' + esc(t('Lock game'))}</button><button class="btn sm ghost" id="bots">${esc(t('+ 3 practice bots'))}</button><button class="btn sm ghost" id="endg">${esc(t('End game'))}</button></div></div><div id="qr" role="img" aria-label="QR code"></div></div>
    <h2 style="text-align:center;margin-top:14px">${g.players.size} ${esc(t('players'))} · ${esc(quiz.title)}</h2><div class="players">${g.list().map(p => `<button class="chip" data-kick="${esc(p.pid)}">${esc(p.avatar)} ${esc(p.name)}</button>`).join('') || `<span class="mut">${esc(t('Waiting for players…'))}</span>`}</div>
    <div style="text-align:center"><button class="btn big" id="st" ${g.players.size ? '' : 'disabled'}>${esc(t('Start game'))}</button><p class="small mut">${esc(t('Click a name to remove a player.'))}</p></div></div>`;
    if (window.QRCode) new QRCode($('#qr'), { text: url, width: 132, height: 132 }); else $('#qr').style.display = 'none';
    $('#cp').onclick = () => clip(url, t('Join link copied'));
    $('#lock').onclick = () => { g.opts.locked = !g.opts.locked; persist(); lobby(); };
    $('#bots').onclick = () => { for (let i = 0; i < 3; i++) addBot(g); };
    $('#st').onclick = () => g.start();
    app.querySelectorAll('[data-kick]').forEach(b => { b.onclick = () => { if (confirm(t('Remove this player from the game?'))) g.kick(b.dataset.kick); }; });
    if (!Music.timer) Music.loop('lounge');
  };
  const ansBlocks = (q, st) => (q.options || []).map((o, i) => `<div class="ans i${i} ${st && st.correct && !st.correct.includes(i) && st.scored ? 'dim' : ''} ${st && (st.correct || []).includes(i) ? 'ok' : ''}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></div>`).join('');
  const qHead = q => `${q.emoji ? `<div class="qemoji">${esc(q.emoji)}</div>` : ''}<div class="qtext">${esc(q.text)}</div>${q.image ? `<img class="qimg" src="${esc(q.image)}" alt="" referrerpolicy="no-referrer">` : ''}`;
  const draw = () => {
    clearInterval(window.__zt); const q = g.q;
    if (g.phase === 'lobby') return lobby();
    if (g.phase === 'closing') return;
    if (g.phase === 'get') { Music.stop(); speak(q.text); app.innerHTML = `<div class="center"><div class="mut">${esc(t('Question'))} ${g.i + 1} ${esc(t('of'))} ${g.qs.length}${q.points === 2 ? ' · ' + esc(t('Double points!')) : ''}</div><div class="qtext">${esc(q.text)}</div></div>`; return; }
    if (g.phase === 'answer') {
      Music.loop(q.time <= 10); const end = g.started + q.time * 1000;
      const body = q.options ? `<div class="answers">${ansBlocks(q)}</div>` : q.type === 'slider' ? `<div class="card" style="text-align:center;font-size:24px">${esc(t('Slide between'))} ${q.min} ${esc(t('and'))} ${q.max}</div>` : q.type === 'order' ? `<div class="order">${q._shuffled.map(x => `<div class="oitem"><span>${esc(x)}</span></div>`).join('')}</div>` : `<div class="card" style="text-align:center;font-size:24px">${esc(t('Players are typing on their phones'))} ✍️</div>`;
      app.innerHTML = `<div class="wrap" style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="hud"><span>${g.i + 1}/${g.qs.length}</span><span id="cnt">${g.answers.size} ${esc(t('of'))} ${g.active().length} ${esc(t('answered'))}</span><div class="row"><button class="btn sm ghost" id="snd" aria-label="Sound">${Music.on ? '🔊' : '🔇'}</button><button class="btn sm ghost" id="skip">${esc(t('Skip timer'))}</button><button class="btn sm ghost" id="endg">${esc(t('End game'))}</button><div class="timer" id="tm"><span></span></div></div></div>${qHead(q)}${body}</div>`;
      const tick = () => { const left = Math.max(0, end - Date.now()), el = $('#tm'); if (!el) return; el.style.setProperty('--p', left / (q.time * 10) + '%'); el.firstChild.textContent = Math.ceil(left / 1000); };
      tick(); window.__zt = setInterval(tick, 200);
      $('#skip').onclick = () => g.close();
      $('#snd').onclick = () => { Music.on = !Music.on; store.set('sound', Music.on); $('#snd').textContent = Music.on ? '🔊' : '🔇'; };
      return;
    }
    if (g.phase === 'reveal') {
      Music.stop(); const m = g.last, scored = ZQ.scored(q), max = Math.max(1, ...m.tally);
      const chart = q.options ? `<div class="bars">${m.tally.map((n, i) => `<div class="bar"><span>${n}</span><i class="ans i${i}" style="padding:0;min-height:6px;height:${Math.round(n / max * 100)}%;box-shadow:none"></i></div>`).join('')}</div><div class="answers">${ansBlocks(q, { correct: m.correct, scored })}</div>` : '';
      const extra = q.type === 'type' ? `<div class="card" style="text-align:center;font-size:24px">${esc(t('Accepted:'))} <b>${esc(q.accept.join(', '))}</b></div>` : q.type === 'slider' ? `<div class="card" style="text-align:center;font-size:28px">${esc(t('Answer:'))} <b>${esc(q.answer)}</b></div>` : q.type === 'order' ? `<ol class="card" style="font-size:20px">${q.order.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : q.type === 'cloud' ? cloud(m.words) : '';
      app.innerHTML = `<div class="wrap" style="flex:1;display:flex;flex-direction:column;gap:10px"><div class="hud"><span>${g.i + 1}/${g.qs.length}</span>${scored ? `<span>${m.nRight} ${esc(t('of'))} ${m.n} ${esc(t('got it right'))}</span>` : `<span>${esc(t('Results'))}</span>`}<button class="btn" id="nx">${esc(t('Next'))}</button></div><div class="qtext">${esc(q.text)}</div>${chart}${extra}</div>`;
      $('#nx').onclick = () => g.board(); if (scored) Music.fx(m.nRight ? 'ok' : 'bad'); return;
    }
    if (g.phase === 'board') {
      const m = g.last, rows = m.teams ? m.teams.map(x => `<div class="rowb"><span>🏅 ${esc(t(x.name))}</span><span>${x.score}</span></div>`) : m.top.map((p, i) => `<div class="rowb" style="animation-delay:${i * 90}ms"><span>${i + 1}. ${esc(p.avatar)} ${esc(p.name)} ${p.streak > 2 ? '🔥' + p.streak : ''}${p.out ? ' ☠️' : ''}</span><span>${p.score}</span></div>`);
      app.innerHTML = `<div class="wrap" style="flex:1"><div class="hud"><h2>${esc(t(m.teams ? 'Team scores' : 'Leaderboard'))}</h2><button class="btn" id="nx">${esc(t(g.i + 1 >= g.qs.length ? 'See the podium' : 'Next question'))}</button></div><div class="board">${rows.join('')}</div></div>`;
      $('#nx').onclick = () => g.next(); return;
    }
    if (g.phase === 'end') { Music.stop(); endScreen(g); }
  };
  connect();
  if (!saved) lobby();
  cur.cleanup = () => { clearTimeout(g.t); persist(); setTimeout(() => net.close(), 100); };
}
const cloud = w => { const e = Object.entries(w || {}), max = Math.max(1, ...e.map(x => x[1])); return `<div class="card cloud">${e.map(([k, n]) => `<span style="font-size:${18 + 34 * n / max}px">${esc(k)}</span>`).join('') || `<span class="mut">${esc(t('No words yet'))}</span>`}</div>`; };
function addBot(g) { const pid = 'bot' + Math.random().toString(36).slice(2); const n = NAMES1[Math.floor(Math.random() * 8)] + ' ' + NAMES2[Math.floor(Math.random() * 8)] + ' 🤖'; const p = g.addPlayer(pid, n, AVATARS[Math.floor(Math.random() * 16)], true); if (p) p.skill = .45 + Math.random() * .4; }
const AWARD = { fast: ['Fastest Thinker', n => n + t('s average when right')], streak: ['Longest Streak', n => n + ' ' + t('in a row')], sharp: ['Sharpest Mind', n => n + ' ' + t('correct')], comeback: ['Great Comeback', () => t('Strongest second half')] };
function endScreen(g) {
  const m = g.last, order = [m.top[1], m.top[0], m.top[2]], hts = [120, 180, 90], place = ['🥈', '🥇', '🥉'], titles = ['Runner-up', 'Champion', 'Third place'];
  const hardest = g.log.filter(l => l.scored && l.n).sort((a, b) => a.nRight / a.n - b.nRight / b.n)[0];
  app.innerHTML = `<div class="wrap"><h1 style="text-align:center">${esc(g.quiz.title)}: ${esc(t('final results'))}</h1>${m.teams && m.teams[0] ? `<h2 style="text-align:center">🏆 ${esc(t(m.teams[0].name))} ${esc(t('win!'))}</h2>` : ''}
  <p class="announce" id="ann" aria-live="polite">${esc(t('And the results are in…'))}</p>
  <div class="podium">${order.map((p, i) => p ? `<div class="pod hidden" id="pod${i}"><div class="pav">${esc(p.avatar)}</div><div class="ptitle">${esc(t(titles[i]))}</div>${esc(p.name)}<div class="mut">${p.score} ${esc(t('points'))}</div><div class="blk" style="height:${hts[i]}px">${place[i]}</div></div>` : '').join('')}</div>
  ${m.awards && m.awards.length ? `<div class="awards">${m.awards.map(a => `<div class="award"><div>${a.icon}</div><b>${esc(t(AWARD[a.k][0]))}</b><span>${esc(a.name)}</span><small class="mut">${esc(AWARD[a.k][1](a.n))}</small></div>`).join('')}</div>` : ''}
  <div class="row" style="justify-content:center;margin:0 0 14px"><button class="btn sm ghost" id="replay">🎬 ${esc(t('Replay ceremony'))}</button></div>
  <div class="card"><h3>${esc(t('Report'))}</h3>${hardest ? `<p>${esc(t('Hardest question:'))} <b>${esc(hardest.text)}</b> (${hardest.nRight}/${hardest.n})</p>` : ''}<div class="tbl"><table><tr><th>#</th><th>${esc(t('Question'))}</th><th>${esc(t('Right'))}</th><th>${esc(t('Average time'))}</th></tr>${g.log.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.text)}</td><td>${l.scored ? l.nRight + '/' + l.n : '–'}</td><td>${l.avg}s</td></tr>`).join('')}</table></div><div class="row" style="margin-top:10px"><button class="btn sm" id="csv">${esc(t('Download CSV'))}</button><a class="btn sm ghost" href="#/library">${esc(t('New game'))}</a></div></div></div>`;
  /* Build suspense: third place, then the runner-up, then a roll for the champion. */
  const ceremony = () => {
    [0, 1, 2].forEach(i => { const el = $('#pod' + i); if (el) el.classList.add('hidden'); });
    (cur.ceremony || []).forEach(clearTimeout); cur.ceremony = [];
    const reveal = (i, snd, txt) => { const el = $('#pod' + i), a = $('#ann'); if (!el || !a) return; el.classList.remove('hidden'); a.textContent = txt; Music.fx(snd); };
    const later = (ms, fn) => cur.ceremony.push(setTimeout(fn, ms));
    later(1200, () => reveal(2, 'third', t('In third place…')));
    later(3400, () => reveal(0, 'second', t('Our runner-up…')));
    later(5600, () => { const a = $('#ann'); if (a) a.textContent = t('And the champion is…'); Music.fx('roll'); });
    later(7000, () => { if (!m.top[0]) return; reveal(1, 'win', t('Congratulations,') + ' ' + m.top[0].name + '!'); confetti(220); later(1000, () => confetti(120)); });
  };
  $('#replay').onclick = ceremony; ceremony();
  $('#csv').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + g.csv()], { type: 'text/csv' })); a.download = 'zquiz-report.csv'; a.click(); };
}

/* ---------- Player (shared by online play and solo) ---------- */
function playerView(sendUp, soloExit) {
  const P = { me: null, phase: 'wait', q: null, sel: [], picked: false, removed: [], order: null };
  const bar = () => P.me ? `<div class="pbar"><span>${esc(P.me.avatar)} ${esc(P.me.name)}${P.me.team ? ' · ' + esc(t(P.me.team)) : ''}</span><span>${P.me.mode === 'survival' ? '❤️'.repeat(Math.max(0, P.me.lives)) + ' ' : ''}${P.me.streak > 1 ? '🔥' + P.me.streak + ' ' : ''}${P.me.score}</span></div>` : '';
  const rxs = () => soloExit ? '' : `<div class="rxs">${RX.map(e => `<button data-rx="${e}" aria-label="${e}">${e}</button>`).join('')}</div>`;
  const say = (big, sub, cls) => { app.innerHTML = `<div class="pscreen">${bar()}<div class="center"><div class="result ${cls || ''}">${esc(big)}</div><div class="mut">${sub || ''}</div></div>${rxs()}</div>`; };
  const submit = v => { if (P.picked) return; P.picked = true; sendUp({ t: 'ans', v }); buzz(30); say(t('Locked in!'), esc(t('Waiting for the others…'))); };
  const powers = () => { const q = P.q; if (!P.me || !ZQ.scored(q)) return ''; const can = { double: P.me.power.double, half: P.me.power.half && ['quiz', 'tf'].includes(q.type) && q.options.length > 2, shield: P.me.power.shield }; return `<div class="powers"><button class="pw" data-pw="double" ${can.double ? '' : 'disabled'}>✖️2 ${esc(t('Double'))}</button><button class="pw" data-pw="half" ${can.half ? '' : 'disabled'}>✂️ 50/50</button><button class="pw" data-pw="shield" ${can.shield ? '' : 'disabled'}>🛡️ ${esc(t('Shield'))}</button></div>`; };
  const drawQ = () => {
    const q = P.q; let body = '';
    if (q.options) { const multi = q.type === 'multi'; body = `<div class="answers">${q.options.map((o, i) => `<button class="ans i${i} ${P.removed.includes(i) ? 'gone' : ''} ${P.sel.includes(i) ? 'sel' : ''}" data-a="${i}"><span class="sh">${SHAPES[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>${multi ? `<button class="btn big" id="sm">${esc(t('Submit'))}</button>` : ''}`; }
    else if (q.type === 'type' || q.type === 'cloud') body = `<form id="tf" class="center"><input id="tv" maxlength="60" autocomplete="off" placeholder="${esc(t('Type here'))}" aria-label="${esc(t('Your answer'))}"><button class="btn big">${esc(t('Send'))}</button></form>`;
    else if (q.type === 'slider') { const mid = P.slide == null ? Math.round((q.min + q.max) / 2) : P.slide; body = `<div class="center"><div class="result" id="sv">${mid}</div><input type="range" id="sl" min="${q.min}" max="${q.max}" value="${mid}" aria-label="${esc(t('Your answer'))}"><button class="btn big" id="sm">${esc(t('Submit'))}</button></div>`; }
    else if (q.type === 'order') { P.order = P.order || (q.items || []).slice(); body = `<div class="order grow">${P.order.map((x, i) => `<div class="oitem"><span>${esc(x)}</span><button class="btn sm ghost" data-m="${i},-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-m="${i},1" aria-label="Move down">↓</button></div>`).join('')}</div><button class="btn big" id="sm">${esc(t('Submit'))}</button>`; }
    const left = Math.max(0, P.endAt - Date.now());
    app.innerHTML = `<div class="pscreen">${bar()}<div class="tbar" aria-hidden="true"><i style="animation-duration:${left}ms"></i></div><div class="center" style="flex:none;padding:4px">${q.emoji ? `<div style="font-size:34px">${esc(q.emoji)}</div>` : ''}<b style="font-size:1.15rem">${esc(q.text)}</b></div>${powers()}${body}</div>`;
    const tf = $('#tf'); if (tf) { tf.onsubmit = e => { e.preventDefault(); const v = $('#tv').value.trim(); if (v) submit(v); }; $('#tv').focus(); }
    const sl = $('#sl'); if (sl) sl.oninput = () => { P.slide = +sl.value; $('#sv').textContent = sl.value; };
  };
  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.rx) { sendUp({ t: 'react', e: d.rx }); floatRx(d.rx); }
    if (d.pw && !P.picked) { sendUp({ t: 'power', k: d.pw }); b.disabled = true; b.classList.add('on'); toast(t({ double: 'Double points armed', half: 'Two wrong answers removed', shield: 'Shield up: a miss will not hurt' }[d.pw])); }
    if (d.a != null && P.phase === 'answer') { const i = +d.a; if (P.q.type === 'multi') { P.sel = P.sel.includes(i) ? P.sel.filter(x => x !== i) : P.sel.concat(i); drawQ(); } else submit(i); }
    if (d.m) { const [i, s] = d.m.split(',').map(Number), a = P.order, j = i + s; if (a[j] != null) { [a[i], a[j]] = [a[j], a[i]]; drawQ(); } }
    if (b.id === 'sm') { const q = P.q; if (q.type === 'multi') { if (P.sel.length) submit(P.sel); else toast(t('Pick at least one.')); } else if (q.type === 'slider') { submit(P.slide == null ? Math.round((q.min + q.max) / 2) : P.slide); } else if (q.type === 'order') submit(P.order); }
  };
  const rankLine = () => t('Rank') + ' ' + P.me.rank;
  return {
    P,
    onMsg(m) {
      if (m.t === 'welcome') { P.me = m.me; if (m.me.theme) setTheme(m.me.theme); return; }
      if (m.t === 'half') { P.removed = m.remove; drawQ(); return; }
      if (m.t === 'locked') { if (P.phase === 'answer' && !P.picked) { P.picked = true; say(t('Locked in!'), esc(t('Waiting for the others…'))); } return; }
      if (m.t === 'you') {
        P.me = m.me;
        if (m.right === null) say(t('Thanks!'), esc(t('Your answer is in.')));
        else if (m.right) { Music.fx('ok'); buzz([40, 40, 80]); say(t('Correct!'), esc('+' + m.gain + (m.me.streak > 1 ? ' · 🔥 ' + m.me.streak + ' ' + t('streak') : '') + ' · ' + rankLine()), 'good'); confetti(40); }
        else { Music.fx('bad'); buzz(200); say(t(m.answered ? 'Not this time' : 'Too slow'), esc((m.me.out ? t('You are out, but stay and watch.') + ' ' : '') + rankLine()), 'bad'); }
        return;
      }
      if (m.t !== 'phase') return; const first = P.phase === 'wait'; P.phase = m.phase;
      if (m.phase === 'reveal' && first && P.me) say('#' + P.me.rank, esc(P.me.score + ' ' + t('points')));
      if (m.phase === 'lobby') say(t('You’re in!'), esc(t('Look for your name on the big screen')) + ' 👀');
      if (m.phase === 'get') { P.sel = []; P.picked = false; P.removed = []; P.order = null; P.slide = null; say(t('Get ready'), esc(t('Question') + ' ' + (m.idx + 1) + ' ' + t('of') + ' ' + m.total)); }
      if (m.phase === 'answer') { P.q = m.q; P.endAt = Date.now() + (m.endsIn || m.q.time * 1000); if (P.me && P.me.out) say('☠️', esc(t('You are out. Enjoy the show!'))); else if (!P.picked) drawQ(); }
      if (m.phase === 'board' && P.me) { const l = m.top && m.top[0]; say('#' + P.me.rank, l ? esc(t('Leader:') + ' ' + l.name + ' · ' + l.score) : ''); if (soloExit) setTimeout(() => soloExit.next(), 1800); }
      if (m.phase === 'end') {
        const r = P.me ? P.me.rank : 0, mine = (m.awards || []).filter(a => P.me && a.name === P.me.name).map(a => a.icon + ' ' + esc(t(AWARD[a.k][0]))).join(' · ');
        if (r > 0 && r <= 3) { Music.fx(r === 1 ? 'win' : r === 2 ? 'second' : 'third'); confetti(r === 1 ? 220 : 90); }
        say(r === 1 ? '🥇 ' + t('Champion!') : r === 2 ? '🥈 ' + t('Runner-up!') : r === 3 ? '🥉 ' + t('Third place!') : '#' + r, (P.me ? P.me.score : 0) + ' ' + esc(t('points')) + (mine ? '<br>' + mine : ''));
        const s = app.querySelector('.pscreen'); if (s) s.insertAdjacentHTML('beforeend', `<a class="btn" href="#/">${esc(t(soloExit ? 'Back home' : 'Play again'))}</a>`);
      }
    },
    say
  };
}
function join(pin) {
  leave();
  let avatar = store.get('avatar', AVATARS[Math.floor(Math.random() * 16)]);
  const pidKey = 'zq.pid.' + pin; let priorId = null; try { priorId = sessionStorage.getItem(pidKey); } catch (x) {}
  const go = name => {
    store.set('name', name); store.set('avatar', avatar); Music.ac();
    let id = priorId; if (!id) { id = 'p' + crypto.randomUUID(); try { sessionStorage.setItem(pidKey, id); } catch (x) {} }
    let view; const forget = () => { try { sessionStorage.removeItem(pidKey); } catch (x) {} };
    const net = new ZQ.Net(pin, 'player', id, m => {
      if (m.t === 'refused') { toast(t(m.why)); net.close(); forget(); cur.cleanup = null; setTimeout(() => join(pin), 200); return; }
      if (m.t === 'kicked' || m.t === 'ended') { net.close(); forget(); app.onclick = null; view.say(t(m.t === 'kicked' ? 'Removed' : 'Game over'), esc(t(m.t === 'kicked' ? 'The host removed you from this game.' : 'The host has ended the game.'))); return; }
      view.onMsg(m);
    }, (s, code) => {
      if (s === 'rejected') { forget(); toast(t(code === 4004 ? 'No game with that PIN. Check it and try again.' : 'Could not join.')); location.hash = '#/'; }
      if (s === 'retry') toast(t('Reconnecting…'));
      if (s === 'open') net.send({ t: 'hello', name, avatar });
    });
    view = playerView(m => net.send(m));
    view.say(t('Joining…'), ''); cur.cleanup = () => net.close();
  };
  /* A refreshed phone carries straight on as the same player. */
  if (priorId && store.get('name', '')) return go(store.get('name', ''));
  const suggest = () => NAMES1[Math.floor(Math.random() * 8)] + ' ' + NAMES2[Math.floor(Math.random() * 8)];
  app.innerHTML = `<div class="center"><div class="logo" style="font-size:48px">ZQuiz</div><p class="mut">${esc(t('Game PIN'))} ${esc(pin)}</p><form class="card joinbox" id="nf"><input id="nn" maxlength="18" placeholder="${esc(t('Nickname'))}" aria-label="${esc(t('Nickname'))}" value="${esc(store.get('name', ''))}"><button type="button" class="btn sm ghost" id="rnd">🎲 ${esc(t('Pick a fun name'))}</button><div class="avatars">${AVATARS.map(a => `<button type="button" data-av="${a}" aria-label="${a}" class="${a === avatar ? 'on' : ''}">${a}</button>`).join('')}</div><button class="btn big">${esc(t('Join'))}</button></form></div>`;
  $('#rnd').onclick = () => { $('#nn').value = suggest(); };
  app.querySelectorAll('[data-av]').forEach(b => { b.onclick = () => { avatar = b.dataset.av; app.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x === b)); }; });
  $('#nf').onsubmit = e => { e.preventDefault(); const name = ZQ.cleanName($('#nn').value); if (!name) return toast(t('Please choose a nickname.')); go(name); };
}
/* Solo: the same engine in the browser. Normal quizzes race practice bots; challenges check answers on the server. */
function soloGame(q, checker) {
  leave(); Music.ac();
  let view, g; const pid = 'you';
  const send = (to, m) => { if (to === '*' || to === pid) setTimeout(() => { if (cur.g === g) view.onMsg(m); }, 0); };
  const exit = { next: () => { if (g.phase === 'board') g.next(); } };
  const S = (!checker && q.settings) || {};
  g = new ZQ.Game(q, { mode: 'classic', getMs: 1500, checker, shuffle: S.shuffle, shuffleOpts: S.shuffleOpts, count: S.count, theme: S.theme }, send, ev => { if (ev === 'phase' && g.phase === 'reveal') setTimeout(() => { if (g.phase === 'reveal') g.board(); }, 2400); });
  cur.g = g;
  view = playerView(m => g.handle(pid, m), exit);
  g.addPlayer(pid, store.get('name', '') || 'You', store.get('avatar', '🦊'));
  if (!checker) for (let i = 0; i < 4; i++) addBot(g);
  setTimeout(() => { if (cur.g === g) g.start(); }, 300);
  cur.cleanup = () => { clearTimeout(g.t); g.phase = 'end'; };
}
async function challenge(code) {
  leave(); app.innerHTML = `<div class="center"><div class="result">${esc(t('Challenge'))}</div></div>`;
  try {
    const r = await fetch(API + '/api/challenge/' + encodeURIComponent(code)); if (!r.ok) throw 0; const c = await r.json();
    soloGame({ id: code, title: c.title, emoji: c.emoji, qs: c.qs }, async (i, v) => { const x = await fetch(API + '/api/challenge/' + encodeURIComponent(code), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ i, v }) }); return (await x.json()).right; });
  } catch (e) { toast(t('This challenge could not be found.')); location.hash = '#/'; }
}
/* ---------- Router ---------- */
function route() {
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (a === 'library') return library(b === 'solo');
    if (a === 'make') return maker(b);
    if (a === 'setup') return setup(b);
    if (a === 'solo') { const q = findQuiz(b); if (q) return soloGame(q); location.hash = '#/library'; return; }
    if (a === 'c' && b) return challenge(b);
    if (a === 'join' && /^\d{6}$/.test(b)) return join(b);
    if (a === 'host') { const s = store.get(SAVE_KEY, null); if (s && Date.now() - s.at < 2 * 3600e3) return host(s.game.quiz, s.game.opts, s); store.del(SAVE_KEY); location.hash = '#/'; return; }
    if (a === 'import' && b) { const m = validateQuiz(decodeQ(b)); if (typeof m === 'string') throw new Error(m); m.id = 'q' + Date.now().toString(36); saveQuiz(m); toast(t('Quiz added to your library')); location.hash = '#/library'; return; }
  } catch (e) { toast(t('That link did not work.')); }
  home();
}
addEventListener('hashchange', route); route();
