// ════════════════════════════════════════════════════════════════════════════
// components.js
// Custom A-Frame components for the environment and player rig.
// Must be loaded in <head> after A-Frame, but before <a-scene> and main.js.
// ════════════════════════════════════════════════════════════════════════════

// Component: Quadratic Bézier walk path for NPCs
AFRAME.registerComponent('curve-walk', {
  schema: {
    p1:         { type: 'vec3',   default: { x: -3, y: 1.065, z: -5 } },
    p2:         { type: 'vec3',   default: { x: -8, y: 1.065, z: -5 } },
    dur:        { type: 'number', default: 6000 },
    startEvent: { type: 'string', default: 'npcWalkOut' },
    walkClip:   { type: 'string', default: 'walk' },
    idleClip:   { type: 'string', default: 'Idle' }
  },
  init: function () {
    this.active = false;
    this.onStart = () => {
      this.active  = true;
      this.elapsed = 0;
      this.p0 = new THREE.Vector3().copy(this.el.object3D.position);
      this.p1 = new THREE.Vector3(this.data.p1.x, this.data.p1.y, this.data.p1.z);
      this.p2 = new THREE.Vector3(this.data.p2.x, this.data.p2.y, this.data.p2.z);
      this.el.setAttribute('animation-mixer',
        `clip: ${this.data.walkClip}; loop: repeat; timeScale: 0.8; crossFadeDuration: 0.2`);
    };
    this.el.addEventListener(this.data.startEvent, this.onStart);
  },
  remove: function () {
    this.el.removeEventListener(this.data.startEvent, this.onStart);
  },
  tick: function (time, timeDelta) {
    if (!this.active || window.isSimulationFrozen) return;

    this.elapsed += timeDelta;
    const t   = Math.min(this.elapsed / this.data.dur, 1);
    const omt = 1 - t;

    if (t >= 1) {
      this.active = false;
      this.el.setAttribute('animation-mixer',
        `clip: ${this.data.idleClip}; loop: repeat; crossFadeDuration: 0.2`);
    }

    const x = omt*omt*this.p0.x + 2*omt*t*this.p1.x + t*t*this.p2.x;
    const y = omt*omt*this.p0.y + 2*omt*t*this.p1.y + t*t*this.p2.y;
    const z = omt*omt*this.p0.z + 2*omt*t*this.p1.z + t*t*this.p2.z;
    this.el.object3D.position.set(x, y, z);

    const dx = 2*omt*(this.p1.x - this.p0.x) + 2*t*(this.p2.x - this.p1.x);
    const dz = 2*omt*(this.p1.z - this.p0.z) + 2*t*(this.p2.z - this.p1.z);
    this.el.object3D.rotation.y = Math.atan2(dx, dz);
  }
});

// Component: Syncs the player body position/rotation to the HMD with a lazy threshold
AFRAME.registerComponent('body-sync', {
  schema: {
    camera:    { type: 'selector', default: '#mainCamera' },
    threshold: { type: 'number',   default: 45 }
  },
  tick: function () {
    if (!this.data.camera) return;

    const camera3D = this.data.camera.object3D;
    const body3D   = this.el.object3D;

    body3D.position.x = camera3D.position.x;
    body3D.position.z = camera3D.position.z;

    const thresholdRad = this.data.threshold * (Math.PI / 180);
    const camRotY      = camera3D.rotation.y;
    let   bodyRotY     = body3D.rotation.y;

    let diff = camRotY - bodyRotY;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff >   Math.PI) diff -= Math.PI * 2;

    if      (diff >  thresholdRad) body3D.rotation.y = camRotY - thresholdRad;
    else if (diff < -thresholdRad) body3D.rotation.y = camRotY + thresholdRad;
  }
});

// Component: Scrolls a material's UV offset to simulate shaft movement
AFRAME.registerComponent('texture-scroller', {
  schema: {
    speed:     { type: 'number',  default: 0.5 },
    direction: { type: 'string',  default: 'down' },
    active:    { type: 'boolean', default: false }
  },
  tick: function (time, timeDelta) {
    if (!this.data.active) return;
    const mesh = this.el.getObject3D('mesh');
    if (!mesh?.material?.map) return;

    const offsetChange = (this.data.speed * timeDelta) / 1000;
    if (this.data.direction === 'up') mesh.material.map.offset.y -= offsetChange;
    else                              mesh.material.map.offset.y += offsetChange;
  }
});

// Component: Maps VR controller buttons to global sequence control events
AFRAME.registerComponent('sequence-controller', {
  init: function () {
    this.el.addEventListener('abuttondown', () => {
      window.dispatchEvent(new Event(window.isMenuOpen ? 'vr-menu-select' : 'vr-start-sequence'));
    });

    this.el.addEventListener('xbuttondown', () => {
      window.dispatchEvent(new Event(window.isMenuOpen ? 'vr-menu-back' : 'vr-freeze-sequence'));
    });

    this.el.addEventListener('thumbstickmoved', evt => {
      if (!window.isMenuOpen) return;
      const { x, y } = evt.detail;
      let direction = null;
      if (x > 0.6) direction = 'right';
      else if (x < -0.6) direction = 'left';
      else if (y < -0.6) direction = 'up';
      else if (y > 0.6) direction = 'down';
      if (direction) window.dispatchEvent(new CustomEvent('vr-menu-scroll', { detail: { direction } }));
    });
  }
});