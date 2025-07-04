import * as THREE from '../../../../../build/three.module.js';

export class IdleBehaviors {
  static initializeIdle(enemy, options = {}) {
    if (!enemy.idleState) {
      enemy.idleState = {
        initialized: false,
        basePosition: new THREE.Vector3(),
        timeOffset: Math.random() * Math.PI * 2,
        ...options
      };
    }
  }

  static idleBehavior6DOF(enemy, delta, options = {}) {
    const {
      amplitude = 0.15,
      amplitudeVariation = 0.05,
      speedX = 1.2,
      speedY = 0.8,
      speedZ = 1.1,
      yDamping = 0.7,
      driftCorrection = 0.001
    } = options;

    this.initializeIdle(enemy);
    
    if (!enemy.idleState.initialized) {
      enemy.idleState.initialized = true;
      enemy.idleState.basePosition.copy(enemy.mesh.position);
    }
    
    const time = Date.now() * 0.001;
    const timeOffset = enemy.idleState.timeOffset;
    
    // Smooth floating movement with individual variation
    const floatAmplitude = amplitude + Math.sin(timeOffset) * amplitudeVariation;
    
    enemy.mesh.position.x = enemy.idleState.basePosition.x + 
      Math.sin(time * speedX + timeOffset) * floatAmplitude;
    enemy.mesh.position.y = enemy.idleState.basePosition.y + 
      Math.sin(time * speedY + timeOffset * 1.3) * floatAmplitude * yDamping;
    enemy.mesh.position.z = enemy.idleState.basePosition.z + 
      Math.cos(time * speedZ + timeOffset * 0.8) * floatAmplitude;
    
    // Gradual drift correction to prevent accumulating errors
    enemy.idleState.basePosition.lerp(enemy.mesh.position, driftCorrection);
  }

  static idleBehaviorGround(enemy, delta, options = {}) {
    const {
      amplitude = 0.1,
      speedX = 0.8,
      speedZ = 1.0,
      bobAmplitude = 0.05,
      bobSpeed = 2.0
    } = options;

    this.initializeIdle(enemy);
    
    if (!enemy.idleState.initialized) {
      enemy.idleState.initialized = true;
      enemy.idleState.basePosition.copy(enemy.mesh.position);
    }
    
    const time = Date.now() * 0.001;
    const timeOffset = enemy.idleState.timeOffset;
    
    // Subtle ground movement
    enemy.mesh.position.x = enemy.idleState.basePosition.x + 
      Math.sin(time * speedX + timeOffset) * amplitude;
    enemy.mesh.position.z = enemy.idleState.basePosition.z + 
      Math.cos(time * speedZ + timeOffset * 0.7) * amplitude;
    
    // Gentle bobbing motion
    enemy.mesh.position.y = enemy.idleState.basePosition.y + 
      Math.sin(time * bobSpeed + timeOffset) * bobAmplitude;
  }

  static idleModelRotation(model, delta, options = {}) {
    if (!model) return;
    
    const {
      rotationSpeed = 0.6,
      amplitudeX = 0.04,
      amplitudeY = 0.08,
      amplitudeZ = 0.02,
      timeOffset = 0
    } = options;
    
    const time = Date.now() * 0.001;
    
    model.rotation.x = Math.sin(time * rotationSpeed + timeOffset) * amplitudeX;
    model.rotation.y = Math.cos(time * rotationSpeed * 0.67 + timeOffset) * amplitudeY;
    model.rotation.z = Math.sin(time * rotationSpeed * 1.17 + timeOffset) * amplitudeZ;
  }

  static idlePulseScale(object, delta, options = {}) {
    if (!object) return;
    
    const {
      baseScale = 1.0,
      amplitude = 0.05,
      speed = 1.5,
      timeOffset = 0
    } = options;
    
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * speed + timeOffset) * amplitude;
    const scale = baseScale + pulse;
    
    object.scale.setScalar(scale);
  }

  static combinedIdleBehavior(enemy, delta, options = {}) {
    const {
      movement = 'ground', // 'ground' or '6dof'
      enableModelRotation = false,
      enablePulse = false,
      model = null,
      ...behaviorOptions
    } = options;

    // Apply movement behavior
    if (movement === '6dof') {
      this.idleBehavior6DOF(enemy, delta, behaviorOptions);
    } else {
      this.idleBehaviorGround(enemy, delta, behaviorOptions);
    }

    // Apply model rotation if enabled
    if (enableModelRotation && model) {
      this.idleModelRotation(model, delta, {
        timeOffset: enemy.idleState?.timeOffset || 0,
        ...behaviorOptions.rotation
      });
    }

    // Apply pulse scale if enabled
    if (enablePulse) {
      this.idlePulseScale(enemy.mesh, delta, {
        timeOffset: enemy.idleState?.timeOffset || 0,
        ...behaviorOptions.pulse
      });
    }
  }
}
