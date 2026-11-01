/* Game logic and networking. The host holds the answers; players only ever receive what they need to play. */
const ZQ = {};
ZQ.norm = s => String(s == null ? '' : s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
ZQ.BLOCK = /\b(fuck|shit|bitch|asshole|cunt|nigg|rape)/i;
ZQ.cleanName = s => { const n = [...String(s || '').replace(/[<>]/g, '').trim()].slice(0, 18).join('').trim(); return n && !ZQ.BLOCK.test(n) ? n : ''; };
ZQ.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
ZQ.scored = q => !['poll', 'cloud'].includes(q.type) && q.points !== 0;

/* Decide whether an answer is right. Pure, so it can be tested alone. */
ZQ.check = (q, v) => {
  switch (q.type) {
    case 'quiz': case 'tf': return q.correct.includes(v);
    case 'multi': { if (!Array.isArray(v)) return false; const a = [...new Set(v)].sort().join(), b = q.correct.slice().sort().join(); return a === b; }
    case 'type': return (q.accept || []).some(x => ZQ.norm(x) === ZQ.norm(v));
    case 'slider': return Math.abs(Number(v) - q.answer) <= (q.tolerance || 0);
    case 'order': return Array.isArray(v) && v.length === q.order.length && v.every((x, i) => x === q.order[i]);
    default: return null;
  }
};
/* Faster answers earn more, down to half at the buzzer. Streaks add up to 500. */
ZQ.points = (q, right, secs, streak, dbl) => {
  if (!right || !ZQ.scored(q)) return 0;
  const f = 1 - Math.min(1, Math.max(0, secs / q.time)) / 2;
  return Math.round(1000 * f * (q.points || 1) * (dbl ? 2 : 1)) + Math.min(streak, 5) * 100;
};

/* Public form of a question: never includes correct, answer, accept or the right order. */
ZQ.publicQ = q => {
  const p = { type: q.type, text: q.text, emoji: q.emoji, image: q.image, time: q.time, points: q.points };
  if (q.options) p.options = q.options;
  if (q.type === 'slider') { p.min = q.min; p.max = q.max; }
  if (q.type === 'order') p.items = q._shuffled || q.items;
  return p;
};

ZQ.TEAMS = ['Comets', 'Tigers', 'Waves', 'Sparks'];

class Game {
  constructor(quiz, opts, send, onChange) {
    this.quiz = quiz; this.opts = Object.assign({ mode: 'classic', auto: false, shuffle: false, locked: false }, opts);
    this.send = send; this.onChange = onChange || (() => {});
    this.players = new Map(); this.banned = new Set(); this.phase = 'lobby'; this.i = -1; this.nextPub = 1; this.log = []; this.t = null; this.last = { t: 'phase', phase: 'lobby' }; this.answers = new Map();
    this.qs = (this.opts.shuffle ? ZQ.shuffle(quiz.qs) : quiz.qs).map(q => q.type === 'order' && q.order ? Object.assign({}, q, { _shuffled: ZQ.shuffle(q.order) }) : q);
  }
  get q() { return this.qs[this.i]; }
  list() { return [...this.players.values()]; }
  active() { return this.list().filter(p => !p.out); }
  ranked() { return this.list().sort((a, b) => b.score - a.score); }
  teams() {
    const m = {}; this.list().forEach(p => { (m[p.team] = m[p.team] || { name: p.team, score: 0, n: 0 }); m[p.team].score += p.score; m[p.team].n++; });
    return Object.values(m).map(t => ({ name: t.name, score: Math.round(t.score / t.n) })).sort((a, b) => b.score - a.score);
  }
  /* Everything needed to carry on after the host's page reloads. */
  snapshot() {
    return { quiz: this.quiz, opts: this.opts, qs: this.qs, phase: this.phase, i: this.i, nextPub: this.nextPub, log: this.log, last: this.last, started: this.started, players: this.list(), banned: [...this.banned], answers: [...this.answers.entries()] };
  }
  static restore(s, send, onChange) {
    const g = new Game(s.quiz, Object.assign({}, s.opts, { shuffle: false }), send, onChange);
    g.qs = s.qs; g.phase = s.phase; g.i = s.i; g.nextPub = s.nextPub; g.log = s.log; g.last = s.last; g.started = s.started;
    s.players.forEach(p => g.players.set(p.pid, p)); g.banned = new Set(s.banned); g.answers = new Map(s.answers);
    return g;
  }
  /* Tell players we are back, and pick the timers up where they stopped. */
  resume() {
    this.send('*', this.last);
    this.list().forEach(p => { if (!p.bot) this.send(p.pid, { t: 'welcome', me: this.me(p) }); });
    if (this.phase === 'closing') this.phase = 'answer';
    if (this.phase === 'get') this.open();
    else if (this.phase === 'answer') {
      const left = this.started + this.q.time * 1000 - Date.now();
      if (left <= 0) this.close();
      else { this.t = setTimeout(() => this.close(), left); this.list().filter(p => p.bot && !p.out && !this.answers.has(p.pid)).forEach(p => setTimeout(() => this.botAnswer(p), Math.random() * left)); }
    } else if (this.opts.auto && this.phase === 'reveal') this.t = setTimeout(() => this.board(), this.opts.autoMs || 5000);
    else if (this.opts.auto && this.phase === 'board') this.t = setTimeout(() => this.next(), this.opts.autoMs || 5000);
  }
  broadcast(m) { this.last = m; this.send('*', m); }
  addPlayer(pid, name, avatar, bot) {
    if (this.banned.has(pid)) { this.send(pid, { t: 'kicked' }); return null; }
    let p = this.players.get(pid);
    if (p) { p.connected = true; this.send(pid, { t: 'welcome', me: this.me(p) }); this.send(pid, this.last); if (this.phase === 'answer' && this.answers.has(pid)) this.send(pid, { t: 'locked' }); return p; }
    if (this.opts.locked) { this.send(pid, { t: 'refused', why: 'This game is locked.' }); return null; }
    if (this.players.size >= 200) { this.send(pid, { t: 'refused', why: 'This game is full.' }); return null; }
    const n = ZQ.cleanName(name);
    if (!n) { this.send(pid, { t: 'refused', why: 'Please choose a different nickname.' }); return null; }
    if (this.list().some(x => ZQ.norm(x.name) === ZQ.norm(n))) { this.send(pid, { t: 'refused', why: 'That nickname is taken.' }); return null; }
    p = { pid, pub: this.nextPub++, name: n, avatar: [...String(avatar || '🙂')].slice(0, 2).join(''), score: 0, streak: 0, lives: 3, out: false, team: ZQ.TEAMS[this.players.size % 4], power: { double: 1, half: 1, shield: 1 }, armed: {}, ans: {}, connected: true, bot: !!bot };
    this.players.set(pid, p);
    this.send(pid, { t: 'welcome', me: this.me(p) }); this.send(pid, this.last); this.onChange('join', p);
    return p;
  }
  me(p) { return { name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, lives: p.lives, out: p.out, team: this.opts.mode === 'team' ? p.team : null, mode: this.opts.mode, power: p.power, rank: this.ranked().indexOf(p) + 1 }; }
  kick(pid) { this.banned.add(pid); this.send(pid, { t: 'kicked' }); this.players.delete(pid); this.onChange('leave'); if (this.phase === 'answer') this.maybeClose(); }
  start() { this.next(); }
  next() {
    clearTimeout(this.t); this.i++;
    if (this.i >= this.qs.length || (this.opts.mode === 'survival' && this.players.size > 0 && this.active().length === 0)) { this.i = Math.min(this.i, this.qs.length - 1); return this.finish(); }
    this.phase = 'get'; this.answers = new Map(); this.list().forEach(p => { p.armed = {}; });
    this.broadcast({ t: 'phase', phase: 'get', idx: this.i, total: this.qs.length, q: { text: this.q.text, type: this.q.type } });
    this.onChange('phase');
    this.t = setTimeout(() => this.open(), this.opts.getMs == null ? 3000 : this.opts.getMs);
  }
  open() {
    this.phase = 'answer'; this.started = Date.now();
    this.broadcast({ t: 'phase', phase: 'answer', idx: this.i, total: this.qs.length, q: ZQ.publicQ(this.q), endsIn: this.q.time * 1000 });
    this.onChange('phase');
    this.t = setTimeout(() => this.close(), this.q.time * 1000);
    this.list().filter(p => p.bot && !p.out).forEach(p => setTimeout(() => this.botAnswer(p), 600 + Math.random() * Math.min(this.q.time * 700, 12000)));
  }
  botAnswer(p) {
    if (this.phase !== 'answer' || !this.q.correct && !this.q.accept && this.q.answer == null && !this.q.order && ZQ.scored(this.q)) return;
    const q = this.q, right = Math.random() < (p.skill || .65); let v;
    if (q.type === 'quiz' || q.type === 'tf') v = right ? q.correct[0] : Math.floor(Math.random() * q.options.length);
    else if (q.type === 'multi') v = right ? q.correct : [0];
    else if (q.type === 'type') v = right ? q.accept[0] : 'no idea';
    else if (q.type === 'slider') v = right ? q.answer : q.min;
    else if (q.type === 'order') v = right ? q.order : q._shuffled;
    else if (q.type === 'poll') v = Math.floor(Math.random() * q.options.length);
    else v = ['great', 'fun', 'quiz', 'wow', 'team'][Math.floor(Math.random() * 5)];
    this.answer(p.pid, v);
  }
  usePower(pid, k) {
    const p = this.players.get(pid); if (!p || p.out || this.phase !== 'answer' || this.answers.has(pid) || !p.power[k] || p.armed[k] || !ZQ.scored(this.q)) return;
    if (k === 'half' && (!['quiz', 'tf'].includes(this.q.type) || !this.q.correct || this.q.options.length < 3)) return;
    p.power[k] = 0; p.armed[k] = 1;
    this.send(pid, { t: 'welcome', me: this.me(p) });
    if (k === 'half') { const wrong = ZQ.shuffle(this.q.options.map((_, i) => i).filter(i => !this.q.correct.includes(i))).slice(0, 2); this.send(pid, { t: 'half', remove: wrong }); }
  }
  async answer(pid, v) {
    const p = this.players.get(pid);
    if (p && this.phase === 'answer' && this.answers.has(pid) && !p.bot) this.send(pid, { t: 'locked' });
    if (!p || p.out || this.phase !== 'answer' || this.answers.has(pid)) return;
    if (typeof v === 'string') v = v.slice(0, 80);
    const secs = (Date.now() - this.started) / 1000, a = { v, secs, right: false };
    this.answers.set(pid, a);
    /* Challenges keep their answers on the server, so the check may have to travel. */
    a.pending = this.opts.checker ? this.opts.checker(this.i, v).then(r => { a.right = r; }, () => { a.right = false; }) : null;
    if (a.pending) await a.pending; else a.right = ZQ.check(this.q, v);
    a.pending = null;
    if (!p.bot) this.send(pid, { t: 'locked' });
    this.onChange('answer');
    this.maybeClose();
  }
  maybeClose() { if (this.phase === 'answer' && this.answers.size >= this.active().length && this.active().length > 0) { clearTimeout(this.t); this.t = setTimeout(() => this.close(), 400); } }
  async close() {
    if (this.phase !== 'answer') return; clearTimeout(this.t); this.phase = 'closing';
    await Promise.all([...this.answers.values()].map(a => a.pending).filter(Boolean));
    this.phase = 'reveal'; const q = this.q, scored = ZQ.scored(q);
    const tally = (q.options || []).map(() => 0), words = {}; let nRight = 0, secsTotal = 0;
    this.active().forEach(p => {
      const a = this.answers.get(p.pid); let gain = 0, right = a ? a.right : false;
      if (a) {
        secsTotal += a.secs;
        (Array.isArray(a.v) ? a.v : [a.v]).forEach(x => { if (typeof x === 'number' && tally[x] != null) tally[x]++; });
        if (q.type === 'cloud' && a.v) { const w = ZQ.cleanName(a.v); if (w) words[ZQ.norm(w)] = (words[ZQ.norm(w)] || 0) + 1; }
      }
      if (scored) {
        if (right) { nRight++; gain = ZQ.points(q, true, a.secs, p.streak, p.armed.double); p.score += gain; p.streak++; }
        else if (!p.armed.shield) { p.streak = 0; if (this.opts.mode === 'survival') { p.lives--; if (p.lives <= 0) p.out = true; } }
      }
      p.ans[this.i] = a ? { v: a.v, right, gain, secs: +a.secs.toFixed(1) } : { v: null, right: false, gain: 0, secs: null };
      p.lastGain = gain; p.lastRight = scored ? right : null; p.lastAnswered = !!a; p.shown = true;
    });
    const n = this.list().filter(p => p.shown).length;
    const reveal = { t: 'phase', phase: 'reveal', idx: this.i, total: this.qs.length, q: ZQ.publicQ(q), tally, words, correct: q.correct, answer: q.answer, accept: q.accept, order: q.order, nRight, n };
    this.log.push({ text: q.text, type: q.type, nRight, n, avg: this.answers.size ? +(secsTotal / this.answers.size).toFixed(1) : 0, scored });
    this.last = reveal; this.send('*', reveal);
    this.list().forEach(p => { if (p.shown) this.send(p.pid, { t: 'you', right: p.lastRight, gain: p.lastGain, answered: p.lastAnswered, me: this.me(p) }); p.shown = false; });
    this.onChange('phase');
    if (this.opts.auto) this.t = setTimeout(() => this.board(), this.opts.autoMs || 5000);
  }
  board() {
    clearTimeout(this.t); this.phase = 'board';
    const top = this.ranked().slice(0, 5).map(p => ({ name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, out: p.out }));
    this.list().forEach(p => this.send(p.pid, { t: 'welcome', me: this.me(p) }));
    this.broadcast({ t: 'phase', phase: 'board', top, teams: this.opts.mode === 'team' ? this.teams() : null, idx: this.i, total: this.qs.length });
    this.onChange('phase');
    if (this.opts.auto) this.t = setTimeout(() => this.next(), this.opts.autoMs || 5000);
  }
  finish() {
    clearTimeout(this.t); this.phase = 'end';
    const top = this.ranked().slice(0, 3).map(p => ({ name: p.name, avatar: p.avatar, score: p.score }));
    this.list().forEach(p => this.send(p.pid, { t: 'welcome', me: this.me(p) }));
    this.broadcast({ t: 'phase', phase: 'end', top, awards: this.awards(), teams: this.opts.mode === 'team' ? this.teams() : null });
    this.onChange('phase');
  }
  /* Honours beyond the podium, computed from each player's answers. */
  awards() {
    const stats = this.list().map(p => {
      const rs = this.qs.map((q, i) => ZQ.scored(q) ? p.ans[i] : null).filter(Boolean); let run = 0, best = 0; rs.forEach(a => { run = a.right ? run + 1 : 0; best = Math.max(best, run); });
      const right = rs.filter(a => a.right), half = Math.floor(rs.length / 2), gain = a => a.reduce((s, x) => s + x.gain, 0);
      return { p, best, right: right.length, avg: right.length ? right.reduce((s, a) => s + a.secs, 0) / right.length : Infinity, rise: gain(rs.slice(half)) - gain(rs.slice(0, half)) };
    });
    const pick = (f, ok) => stats.filter(ok).sort(f)[0], out = [];
    let a = pick((x, y) => x.avg - y.avg, s => s.right > 0); if (a) out.push({ icon: '⚡', k: 'fast', name: a.p.name, n: +a.avg.toFixed(1) });
    a = pick((x, y) => y.best - x.best, s => s.best > 1); if (a) out.push({ icon: '🔥', k: 'streak', name: a.p.name, n: a.best });
    a = pick((x, y) => y.right - x.right, s => s.right > 0); if (a) out.push({ icon: '🎯', k: 'sharp', name: a.p.name, n: a.right });
    a = pick((x, y) => y.rise - x.rise, s => s.rise > 0); if (a) out.push({ icon: '📈', k: 'comeback', name: a.p.name, n: 0 });
    return out;
  }
  csv() {
    const c = s => '"' + String(s == null ? '' : s).replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"';
    const head = ['Rank', 'Player', 'Score'].concat(this.qs.map((q, i) => 'Q' + (i + 1)));
    const rows = this.ranked().map((p, r) => [r + 1, p.name, p.score].concat(this.qs.map((q, i) => { const a = p.ans[i]; return !a || a.v == null ? 'no answer' : ZQ.scored(q) ? (a.right ? 'right' : 'wrong') : Array.isArray(a.v) ? a.v.join('|') : a.v; })));
    return [head].concat(rows).map(r => r.map(c).join(',')).join('\r\n');
  }
  handle(pid, m) {
    if (!m) return;
    if (m.t === 'hello') this.addPlayer(pid, m.name, m.avatar);
    else if (m.t === 'ans') this.answer(pid, m.v);
    else if (m.t === 'power') this.usePower(pid, m.k);
    else if (m.t === 'react' && this.players.has(pid)) this.onChange('react', [...String(m.e)].slice(0, 2).join(''));
  }
}
ZQ.Game = Game;

/* Networks all share one shape: send(to, msg) for hosts, send(msg) for players. */
ZQ.relayUrl = (pin, role, id) => window.ZQ_RELAY.replace(/\/$/, '') + '/ws?room=' + pin + '&role=' + role + '&id=' + encodeURIComponent(id);
ZQ.isLocal = () => !window.ZQ_RELAY || /[?&]local=1/.test(location.search);
ZQ.Net = class {
  constructor(pin, role, id, onMsg, onState) { this.pin = pin; this.role = role; this.id = id; this.onMsg = onMsg; this.onState = onState || (() => {}); this.closed = false; this.tries = 0; this.queue = [];
    if (!ZQ.isLocal()) this.connect();
    else { this.bc = new BroadcastChannel('zq-' + pin); this.bc.onmessage = e => { const m = e.data; if (role === 'host' && m.toHost) onMsg(m.from, m.d); if (role === 'player' && !m.toHost && (m.to === '*' || m.to === id)) onMsg(m.d); }; setTimeout(() => { if (!this.closed) this.onState('open'); }, 0); }
  }
  connect() {
    const ws = this.ws = new WebSocket(ZQ.relayUrl(this.pin, this.role, this.id));
    ws.onopen = () => { this.tries = 0; this.queue.splice(0).forEach(x => ws.send(x)); this.onState('open'); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (this.role === 'host') { if (m.ev === 'leave') this.onMsg(m.from, { t: 'gone' }); else this.onMsg(m.from, m.d); } else this.onMsg(m); };
    ws.onclose = e => { if (this.closed || this.ws !== ws) return; if (e.code === 4001 || e.code === 4004) { this.onState('rejected', e.code); return; } if (e.code === 1000 && e.reason === 'replaced') return; this.onState('retry'); setTimeout(() => { if (!this.closed) this.connect(); }, Math.min(8000, 500 * 2 ** this.tries++)); };
  }
  raw(x) { if (this.ws && this.ws.readyState === 1) this.ws.send(x); else if (this.queue.length < 200) this.queue.push(x); }
  send(a, b) {
    if (this.closed) return;
    if (this.role === 'host') { if (this.bc) this.bc.postMessage({ to: a, d: b }); else this.raw(JSON.stringify({ to: a, d: b })); }
    else { if (this.bc) this.bc.postMessage({ toHost: true, from: this.id, d: a }); else this.raw(JSON.stringify(a)); }
  }
  close() { this.closed = true; if (this.ws) this.ws.close(); if (this.bc) this.bc.close(); }
};
if (typeof window !== 'undefined') window.ZQ = ZQ;
