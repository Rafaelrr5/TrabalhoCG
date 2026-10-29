// Camera feel: head bob while walking, screen shake (hits, rockets), sprint FOV kick.
// Offsets are applied only for the render call and removed right after, so
// collision, gravity and aiming keep working on the real camera transform.
import * as THREE from '../../../build/three.module.js';
import { moveState } from './controls.js';

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _q = new THREE.Quaternion();

export class CameraFeel {
    constructor(camera, baseFov) {
        this.camera = camera;
        this.baseFov = baseFov;
        this.bobPhase = 0;
        this.bobAmount = 0;
        this.trauma = 0;
        this.time = 0;
        this.lastPos = new THREE.Vector3().copy(camera.position);
        addEventListener('game:shake', (e) => this.shake(e.detail ?? 0.4));
    }

    shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

    update(delta, active) {
        this.time += delta;
        const c = this.camera;
        const moved = Math.hypot(c.position.x - this.lastPos.x, c.position.z - this.lastPos.z);
        this.lastPos.copy(c.position);
        const speed = delta > 0 ? moved / delta : 0;
        const walking = active && speed > 1;
        this.bobAmount += ((walking ? Math.min(speed / 10, 1.6) : 0) - this.bobAmount) * Math.min(1, delta * 8);
        this.bobPhase += delta * (6 + speed * 0.35);
        this.trauma = Math.max(0, this.trauma - delta * 1.6);

        const targetFov = this.baseFov + (walking && moveState.sprint ? 8 : 0);
        if (Math.abs(c.fov - targetFov) > 0.01) {
            c.fov += (targetFov - c.fov) * Math.min(1, delta * 6);
            c.updateProjectionMatrix();
        }
    }

    // Call around renderer.render(): apply() before, restore() after.
    apply() {
        const c = this.camera;
        _pos.copy(c.position);
        _quat.copy(c.quaternion);
        const b = this.bobAmount;
        c.position.y += Math.abs(Math.sin(this.bobPhase)) * 0.08 * b;
        const s = this.trauma * this.trauma;
        _euler.set(
            Math.sin(this.bobPhase * 2) * 0.004 * b + (Math.sin(this.time * 47) * 0.02 * s),
            Math.sin(this.time * 39) * 0.02 * s,
            Math.sin(this.bobPhase) * 0.006 * b + Math.sin(this.time * 31) * 0.03 * s
        );
        c.quaternion.multiply(_q.setFromEuler(_euler));
        c.updateMatrixWorld(true);
    }

    restore() {
        this.camera.position.copy(_pos);
        this.camera.quaternion.copy(_quat);
        this.camera.updateMatrixWorld(true);
    }
}
