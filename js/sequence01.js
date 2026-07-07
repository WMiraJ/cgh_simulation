// ════════════════════════════════════════════════════════════════════════════
// sequence01.js  ·  easy-standard
//
// Structure:
//   Part 1 — A-Frame component registrations (runs immediately / synchronous).
//             Must complete before <a-scene> is parsed, which is why this
//             file is loaded via <script> in <head> of index.html.
//
//   Part 2 — window.Sequence01.init()
//             Called by main.js after the sequence HTML entities have been
//             injected into the live scene. Contains all state, helpers,
//             core mechanics, and event listeners for this sequence.
// ════════════════════════════════════════════════════════════════════════════


// ─── Part 1: A-Frame Component Registrations ─────────────────────────────────

window.registerAframeComponent = window.registerAframeComponent || ((name, definition) => {
  if (!AFRAME.components[name]) {
    AFRAME.registerComponent(name, definition);
  }
});

// Component: Quadratic Bézier walk path for NPCs
window.registerAframeComponent('curve-walk', {
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
window.registerAframeComponent('body-sync', {
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
window.registerAframeComponent('texture-scroller', {
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
window.registerAframeComponent('sequence-controller', {
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


// ─── Part 2: Sequence Logic ───────────────────────────────────────────────────

window.Sequence01 = {

  init(config) {

    // ── DOM references & state ───────────────────────────────────────────────

    let currentSequenceKey = config?.key || 'easy-standard';
    const startFloor           = config?.startFloor || 2;
    const elevator           = document.querySelector('#elevatorModel');
    const avatar             = document.querySelector('#avatarModelSophie');
    const replayBtnContainer = document.querySelector('#ui-container');
    const replayBtn          = document.querySelector('#replayBtn');
    const loadingOverlay     = document.querySelector('#loading-overlay');
    const assets             = document.querySelector('a-assets');

    let currFloor             = startFloor;
    let isMoving              = false;
    let isDoorsOpen           = false;
    let isSequenceRunning     = false;
    let hasSequenceCompleted  = false;
    window.activeSequenceKey   = currentSequenceKey;
    window.isSimulationFrozen = false;

    function setMovementEnabled(enabled) {
      if (window.setPlayerMovementEnabled) window.setPlayerMovementEnabled(enabled);
      else {
        const rig = document.querySelector('#rig');
        if (!rig) return;
        if (enabled) rig.setAttribute('movement-controls', 'speed: 0.1');
        else rig.removeAttribute('movement-controls');
      }
    }

    window.showSequenceMenu = function () {
      replayBtnContainer.style.display = 'none';
      window.isSimulationFrozen = false;
      hasSequenceCompleted = false;
      currFloor = 1;
      updateAllDisplays(currFloor, 'idle');
      setFloorBackdrop(currFloor);
      setNpcVisible(false);

      const menuContainer = document.querySelector('#vr-menu-container');
      const menuComponent = menuContainer?.components?.['vr-sequence-menu'];
      if (menuComponent?.resetMenu) menuComponent.resetMenu();
      else {
        window.isMenuOpen = true;
        setMovementEnabled(false);
        menuContainer?.setAttribute('visible', 'true');
      }
    };


    // ── Helpers ──────────────────────────────────────────────────────────────

    // Pause-aware sleep: timer pauses while isSimulationFrozen is true
    const sleep = async (ms) => {
      let elapsed = 0;
      const step  = 50;
      while (elapsed < ms) {
        await new Promise(r => setTimeout(r, step));
        if (!window.isSimulationFrozen) elapsed += step;
      }
    };

    // Trigger a named animation clip on the elevator GLB
    function playLiftAnimation(name) {
      elevator.setAttribute('animation-mixer', { clip: name, loop: 'once', clampWhenFinished: true });
      if (name === 'DoorOpen'  && elevator.components.sound__dooropen)
        elevator.components.sound__dooropen.playSound();
      if (name === 'DoorClose' && elevator.components.sound__doorclose)
        elevator.components.sound__doorclose.playSound();
    }

    // Trigger a named looping animation on the NPC avatar
    function playAvatarAnimation(name) {
      if (avatar) avatar.setAttribute('animation-mixer', { clip: name, loop: 'repeat' });
    }

    // Update floor number and direction arrow on both inside/outside displays
    function updateAllDisplays(floorNumber, direction) {
      document.querySelectorAll('.lift-floor').forEach(el => el.setAttribute('value', floorNumber));
      document.querySelectorAll('.lift-arrow').forEach(el => {
        if      (direction === 'up')   { el.setAttribute('visible', 'true');  el.setAttribute('rotation', '0 0 0');   }
        else if (direction === 'down') { el.setAttribute('visible', 'true');  el.setAttribute('rotation', '0 0 180'); }
        else                           { el.setAttribute('visible', 'false'); }
      });
    }

    function setNpcVisible(visible) {
      if (avatar) avatar.setAttribute('visible', visible);
    }

    function setFloorBackdrop(floorNumber) {
      const scrollingShaft   = document.querySelector('#scrolling-shaft');
      const firstFloorPlane  = document.querySelector('#first-floor');
      const lowerFloorPlane  = document.querySelector('#lower-floor');
      const middleFloorPlane = document.querySelector('#middle-floor');
      const upperFloorPlane  = document.querySelector('#upper-floor');

      [scrollingShaft, firstFloorPlane, upperFloorPlane, middleFloorPlane, lowerFloorPlane]
        .forEach(el => el?.setAttribute('visible', 'false'));

      if      (floorNumber === 1)  firstFloorPlane?.setAttribute('visible', 'true');
      else if (floorNumber <=  6) lowerFloorPlane?.setAttribute('visible', 'true');
      else if (floorNumber <= 10) middleFloorPlane?.setAttribute('visible', 'true');
      else                        upperFloorPlane?.setAttribute('visible', 'true');
    }

    function setEntityAnimationsPaused(entity, paused) {
      if (!entity?.components) return;
      Object.keys(entity.components)
        .filter(name => name.startsWith('animation__'))
        .forEach(name => entity.components[name]?.[paused ? 'pause' : 'play']?.());
    }


    // ── Core Mechanics ───────────────────────────────────────────────────────

    // Move the lift to destFloor.
    // isSilentMove: skips the shaft scroll and plays at lower volume
    // (used for the initial repositioning to floor 1 before the sequence starts).
    window.goToFloor = async function (destFloor, isSilentMove = false) {
      if (isMoving || currFloor === destFloor) return;
      isMoving = true;

      const isGoingUp    = destFloor > currFloor;
      const screenDir    = isGoingUp ? 'up' : 'down';
      const scrollDir    = isGoingUp ? 'down' : 'up';
      const targetVolume = isSilentMove ? 1 : 2.0;

      // Normalise all sound volumes for this trip
      ['sound__voiceup', 'sound__voicedown', 'sound__voicedoorclose',
       'sound__doorclose', 'sound__dooropen', 'sound__ding'].forEach(s => {
        if (elevator.components[s]) elevator.setAttribute(s, 'volume', targetVolume);
      });
      elevator.setAttribute('animation__fadein',  { to:   targetVolume });
      elevator.setAttribute('animation__fadeout', { from: targetVolume });

      // Phase 1: Departure announcements + door close
      if (isDoorsOpen) {
        if (isGoingUp  && elevator.components.sound__voiceup)
          elevator.components.sound__voiceup.playSound();
        if (!isGoingUp && elevator.components.sound__voicedown)
          elevator.components.sound__voicedown.playSound();
        await sleep(1500);

        if (elevator.components.sound__voicedoorclose)
          elevator.components.sound__voicedoorclose.playSound();
        await sleep(2000);

        playLiftAnimation('DoorClose');
        isDoorsOpen = false;
        await sleep(2000);
      }

      // Phase 2: Start transit visuals
      updateAllDisplays(currFloor, screenDir);

      const firstFloorPlane  = document.querySelector('#first-floor');
      const lowerFloorPlane  = document.querySelector('#lower-floor');
      const middleFloorPlane = document.querySelector('#middle-floor');
      const upperFloorPlane  = document.querySelector('#upper-floor');
      const scrollingShaft   = document.querySelector('#scrolling-shaft');

      if (!isSilentMove) {
        firstFloorPlane.setAttribute('visible', 'false');
        lowerFloorPlane.setAttribute('visible', 'false');
        middleFloorPlane.setAttribute('visible', 'false');
        upperFloorPlane.setAttribute('visible', 'false');
        scrollingShaft.setAttribute('visible', 'true');
        scrollingShaft.setAttribute('texture-scroller', `active: true; direction: ${scrollDir}`);
      } else {
        setFloorBackdrop(1);
      }

      if (elevator.components.sound) {
        elevator.setAttribute('sound', 'volume', 0);
        elevator.components.sound.playSound();
        elevator.emit('fade-in');
      }

      // Phase 3: Tick floor counter until destination reached
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (window.isSimulationFrozen) return;
          currFloor += isGoingUp ? 1 : -1;
          updateAllDisplays(currFloor, screenDir);
          if (currFloor === destFloor) { clearInterval(interval); resolve(); }
        }, 2800);
      });

      // Phase 4: Arrival — swap shaft scroll for static floor image
      if (!isSilentMove) {
        scrollingShaft.setAttribute('texture-scroller', 'active: false');
        scrollingShaft.setAttribute('visible', 'false');

        setFloorBackdrop(currFloor);
      }

      if (elevator.components.sound) {
        elevator.emit('fade-out');
        setTimeout(() => { elevator.components.sound?.stopSound(); }, 2000);
      }

      updateAllDisplays(currFloor, 'idle');
      await sleep(1000);

      if (elevator.components.sound__ding) elevator.components.sound__ding.playSound();
      await sleep(800);

      playLiftAnimation('DoorOpen');
      isDoorsOpen = true;
      isMoving    = false;
    };

    // Convenience shortcuts (used by VR controller / external callers)
    window.openLift  = () => playLiftAnimation('DoorOpen');
    window.closeLift = () => playLiftAnimation('DoorClose');


    // ── Sequence Steps ───────────────────────────────────────────────────────

    async function playSequence() {
      replayBtnContainer.style.display = 'none';
      hasSequenceCompleted = false;
      isSequenceRunning = true;
      setMovementEnabled(false);

      currFloor = startFloor;
      isMoving = false;
      isDoorsOpen = false;

      if (window.resetEnvironmentState) window.resetEnvironmentState(startFloor);

      const rig      = document.querySelector('#rig');
      const npc1     = document.querySelector('#avatarModelSophie');
      const mainChar = document.querySelector('#mainCharacterEntity');

      // Reset rig, camera, body, and NPC to starting positions
      rig.removeAttribute('movement-controls');
      rig.setAttribute('position', '-4.5 1.8 0');
      rig.setAttribute('rotation', '0 -90 0');

      const cameraEl = rig.querySelector('[camera]');
      if (cameraEl?.components['look-controls']) {
        cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
        cameraEl.components['look-controls'].yawObject.rotation.y  = 0;
      }

      const bodyWrapper = document.querySelector('#bodyWrapper');
      if (bodyWrapper) bodyWrapper.object3D.rotation.y = 0;

      setNpcVisible(true);
      npc1.removeAttribute('curve-walk');
      npc1.setAttribute('position', '-3 1.065 -0.2');
      npc1.setAttribute('rotation', '0 90 0');
      npc1.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

      mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');

      // Pre-register animations that will be triggered via events
      rig.setAttribute('animation__panIn',   'property: position; to: 0.3 1.8 0;   startEvents: panCameraIn;      dur: 7000; easing: easeInOutQuad');
      rig.setAttribute('animation__panOut',  'property: position; to: -4.5 1.8 0;  startEvents: panCameraOut;     dur: 7000; easing: easeInOutQuad');
      rig.setAttribute('animation__turn',    'property: rotation; to: 0 90 0;       startEvents: turnCameraAround; dur: 4000; easing: easeInOutQuad');
      npc1.setAttribute('animation__walkin', 'property: position; to: -0.3 1.065 -0.6; startEvents: npcWalkIn;   dur: 3500; easing: linear');
      npc1.setAttribute('animation__turn',   'property: rotation; to: 0 -90 0;      startEvents: npcTurn;         dur: 2000; easing: easeInOutQuad');

      // ── Step 1: Silent reposition to Floor 1
      await sleep(1500);
      
      console.log('[seq01] Moving to Floor 1 (silent)…');
      await window.goToFloor(1, true);
      if (!isDoorsOpen) {
        playLiftAnimation('DoorOpen');
        isDoorsOpen = true;
      }
      await sleep(2000);

      // ── Step 2: NPC walks into the lift
      console.log('[seq01] NPC walk-in…');
      npc1.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      npc1.emit('npcWalkIn');
      await sleep(1500);

      // ── Step 3: Player pans into the lift
      console.log('[seq01] Panning camera in…');
      mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      rig.emit('panCameraIn');
      await sleep(1000);

      // ── Step 4: NPC turns to face the doors
      console.log('[seq01] NPC turning…');
      npc1.emit('npcTurn');
      npc1.setAttribute('animation-mixer', 'clip: turn; loop: once');
      npc1.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      await sleep(3000);

      // ── Step 5: Camera turns to face the doors
      // console.log('[seq01] Turning camera…');
      mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      // rig.emit('turnCameraAround');
      await sleep(2500);

      // ── Step 6: Ride to Floor 8 (intermediate stop)
      console.log('[seq01] Moving to Floor 8…');
      await window.goToFloor(8);
      await sleep(3000);

      // ── Step 7: NPC exits at Floor 8
      console.log('[seq01] NPC walk-out…');
      npc1.setAttribute('curve-walk', 'p1: -4 1.065 1; p2: -8 1.065 -6; dur: 6000; startEvent: npcWalkOut');
      npc1.emit('npcWalkOut');
      mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

      // ── Step 8: Continue to Floor 15 (destination)
      console.log('[seq01] Moving to Floor 15…');
      await window.goToFloor(15);
      await sleep(2000);

      // ── Step 9: Player exits the lift
      console.log('[seq01] Panning camera out…');
      mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
      rig.emit('panCameraOut');
      await sleep(4000);
      mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

      // ── Done
      console.log('[seq01] Sequence complete.');
      isSequenceRunning = false;
      hasSequenceCompleted = true;
      setMovementEnabled(true);
      replayBtnContainer.style.display = 'block';
    }


    // ── Event Listeners ──────────────────────────────────────────────────────

    const onStartSequence = evt => {
      if (window.isMenuOpen || isSequenceRunning) return;
      currentSequenceKey = evt.detail?.key || currentSequenceKey || 'easy-without-npcs';
      window.activeSequenceKey = currentSequenceKey;
      if (isDoorsOpen) { playLiftAnimation('DoorClose'); isDoorsOpen = false; }
      if (!isMoving && !window.isSimulationFrozen) {
        if (currentSequenceKey === 'easy-standard') playSequence();
        else playWithoutNpcSequence();
      }
    };

    const onFreezeSequence = () => {
      if (window.isMenuOpen) return;
      if (hasSequenceCompleted) {
        window.showSequenceMenu();
        return;
      }

      window.isSimulationFrozen = !window.isSimulationFrozen;

      const rig            = document.querySelector('#rig');
      const npc1           = document.querySelector('#avatarModelSophie');
      const mainChar       = document.querySelector('#mainCharacterEntity');
      const scrollingShaft = document.querySelector('#scrolling-shaft');

      if (window.isSimulationFrozen) {
        console.log('[seq01] FROZEN');
        npc1?.pause();
        mainChar?.components?.['animation-mixer']?.pause?.();
        setEntityAnimationsPaused(rig, true);
        scrollingShaft?.pause();
        elevator.components.sound?.pauseSound();
      } else {
        console.log('[seq01] RESUMED');
        npc1?.play();
        mainChar?.components?.['animation-mixer']?.play?.();
        setEntityAnimationsPaused(rig, false);
        scrollingShaft?.play();
        if (isMoving) elevator.components.sound?.playSound();
      }
    };

    const onKeyDown = evt => {
      if (window.isMenuOpen) return;
      if (evt.key === 'a' || evt.key === 'A') {
        if (hasSequenceCompleted) window.dispatchEvent(new Event('vr-start-sequence'));
      } else if (evt.key === 'x' || evt.key === 'X') {
        if (hasSequenceCompleted) window.showSequenceMenu();
        else window.dispatchEvent(new Event('vr-freeze-sequence'));
      }
    };

    const onReplayClick = () => {
      if (isDoorsOpen) { playLiftAnimation('DoorClose'); isDoorsOpen = false; }
      playSequence();
    };

    const onAssetsLoaded = () => {
      console.log('[seq01] 3D assets fully loaded.');
      updateAllDisplays(currFloor, 'idle');

      const menuContainer = document.querySelector('#vr-menu-container');

      setFloorBackdrop(currFloor);
      setNpcVisible(false);

      loadingOverlay.style.display = 'none';
      replayBtnContainer.style.display = 'none';

      if (menuContainer) {
        window.showSequenceMenu();
        menuContainer.setAttribute('animation__fadein',
          'property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 400; easing: easeOutQuad');
      }
    };

    window.addEventListener('vr-start-sequence', onStartSequence);
    window.addEventListener('vr-freeze-sequence', onFreezeSequence);
    window.addEventListener('keydown', onKeyDown);
    replayBtn.addEventListener('click', onReplayClick);
    assets.addEventListener('loaded', onAssetsLoaded);

    window.Sequence01.teardown = function () {
      window.removeEventListener('vr-start-sequence', onStartSequence);
      window.removeEventListener('vr-freeze-sequence', onFreezeSequence);
      window.removeEventListener('keydown', onKeyDown);
      replayBtn.removeEventListener('click', onReplayClick);
      assets.removeEventListener('loaded', onAssetsLoaded);
      window.showSequenceMenu = undefined;
      window.goToFloor = undefined;
    };

  } // end init()

}; // end window.Sequence01
