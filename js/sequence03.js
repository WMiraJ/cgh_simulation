// ════════════════════════════════════════════════════════════════════════════
// sequence03.js  ·  easy-with-all-npcs
// Uses the SequenceBase architecture.
// ════════════════════════════════════════════════════════════════════════════

window.Sequence03 = new (class extends window.SequenceBase {
  
  constructor() {
    super({
      key: 'easy-with-all-npcs',
      startFloor: 2,
    });

    this.npcConfigs = [
      { selector: '#avatarModelJoe',
        resetPosition: '-2.909 1.065 -0.735',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '0.650 1.065 -0.044'},
        enterDelay: 0,
        exitCurve: { p1: '-2.5 1.065 1.5', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelMegan',
        resetPosition: '-3 1.065 -1.505',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '0.667 1.065 0.918'},
        enterDelay: 800,
        exitCurve: { p1: '-2.5 1.065 1.5', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },
      { selector: '#avatarModelSophie',
        resetPosition: '-3.333 1.065 -0.2',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '0.975 1.065 -0.915'},
        enterDelay: 1600,
        exitCurve: { p1: '-2.5 1.065 -1.5', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },
  
      { selector: '#avatarModelLouise',
        resetPosition: '-3.290 1.065 1.922',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '0.1 1.065 -0.892'},
        enterDelay: 2400,
        exitCurve: { p1: '-2.5 1.065 1.5', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelBryce',
        resetPosition: '-3.886 1.065 0.913',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-0.088 1.065 0.585'},
        enterDelay: 3200,
        exitCurve: { p1: '-2.5 1.065 -1.5', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelMartha',
        resetPosition: '-4.409 1.065 -1.114',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-0.847 1.065 -1.110'},
        enterDelay: 4800,
        exitCurve: { p1: '-2.5 1.065 1.5', p2: '-8 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelJosh',
        resetPosition: '-4.779 1.065 0.680',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-1.0 1.065 0.835'},
        enterDelay: 5600,
        exitCurve: { p1: '-2.5 1.065 -1.5', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelJody',
        resetPosition: '-5.233 1.065 -0.2',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-1.165 1.065 0'},
        enterDelay: 6400,
        exitCurve: { p1: '-2.5 1.065 -0.5', p2: '-8 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      }
    ];
  }

  // Override cacheDOM to grab all 8 NPCs
  cacheDOM() {
    super.cacheDOM(); 
    this.npcConfigs.forEach(npc => {
      npc.el = document.querySelector(npc.selector);
    });

    this.avatars = this.npcConfigs.map(npc => npc.el).filter(Boolean);
  }

  // Override visibility toggle to affect the whole crowd
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

    // Reset rig, camera, body, and NPC to starting positions
    this.rig.removeAttribute('movement-controls');
    this.rig.setAttribute('position', '-4.194 1.87 -0.015');
    this.rig.setAttribute('rotation', '0 -90 0');

    const cameraEl = this.rig.querySelector('[camera]');
    if (cameraEl?.components['look-controls']) {
      cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
      cameraEl.components['look-controls'].yawObject.rotation.y  = 0;
    }

    const bodyWrapper = document.querySelector('#bodyWrapper');
    if (bodyWrapper) bodyWrapper.object3D.rotation.y = 0;

    this.setNpcVisible(true);

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

    // Pre-register animations
    this.rig.setAttribute('animation__panIn',   'property: position; to: -0.337 1.87 -0.127;   startEvents: panCameraIn;      dur: 7000; easing: easeInOutQuad');
    this.rig.setAttribute('animation__panOut',  'property: position; to: -4.5 1.87 0;  startEvents: panCameraOut;     dur: 7000; easing: easeInOutQuad');
    this.rig.setAttribute('animation__turn',    'property: rotation; to: 0 90 0;       startEvents: turnCameraAround; dur: 4000; easing: easeInOutQuad');
    
    // Pre-register the turn animation for ALL avatars
    this.npcConfigs.forEach(npc => {
      if (npc.el) {
        npc.el.setAttribute('animation__turn', 'property: rotation; to: 0 -90 0; startEvents: npcTurn; dur: 2000; easing: easeInOutQuad');
      }
    });

    // ── Step 1: Silent reposition to Floor 1
    await this.sleep(1500);
    console.log('[seq03] Moving to Floor 1 (silent)…');
    await this.goToFloor(1, true);
    
    if (!this.isDoorsOpen) {
      this.playLiftAnimation('DoorOpen');
      this.isDoorsOpen = true;
    }
    await this.sleep(2000);

    // ── Step 2: Characters Enter & Turn (Staggered together)
    console.log('[seq03] Characters entering and turning…');
    
    const npcEnterDur = 3500;
    const mainCharEnterDelay = 3600;
    const mainCharWalkDur = 7000;

    // A) Trigger Main Character Enter and Turn
    setTimeout(() => {
      console.log('[seq03] Panning camera in…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      this.rig.emit('panCameraIn');
      
      // MainChar turns immediately after panning in finishes
      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
        // this.rig.emit('turnCameraAround');
      }, mainCharWalkDur);
    }, mainCharEnterDelay);

    // B) Trigger NPCs Enter and Turn
    this.npcConfigs.forEach((npc) => {
      if (!npc.el) return;
      
      setTimeout(() => {
        // 1. Walk in (Using the fixed curve-walk logic)
        npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        const enterCurveStr = `p1: ${npc.enterCurve.p1}; p2: ${npc.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
        npc.el.setAttribute('curve-walk', enterCurveStr);
        npc.el.emit('npcWalkIn');
        
        // 2. Turn immediately after arriving
        setTimeout(() => {
          npc.el.emit('npcTurn');
          npc.el.setAttribute('animation-mixer', 'clip: turn; loop: once; timeScale:0.8; clampWhenFinished: true; crossFadeDuration: 0.2');
          
          // 3. Return to Idle once the 2000ms turn animation is done
          setTimeout(() => {
            npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
          }, 2000);
        }, npcEnterDur);
        
      }, npc.enterDelay); 
    });

    // Wait dynamically for the slowest sequence to finish (Enter + Walk Duration + Turn Duration)
    const maxNpcTime = Math.max(...this.npcConfigs.map(n => n.enterDelay)) + npcEnterDur + 2000;
    const maxMainTime = mainCharEnterDelay + mainCharWalkDur + 4000;
    await this.sleep(Math.max(maxNpcTime, maxMainTime) + 1500);

    // ── Step 3: Ride to Floor 15 (Directly)
    console.log('[seq03] Moving to Floor 15…');
    await this.goToFloor(15);
    await this.sleep(3000);

    // ── Step 4: Everyone Exits
    console.log('[seq03] Characters walking out…');
    
    // A) Main Character Exit
    setTimeout(() => {
      console.log('[seq03] Panning camera out…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
      this.rig.emit('panCameraOut');
      
      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }, mainCharWalkDur);
    }, 500); // Main char starts exiting first

    // B) NPCs Exit (Reverse Order)
    this.npcConfigs.forEach((npc, index) => {
      if (!npc.el) return;

      // Invert the index to calculate the delay. 
      // The last NPC gets the shortest delay, the first gets the longest.
      const reverseIndex = (this.npcConfigs.length - 1) - index;
      const exitDelay = 1000 + (reverseIndex * 800); 
      
      setTimeout(() => {
        npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        
        // Remove the previous enter curve before applying the exit curve
        npc.el.removeAttribute('curve-walk');
        
        const curveStr = `p1: ${npc.exitCurve.p1}; p2: ${npc.exitCurve.p2}; dur: ${npc.exitCurve.dur}; startEvent: npcWalkOut`;
        npc.el.setAttribute('curve-walk', curveStr);
        npc.el.emit('npcWalkOut');
      }, exitDelay);
    });

    // Wait for all exit animations to finish
    const maxExitDelay = 1000 + (this.npcConfigs.length * 800) + 6000;
    const mainExitDelay = 500 + mainCharWalkDur;
    await this.sleep(Math.max(maxExitDelay, mainExitDelay) + 1000);

    // ── Done
    console.log('[seq03] Sequence complete.');
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = true;
    this.setMovementEnabled(true);
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'block';
  }

})();