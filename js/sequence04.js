// ════════════════════════════════════════════════════════════════════════════
// sequence04.js  ·  normal
// Uses the SequenceBase architecture.
// ════════════════════════════════════════════════════════════════════════════

window.Sequence04 = new (class extends window.SequenceBase {

  constructor() {
    super({
      key: 'normal',
      startFloor: 4,
    });

    this.npcConfigs = [
      {
        selector: '#avatarModelJoe',
        resetPosition: '-2.909 1.065 -0.735',
        resetRotation: '0 90 0',
        enterCurve: { p1: '-3 1.065 0', p2: '0.650 1.065 -0.044' },
        enterDelay: 0,
        exitCurve: { p1: '-3 1.065 1', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },
      {
        selector: '#avatarModelLouise',
        resetPosition: '-3.196 1.065 1.935',
        resetRotation: '0 90 0',
        enterCurve: { p1: '-3 1.065 0', p2: '0.1 1.065 -0.892' },
        enterDelay: 800,
        exitCurve: { p1: '-2.5 1.065 1.5', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },
      {
        selector: '#avatarModelJosh',
        resetPosition: '-4.779 1.065 0.680',
        resetRotation: '0 90 0',
        enterCurve: { p1: '-2 1.065 -0.5', p2: '-1.0 1.065 0.835' },
        enterDelay: 1600,
        exitCurve: { p1: '-2.5 1.065 -2', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },
      {
        selector: '#avatarModelJody',
        resetPosition: '-4.163 1.065 1.493',
        resetRotation: '0 90 0',
        enterCurve: { p1: '-3 1.065 0', p2: '-1 1.065 -0.05' },
        enterDelay: 3600,
        exitCurve: { p1: '-2.5 1.065 -0.5', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      }
    ];
  }

  cacheDOM() {
    super.cacheDOM();
    this.npcConfigs.forEach(npc => {
      npc.el = document.querySelector(npc.selector);
    });

    this.avatars = this.npcConfigs.map(npc => npc.el).filter(Boolean);
  }

  setNpcVisible(visible) {
    if (this.avatars) {
      this.avatars.forEach(avatar => avatar.setAttribute('visible', visible));
    }
  }

  async executeTimeline() {
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'none';
    this.hasSequenceCompleted = false;
    this.isSequenceRunning = true;
    this.setMovementEnabled(false);

    this.currFloor = this.startFloor;
    this.isMoving = false;
    this.isDoorsOpen = false;

    if (window.resetEnvironmentState) window.resetEnvironmentState(this.startFloor);

    this.rig.removeAttribute('movement-controls');
    this.rig.setAttribute('position', '-3.965 1.87 0.331');
    this.rig.setAttribute('rotation', '0 -90 0');

    const cameraEl = this.rig.querySelector('[camera]');
    if (cameraEl?.components['look-controls']) {
      cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
      cameraEl.components['look-controls'].yawObject.rotation.y = 0;
    }

    const bodyWrapper = document.querySelector('#bodyWrapper');
    if (bodyWrapper) bodyWrapper.object3D.rotation.y = 0;

    this.setNpcVisible(true);

    // --- FIX: Hide Josh initially ---
    const joshConfig = this.npcConfigs.find(npc => npc.selector === '#avatarModelJosh');
    if (joshConfig?.el) {
      joshConfig.el.setAttribute('visible', false);
    }

    this.npcConfigs.forEach(npc => {
      if (npc.el) {
        npc.el.removeAttribute('curve-walk');
        npc.el.setAttribute('position', npc.resetPosition || '-3 1.065 -0.2');
        npc.el.setAttribute('rotation', npc.resetRotation || '0 90 0');
        npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }
    });

    if (this.mainChar) {
      this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
    }

    this.rig.setAttribute('animation__panIn', 'property: position; to: 0.862 1.87 0.610; startEvents: panCameraIn; dur: 7000; easing: easeInOutQuad');
    this.rig.setAttribute('animation__panOut', 'property: position; to: -4.5 1.87 0; startEvents: panCameraOut; dur: 7000; easing: easeInOutQuad');
    this.rig.setAttribute('animation__turn', 'property: rotation; to: 0 90 0; startEvents: turnCameraAround; dur: 4000; easing: easeInOutQuad');

    this.npcConfigs.forEach(npc => {
      if (npc.el) {
        npc.el.setAttribute('animation__turn', 'property: rotation; to: 0 -90 0; startEvents: npcTurn; dur: 2000; easing: easeInOutQuad');
      }
    });

    await this.sleep(1500);
    console.log('[seq04] Moving to Floor 1 (silent)…');
    await this.goToFloor(1, true);

    if (!this.isDoorsOpen) {
      this.playLiftAnimation('DoorOpen');
      this.isDoorsOpen = true;
    }
    await this.sleep(2000);

    console.log('[seq04] Floor 1: Characters entering and turning…');

    const npcEnterDur = 3500;
    const mainCharEnterDelay = 1200;
    const mainCharWalkDur = 7000;

    // 1. Main Character Enters
    setTimeout(() => {
      console.log('[seq04] Panning camera in…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      this.rig.emit('panCameraIn');

      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }, mainCharWalkDur);
    }, mainCharEnterDelay);

    // 1. 3 NPCs (Louise, Joe, Jody) Enter (excluding Josh)
    this.npcConfigs.forEach((npc) => {
      if (!npc.el) return;
      if (npc.selector === '#avatarModelJosh') return; // Josh does not enter at level 1

      setTimeout(() => {
        npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        const enterCurveStr = `p1: ${npc.enterCurve.p1}; p2: ${npc.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
        npc.el.setAttribute('curve-walk', enterCurveStr);
        npc.el.emit('npcWalkIn');

        // --- FIX: Rely solely on A-Frame rotation for turn ---
        setTimeout(() => {
          npc.el.emit('npcTurn');
          npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
        }, npcEnterDur);
      }, npc.enterDelay);
    });

    await this.sleep(12000);

    // 2. Level 3: Jody exits
    console.log('[seq04] Moving to Floor 3…');
    await this.goToFloor(3, false);
    await this.sleep(3000);

    console.log('[seq04] Jody walking out…');
    const jody = this.npcConfigs.find(npc => npc.selector === '#avatarModelJody');
    if (jody?.el) {
      jody.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      jody.el.removeAttribute('curve-walk');
      const curveStr = `p1: ${jody.exitCurve.p1}; p2: ${jody.exitCurve.p2}; dur: ${jody.exitCurve.dur}; startEvent: npcWalkOut`;
      jody.el.setAttribute('curve-walk', curveStr);
      jody.el.emit('npcWalkOut');
    }
    await this.sleep(7000);

    // 3. Level 5: Josh enters
    console.log('[seq04] Moving to Floor 5…');
    
    // --- FIX: Use setTimeout to delay visibility until doors are fully closed ---
    const josh = this.npcConfigs.find(npc => npc.selector === '#avatarModelJosh');
    if (josh?.el) {
      setTimeout(() => {
        josh.el.setAttribute('visible', true);
      }, 12000); 
    }

    // The lift starts its sequence to move to floor 5
    await this.goToFloor(5, false);
    await this.sleep(3000);

    console.log('[seq04] Josh entering…');
    if (josh?.el) {
      josh.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      const enterCurveStr = `p1: ${josh.enterCurve.p1}; p2: ${josh.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
      josh.el.setAttribute('curve-walk', enterCurveStr);
      josh.el.emit('npcWalkIn');

      // --- FIX: Rely solely on A-Frame rotation for turn ---
      setTimeout(() => {
        josh.el.emit('npcTurn');
        josh.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
      }, npcEnterDur);
    }
    await this.sleep(7000);

    // 4. Level 8: Louise exits
    console.log('[seq04] Moving to Floor 8…');
    await this.goToFloor(8, false);
    await this.sleep(3000);

    console.log('[seq04] Louise walking out…');
    const louise = this.npcConfigs.find(npc => npc.selector === '#avatarModelLouise');

    if (louise?.el) {
      setTimeout(() => {
        louise.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        louise.el.removeAttribute('curve-walk');
        const curveStr = `p1: ${louise.exitCurve.p1}; p2: ${louise.exitCurve.p2}; dur: ${louise.exitCurve.dur}; startEvent: npcWalkOut`;
        louise.el.setAttribute('curve-walk', curveStr);
        louise.el.emit('npcWalkOut');
      }, 500);
    }
    await this.sleep(7000);


    // 4. Level 9: Joe exit
    console.log('[seq04] Moving to Floor 9…');
    await this.goToFloor(9, false);
    await this.sleep(3000);

    console.log('[seq04] Joe walking out…');
    const joe = this.npcConfigs.find(npc => npc.selector === '#avatarModelJoe');

    if (joe?.el) {
      setTimeout(() => {
        joe.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        joe.el.removeAttribute('curve-walk');
        const curveStr = `p1: ${joe.exitCurve.p1}; p2: ${joe.exitCurve.p2}; dur: ${joe.exitCurve.dur}; startEvent: npcWalkOut`;
        joe.el.setAttribute('curve-walk', curveStr);
        joe.el.emit('npcWalkOut');
      }, 1200);
    }
    await this.sleep(7000);


    // 5. Level 13: Josh exits
    console.log('[seq04] Moving to Floor 13…');
    await this.goToFloor(13, false);
    await this.sleep(3000);

    console.log('[seq04] Josh walking out…');
    if (josh?.el) {
      josh.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      josh.el.removeAttribute('curve-walk');
      const curveStr = `p1: ${josh.exitCurve.p1}; p2: ${josh.exitCurve.p2}; dur: ${josh.exitCurve.dur}; startEvent: npcWalkOut`;
      josh.el.setAttribute('curve-walk', curveStr);
      josh.el.emit('npcWalkOut');
    }
    await this.sleep(7000);

    // 6. Level 15: MainChar exits
    console.log('[seq04] Moving to Floor 15…');
    await this.goToFloor(15, false);
    await this.sleep(3000);

    console.log('[seq04] Main character walking out…');
    setTimeout(() => {
      console.log('[seq04] Panning camera out…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
      this.rig.emit('panCameraOut');

      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }, mainCharWalkDur);
    }, 500);

    await this.sleep(10000);

    console.log('[seq04] Sequence complete.');
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = true;
    this.setMovementEnabled(true);
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'block';
  }

})();