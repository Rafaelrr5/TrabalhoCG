// Game HUD: health, keys, weapon, kills/timer, objective, toasts, crosshair, hit markers, pause.
// Plain DOM overlay. Other modules talk to it through window CustomEvents (see bottom).

const KEY_COLORS = { red: '#ff3b3b', yellow: '#ffd23b', blue: '#3b8bff' };
const WEAPON_LABELS = ['Lança-foguetes', 'Chaingun'];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&display=swap');
.hud, .hud * { box-sizing: border-box; }
.hud { position: fixed; inset: 0; pointer-events: none; z-index: 1000; font-family: 'Rajdhani', 'Segoe UI', sans-serif;
  color: #f2ece4; text-transform: uppercase; letter-spacing: .08em; user-select: none; }
.hud-panel { position: absolute; bottom: 22px; padding: 10px 16px 12px; border-radius: 6px;
  background: linear-gradient(180deg, rgba(20,12,12,.55), rgba(8,4,4,.78)); border: 1px solid rgba(255,90,60,.25);
  box-shadow: 0 6px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(4px); }
.hud-label { font-size: 12px; font-weight: 500; opacity: .65; }
.hud-health { left: 22px; width: 280px; }
.hud-health .num { font-size: 44px; font-weight: 700; line-height: .95; text-shadow: 0 0 14px rgba(255,80,60,.35); }
.hud-health .num small { font-size: 18px; opacity: .5; margin-left: 4px; }
.hud-bar { height: 8px; margin-top: 6px; border-radius: 4px; background: rgba(255,255,255,.08); overflow: hidden; position: relative; }
.hud-bar i { position: absolute; inset: 0; transform-origin: left; background: linear-gradient(90deg, #ff2d2d, #ff8a3b);
  transition: transform .25s ease-out; }
.hud-bar b { position: absolute; inset: 0; transform-origin: left; background: rgba(255,255,255,.35); transition: transform .9s ease-out .15s; }
.hud-health.low .num { color: #ff4a3a; animation: hudPulse .8s infinite; }
.hud-god { display: none; margin-left: 10px; padding: 1px 6px; border: 1px solid #ffd23b; color: #ffd23b; border-radius: 3px; font-size: 11px; vertical-align: middle; }
.hud-health.god .hud-god { display: inline-block; }
.hud-keys { left: 50%; transform: translateX(-50%); display: flex; gap: 10px; align-items: center; }
.hud-key { width: 34px; height: 34px; border-radius: 50%; border: 2px dashed rgba(255,255,255,.18); display: grid; place-items: center;
  font-size: 16px; transition: all .3s; }
.hud-key.got { border-style: solid; box-shadow: 0 0 14px currentColor, inset 0 0 10px currentColor; background: rgba(0,0,0,.35); }
.hud-key svg { width: 18px; height: 18px; opacity: .25; }
.hud-key.got svg { opacity: 1; }
.hud-weapon { right: 22px; text-align: right; min-width: 220px; }
.hud-weapon .name { font-size: 26px; font-weight: 700; }
.hud-weapon .slots { margin-top: 4px; display: flex; gap: 6px; justify-content: flex-end; }
.hud-weapon .slots span { width: 26px; height: 20px; font-size: 12px; display: grid; place-items: center; border-radius: 3px;
  border: 1px solid rgba(255,255,255,.2); opacity: .5; }
.hud-weapon .slots span.on { opacity: 1; border-color: #ff8a3b; color: #ff8a3b; box-shadow: 0 0 10px rgba(255,138,59,.4); }
.hud-top { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); text-align: center; }
.hud-objective { font-size: 15px; font-weight: 700; padding: 6px 16px; border-radius: 4px; background: rgba(0,0,0,.45);
  border-left: 3px solid #ff5a3c; text-shadow: 0 1px 2px #000; transition: opacity .4s; }
.hud-stats { position: absolute; top: 18px; right: 22px; text-align: right; font-size: 15px; font-weight: 700; text-shadow: 0 1px 2px #000; }
.hud-stats div span { opacity: .6; font-weight: 500; margin-right: 8px; }
.hud-toasts { position: absolute; top: 34%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; align-items: center; }
.hud-toast { font-size: 22px; font-weight: 700; padding: 6px 22px; background: linear-gradient(90deg, transparent, rgba(0,0,0,.6), transparent);
  text-shadow: 0 0 12px rgba(255,120,60,.6); animation: hudToast 2.6s ease forwards; }
.hud-cross { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.hud-cross i { position: absolute; background: rgba(255,255,255,.9); box-shadow: 0 0 2px #000; transition: transform .08s ease-out; }
.hud-cross i:nth-child(1), .hud-cross i:nth-child(2) { width: 2px; height: 8px; left: -1px; }
.hud-cross i:nth-child(3), .hud-cross i:nth-child(4) { width: 8px; height: 2px; top: -1px; }
.hud-cross i:nth-child(1) { top: calc(-6px - var(--spread)); } .hud-cross i:nth-child(2) { top: calc(-2px + var(--spread)); }
.hud-cross i:nth-child(3) { left: calc(-6px - var(--spread)); } .hud-cross i:nth-child(4) { left: calc(-2px + var(--spread)); }
.hud-cross em { position: absolute; width: 2px; height: 2px; left: -1px; top: -1px; background: #fff; }
.hud-hit { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px; opacity: 0; }
.hud-hit::before, .hud-hit::after { content: ''; position: absolute; left: 12px; top: -2px; width: 2px; height: 30px;
  background: linear-gradient(transparent 0 35%, currentColor 35% 65% , transparent 65%); }
.hud-hit::before { transform: rotate(45deg); } .hud-hit::after { transform: rotate(-45deg); }
.hud-hit.show { animation: hudHit .25s ease-out; }
.hud-hit.kill { color: #ff3b3b; } .hud-hit:not(.kill) { color: #fff; }
.hud-overlay { position: fixed; inset: 0; z-index: 99990; display: none; place-items: center; pointer-events: auto;
  background: radial-gradient(ellipse at center, rgba(40,6,6,.72), rgba(0,0,0,.92)); font-family: 'Rajdhani','Segoe UI',sans-serif;
  color: #f2ece4; text-transform: uppercase; letter-spacing: .12em; text-align: center; }
.hud-overlay.on { display: grid; animation: hudFade .25s ease; }
.hud-overlay h1 { font-size: 64px; margin: 0; color: #ff4a2a; text-shadow: 0 0 30px rgba(255,60,30,.55); }
.hud-overlay p { opacity: .8; }
.hud-btn { pointer-events: auto; cursor: pointer; margin-top: 18px; padding: 12px 36px; font: 700 20px 'Rajdhani','Segoe UI',sans-serif;
  letter-spacing: .15em; text-transform: uppercase; color: #fff; background: linear-gradient(180deg, #d8301c, #8c1508);
  border: 1px solid #ff7a50; border-radius: 4px; box-shadow: 0 0 24px rgba(255,60,30,.45); transition: transform .15s, box-shadow .15s; }
.hud-btn:hover, .hud-btn:focus-visible { transform: translateY(-2px) scale(1.03); box-shadow: 0 0 36px rgba(255,80,40,.7); outline: none; }
.hud-controls { display: grid; grid-template-columns: auto auto; gap: 6px 22px; margin: 22px auto 0; font-size: 15px; text-align: left; width: max-content; }
.hud-controls kbd { display: inline-block; min-width: 24px; padding: 1px 6px; border: 1px solid rgba(255,255,255,.35); border-bottom-width: 3px;
  border-radius: 4px; font: 700 13px 'Rajdhani',sans-serif; text-align: center; margin-right: 4px; }
.hud-statgrid { display: flex; gap: 34px; justify-content: center; margin-top: 18px; }
.hud-statgrid div { font-size: 32px; font-weight: 700; } .hud-statgrid div span { display: block; font-size: 12px; opacity: .6; font-weight: 500; }
@keyframes hudPulse { 50% { opacity: .55; } }
@keyframes hudToast { 0% { opacity: 0; transform: translateY(10px) scale(.95); } 12% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
@keyframes hudHit { 0% { opacity: 1; transform: scale(1.4); } 100% { opacity: 0; transform: scale(1); } }
@keyframes hudFade { from { opacity: 0; } }
`;

const KEY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M11 10.5h11v3h-2v3h-3v-3h-6z"/></svg>';

export const CONTROLS_HTML = `
  <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover</div><div><kbd>Shift</kbd> correr · <kbd>Espaço</kbd> pular</div>
  <div><kbd>Mouse</kbd> mirar / atirar</div><div><kbd>1</kbd><kbd>2</kbd> / roda trocar arma</div>
  <div><kbd>Esc</kbd> pausar</div><div><kbd>Q</kbd> som on/off</div>
  <div><kbd>G</kbd> modo deus</div><div><kbd>C</kbd> todas as chaves</div>`;

function fmtTime(s) {
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
}

class Hud {
    init() {
        if (this.root) return;
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        this.root = document.createElement('div');
        this.root.className = 'hud';
        this.root.style.display = 'none';
        this.root.innerHTML = `
          <div class="hud-top"><div class="hud-objective"></div></div>
          <div class="hud-stats"><div><span>Abates</span><b class="kills">0</b></div><div><span>Tempo</span><b class="time">0:00</b></div></div>
          <div class="hud-toasts"></div>
          <div class="hud-cross" style="--spread:0px"><i></i><i></i><i></i><i></i><em></em></div>
          <div class="hud-hit"></div>
          <div class="hud-panel hud-health"><div class="hud-label">Vida <span class="hud-god">Modo deus</span></div>
            <div class="num">200<small>/200</small></div><div class="hud-bar"><b></b><i></i></div></div>
          <div class="hud-panel hud-keys">${Object.entries(KEY_COLORS).map(([k, c]) =>
              `<div class="hud-key" data-key="${k}" style="color:${c}" title="${k}">${KEY_SVG}</div>`).join('')}</div>
          <div class="hud-panel hud-weapon"><div class="hud-label">Arma</div><div class="name"></div>
            <div class="slots"><span data-slot="0">1</span><span data-slot="1">2</span></div></div>`;
        document.body.appendChild(this.root);

        const q = (s) => this.root.querySelector(s);
        this.el = {
            objective: q('.hud-objective'), kills: q('.kills'), time: q('.time'), toasts: q('.hud-toasts'),
            cross: q('.hud-cross'), hit: q('.hud-hit'), health: q('.hud-health'), healthNum: q('.hud-health .num'),
            barFill: q('.hud-bar i'), barTrail: q('.hud-bar b'), weapon: q('.hud-weapon .name'),
            slots: [...this.root.querySelectorAll('.hud-weapon .slots span')],
            keys: Object.fromEntries([...this.root.querySelectorAll('.hud-key')].map(e => [e.dataset.key, e]))
        };

        this.pause = this._overlay('hud-pause', `<div><h1>Pausado</h1><p>Clique para voltar ao jogo</p>
            <div class="hud-controls">${CONTROLS_HTML}</div><button class="hud-btn">Continuar</button></div>`);

        this.kills = 0;
        this.elapsed = 0;
        this.running = false;
        this.spread = 0;
        this.setWeapon(0);
        this.setObjective('Vá ao templo a oeste e elimine as almas perdidas');

        addEventListener('game:shot', () => { this.spread = Math.min(14, this.spread + 6); });
        addEventListener('game:hit', (e) => this.hitMarker(e.detail?.killed));
        addEventListener('game:kill', () => { this.kills++; this.el.kills.textContent = this.kills; this.hitMarker(true); });
        addEventListener('game:toast', (e) => this.toast(e.detail));
        addEventListener('game:objective', (e) => this.setObjective(e.detail));
    }

    _overlay(cls, html) {
        const o = document.createElement('div');
        o.className = `hud-overlay ${cls}`;
        o.innerHTML = html;
        document.body.appendChild(o);
        return o;
    }

    show() { this.root.style.display = ''; this.running = true; }

    setHealth(current, max, god) {
        const f = Math.max(0, current / max);
        this.el.healthNum.innerHTML = `${Math.ceil(current)}<small>/${max}</small>`;
        this.el.barFill.style.transform = `scaleX(${f})`;
        this.el.barTrail.style.transform = `scaleX(${f})`;
        this.el.health.classList.toggle('low', f < 0.3);
        this.el.health.classList.toggle('god', !!god);
    }

    setKeys(collected) {
        for (const [k, el] of Object.entries(this.el.keys)) el.classList.toggle('got', collected.includes(k));
    }

    setWeapon(index) {
        this.el.weapon.textContent = WEAPON_LABELS[index] || '';
        this.el.slots.forEach((s, i) => s.classList.toggle('on', i === index));
    }

    setObjective(text) {
        if (!text) { this.el.objective.style.opacity = 0; return; }
        this.el.objective.style.opacity = 1;
        this.el.objective.textContent = text;
    }

    toast(text) {
        const t = document.createElement('div');
        t.className = 'hud-toast';
        t.textContent = text;
        this.el.toasts.appendChild(t);
        setTimeout(() => t.remove(), 2700);
    }

    hitMarker(kill) {
        const h = this.el.hit;
        h.classList.remove('show');
        h.classList.toggle('kill', !!kill);
        void h.offsetWidth; // restart the animation
        h.classList.add('show');
    }

    setPaused(paused) { this.pause.classList.toggle('on', paused); }

    stats() { return { kills: this.kills, time: fmtTime(this.elapsed) }; }

    update(delta, paused) {
        if (!this.root) return;
        if (this.running && !paused) {
            this.elapsed += delta;
            this.el.time.textContent = fmtTime(this.elapsed);
        }
        this.spread = Math.max(0, this.spread - delta * 40);
        this.el.cross.style.setProperty('--spread', `${this.spread.toFixed(1)}px`);
    }
}

export const hud = new Hud();
