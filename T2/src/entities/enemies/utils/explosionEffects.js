import * as THREE from '../../../../../build/three.module.js';

export class ExplosionEffects {
  static createParticleExplosion(position, parent, options = {}) {
    const {
      particleCount = 8,
      colors = [0xff4444, 0xff6666, 0xff8888, 0xffaaaa],
      minSize = 0.08,
      maxSize = 0.14,
      minSpeed = 2,
      maxSpeed = 6,
      gravity = 0.01,
      fadeSpeed = 2
    } = options;

    if (!parent) return;

    for (let i = 0; i < particleCount; i++) {
      const particleSize = minSize + Math.random() * (maxSize - minSize);
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(particleSize, 6, 6),
        new THREE.MeshBasicMaterial({ 
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0.9
        })
      );
      
      particle.position.copy(position);
      
      // Random direction with spherical distribution
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      
      const direction = new THREE.Vector3(
        sinTheta * Math.cos(phi),
        cosTheta,
        sinTheta * Math.sin(phi)
      );
      
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      direction.multiplyScalar(speed);
      
      parent.add(particle);
      
      // Animate particle
      this.animateParticle(particle, direction, gravity, fadeSpeed);
    }
  }

  static createFlashEffect(position, parent, options = {}) {
    const {
      color = 0xffffff,
      size = 2.0,
      opacity = 0.6,
      duration = 1.0,
      expansionFactor = 2.0
    } = options;

    if (!parent) return;
    
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity
      })
    );
    
    flash.position.copy(position);
    parent.add(flash);
    
    // Animate flash
    this.animateFlash(flash, duration, opacity, expansionFactor);
  }

  static createExplosion(position, parent, options = {}) {
    this.createParticleExplosion(position, parent, options.particles);
    this.createFlashEffect(position, parent, options.flash);
  }

  static animateParticle(particle, direction, gravity, fadeSpeed) {
    let life = 1.0;
    const initialScale = 1.0;
    
    const animate = () => {
      if (life > 0) {
        // Movement with gravity
        direction.y -= gravity;
        particle.position.addScaledVector(direction, 0.016);
        
        // Fade and scaling
        life -= 0.016 * fadeSpeed * (1 + Math.random());
        particle.material.opacity = life * 0.9;
        
        // Variable scaling
        const scale = initialScale * (0.5 + life * 0.5);
        particle.scale.setScalar(scale);
        
        requestAnimationFrame(animate);
      } else {
        this.disposeParticle(particle);
      }
    };
    animate();
  }

  static animateFlash(flash, duration, initialOpacity, expansionFactor) {
    let flashLife = 1.0;
    const fadeRate = 1 / (duration * 60); // Assuming 60fps
    
    const animate = () => {
      if (flashLife > 0) {
        flashLife -= fadeRate;
        flash.material.opacity = flashLife * initialOpacity;
        flash.scale.setScalar(1 + (1 - flashLife) * expansionFactor);
        requestAnimationFrame(animate);
      } else {
        this.disposeFlash(flash);
      }
    };
    animate();
  }

  static disposeParticle(particle) {
    if (particle.parent) particle.parent.remove(particle);
    if (particle.geometry) particle.geometry.dispose();
    if (particle.material) particle.material.dispose();
  }

  static disposeFlash(flash) {
    if (flash.parent) flash.parent.remove(flash);
    if (flash.geometry) flash.geometry.dispose();
    if (flash.material) flash.material.dispose();
  }
}
