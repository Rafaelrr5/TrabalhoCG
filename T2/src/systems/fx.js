// Lightweight visual effects: muzzle flash light, impact sparks and explosions.
// Driven by window events so gameplay code only has to announce what happened.
import * as THREE from '../../../build/three.module.js';

function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,220,150,0.9)');
    grd.addColorStop(0.6, 'rgba(255,90,20,0.35)');
    grd.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const POOL = 48;

export class Effects {
    constructor(scene, camera) {
        this.scene = scene;
        this.tex = makeGlowTexture();
        this.sprites = [];
        for (let i = 0; i < POOL; i++) {
            const m = new THREE.SpriteMaterial({ map: this.tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
            const s = new THREE.Sprite(m);
            s.visible = false;
            s.userData = { life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 };
            scene.add(s);
            this.sprites.push(s);
        }
        this.next = 0;

        this.muzzle = new THREE.PointLight(0xffaa55, 0, 14, 2);
        this.muzzle.position.set(0.3, -0.3, -1.5);
        camera.add(this.muzzle);

        addEventListener('game:shot', () => { this.muzzle.intensity = 30; });
        addEventListener('game:kill', (e) => { if (e.detail?.position) this.deathBurst(e.detail.position); });
        addEventListener('game:impact', (e) => {
            const { position, big } = e.detail;
            big ? this.explosion(position) : this.sparks(position);
        });
    }

    _spawn(pos, size, life, vel, color, grow) {
        const s = this.sprites[this.next];
        this.next = (this.next + 1) % POOL;
        s.position.copy(pos);
        s.scale.setScalar(size);
        s.material.color.set(color);
        s.material.opacity = 1;
        s.userData.life = life;
        s.userData.max = life;
        s.userData.vel.copy(vel);
        s.userData.grow = grow;
        s.userData.size = size;
        s.visible = true;
    }

    sparks(pos) {
        for (let i = 0; i < 4; i++) {
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(6);
            this._spawn(pos, 0.35 + Math.random() * 0.3, 0.18 + Math.random() * 0.12, v, 0xffc070, 0.5);
        }
    }

    explosion(pos) {
        this._spawn(pos, 2.5, 0.45, new THREE.Vector3(), 0xffffff, 5);
        for (let i = 0; i < 10; i++) {
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 6);
            this._spawn(pos, 1.2 + Math.random(), 0.5 + Math.random() * 0.4, v, i % 2 ? 0xff6a20 : 0xffb040, 2.5);
        }
        dispatchEvent(new CustomEvent('game:shake', { detail: 0.35 }));
    }

    deathBurst(pos) {
        for (let i = 0; i < 8; i++) {
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 4);
            this._spawn(pos, 1 + Math.random() * 0.8, 0.6 + Math.random() * 0.3, v, i % 2 ? 0xff2a10 : 0x8a0a00, 1.5);
        }
    }

    update(delta) {
        this.muzzle.intensity = Math.max(0, this.muzzle.intensity - delta * 400);
        for (const s of this.sprites) {
            if (!s.visible) continue;
            const u = s.userData;
            u.life -= delta;
            if (u.life <= 0) { s.visible = false; continue; }
            const k = u.life / u.max;
            s.position.addScaledVector(u.vel, delta);
            u.vel.multiplyScalar(1 - delta * 3);
            s.scale.setScalar(u.size * (1 + (1 - k) * u.grow));
            s.material.opacity = k;
        }
    }
}
