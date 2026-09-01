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
    
    // NEW: Strictly enforce the 2.15m vertical gap
    body3D.position.y = camera3D.position.y - 2.15; 

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
    // Trigger only handles menu selection
    this.onTriggerDown = () => {
      if (window.isMenuOpen) {
        window.dispatchEvent(new CustomEvent('vr-menu-select', {
          detail: { controller: this.el }
        }));
      }
    };
    this.el.addEventListener('triggerdown', this.onTriggerDown);

    // A button listener - stop the sequence and return to the menu
    this.onAbuttonDown = () => {
      if (!window.isMenuOpen) {
        window.dispatchEvent(new Event('vr-stop-sequence'));
      }
    };
    this.el.addEventListener('abuttondown', this.onAbuttonDown);

    this.onXButtonDown = () => {
      window.dispatchEvent(new Event(window.isMenuOpen ? 'vr-menu-back' : 'vr-freeze-sequence'));
    };
    this.el.addEventListener('xbuttondown', this.onXButtonDown);

    this.el.addEventListener('thumbstickmoved', evt => {
      evt.stopPropagation();
      evt.preventDefault();
      evt.stopImmediatePropagation();

      if (!window.isMenuOpen) return;

      const { x, y } = evt.detail;
      let direction = null;
      if (x > 0.6) direction = 'right';
      else if (x < -0.6) direction = 'left';
      else if (y < -0.6) direction = 'up';
      else if (y > 0.6) direction = 'down';
      if (direction) window.dispatchEvent(new CustomEvent('vr-menu-scroll', { detail: { direction } }));
    });
  },

  remove: function () {
    this.el.removeEventListener('triggerdown', this.onTriggerDown);
    this.el.removeEventListener('xbuttondown', this.onXButtonDown);
    this.el.removeEventListener('abuttondown', this.onAbuttonDown);
  }
});

// Component: Enables the menu pointer only while the VR menu is open.
AFRAME.registerComponent('vr-controller-input', {
  init: function () {
    this.updatePointerVisibility = () => {
      const shouldShowPointer = Boolean(window.isMenuOpen);
      const controllerModel = this.el.getObject3D('mesh');
      if (controllerModel) controllerModel.visible = shouldShowPointer;
      this.el.setAttribute('raycaster', 'enabled', shouldShowPointer);
      this.el.setAttribute('line', 'visible', shouldShowPointer);
      const laserLine = this.el.getObject3D('line');
      if (laserLine) laserLine.visible = shouldShowPointer;
    };

    this.updatePointerVisibility();

    this.el.sceneEl.addEventListener('enter-vr', this.updatePointerVisibility);
    this.el.sceneEl.addEventListener('exit-vr', this.updatePointerVisibility);
    this.el.addEventListener('object3dset', this.updatePointerVisibility);
    window.addEventListener('vr-menu-visibility-changed', this.updatePointerVisibility);
  },

  remove: function () {
    this.el.sceneEl.removeEventListener('enter-vr', this.updatePointerVisibility);
    this.el.sceneEl.removeEventListener('exit-vr', this.updatePointerVisibility);
    this.el.removeEventListener('object3dset', this.updatePointerVisibility);
    window.removeEventListener('vr-menu-visibility-changed', this.updatePointerVisibility);
  }
});

AFRAME.registerComponent('vr-height-fix', {
  init: function () {
    const scene = this.el.sceneEl;
    
    // Grab the camera inside the rig
    this.camera = this.el.querySelector('[camera]');
    
    // Define target heights
    this.targetVrHeight = 3.35;
    this.desktopHeight = 1.59;
    
    // Set default Laptop/Desktop height
    this.el.setAttribute('position', '-4.5 ' + this.desktopHeight + ' 0');

    // When headset is put on, set initial target height
    scene.addEventListener('enter-vr', () => {
      const pos = this.el.getAttribute('position');
      this.el.setAttribute('position', { x: pos.x, y: this.targetVrHeight, z: pos.z });
    });

    // When exiting VR, return to laptop height
    scene.addEventListener('exit-vr', () => {
      const pos = this.el.getAttribute('position');
      this.el.setAttribute('position', { x: pos.x, y: this.desktopHeight, z: pos.z });
    });
  },
  
  tick: function () {
    // Only run this logic if we are actively in VR mode
    if (!this.camera || !this.el.sceneEl.is('vr-mode')) return;

    // The camera's local Y reflects the physical tracking height.
    // To lock the camera's absolute world height at 3.1, we dynamically offset the rig's Y.
    // Rig Y + Local Camera Y = Target World Height (3.1)
    const localCamY = this.camera.object3D.position.y;
    
    // Modify the rig's Y directly on the object3D so it doesn't fight with your animations
    this.el.object3D.position.y = this.targetVrHeight - localCamY;
  }
});

// Component: Fixes washed out colors, tone mapping, and depth occlusion on dynamic UI
AFRAME.registerComponent('fix-ui-rendering', {
  tick: function () {
    // aframe-htmlembed-component registers its plane under the 'screen' key,
    // not 'mesh' — using the wrong key here silently no-ops every tick.
    const mesh = this.el.getObject3D('screen');
    if (!mesh || !mesh.material) return;

    let needsUpdate = false;

    // 1. Force the UI to render last, after all other transparent objects
    if (mesh.renderOrder !== 9999) {
      mesh.renderOrder = 9999;
    }

    // 2. Prevent the semi-transparent menu from blocking objects behind it
    //    in the depth buffer
    if (mesh.material.depthWrite !== false) {
      mesh.material.depthWrite = false;
      needsUpdate = true;
    }

    // 3. Ensure real alpha blending instead of a hard cutout — alphaTest
    //    would force near-opaque pixels (e.g. the 0.92-alpha panel) to draw
    //    at full 100% opacity, erasing whatever is behind them
    if (mesh.material.transparent !== true) {
      mesh.material.transparent = true;
      needsUpdate = true;
    }
    if (mesh.material.alphaTest !== 0) {
      mesh.material.alphaTest = 0;
      needsUpdate = true;
    }

    // 4. Bypass scene tone mapping to prevent UI desaturation
    //if (mesh.material.toneMapped !== false) {
    //  mesh.material.toneMapped = false;
    //  needsUpdate = true;
    //}

    // 5. Fix color space mismatch for dynamically generated canvas textures
    if (mesh.material.map && mesh.material.map.colorSpace !== 'srgb') {
      mesh.material.map.colorSpace = 'srgb';
      needsUpdate = true;
    }

    if (needsUpdate) {
      mesh.material.needsUpdate = true;
    }
  }
});
