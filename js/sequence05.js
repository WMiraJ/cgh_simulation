// ════════════════════════════════════════════════════════════════════════════
// sequence05.js  ·  hard
// Uses the SequenceBase architecture.
// ════════════════════════════════════════════════════════════════════════════

window.Sequence05 = new (class extends window.SequenceBase {

  constructor() {
    super({
      key: 'hard',
      startFloor: 4,
    });

    this.npcConfigs = [
      { selector: '#avatarModelJoe',
        resetPosition: '-2.909 1.065 -0.735',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '0.650 1.065 -0.044'},
        enterDelay: 0,
        exitCurve: { p1: '-5 1.065 -0.8', p2: '-4 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelMegan',
        resetPosition: '-3 1.065 -1.505',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3.2 1.065 0.94', p2: '0.862 1.065 -0.930'},
        enterDelay: 800,
        exitCurve: { p1: '-5.08 1.065 2.32', p2: '-4 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelSophie',
        resetPosition: '-3.333 1.065 -0.2',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-0.008 1.065 -0.411'},
        enterDelay: 1600,
        exitCurve: { p1: '-4.83 1.065 -0.47', p2: '-4 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },
  
      { selector: '#avatarModelLouise',
        resetPosition: '-3.290 1.065 1.922',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-2.74 1.065 0.27', p2: '-1.057 1.065 -0.892'},
        enterDelay: 2400,
        exitCurve: { p1: '-2.87 1.065 2.12', p2: '-4 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelBryce',
        resetPosition: '-3.886 1.065 0.913',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 -0.3', p2: '-0.088 1.065 0.585'},
        enterDelay: 3200,
        exitCurve: { p1: '-4.44 1.065 -1.8', p2: '-4 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelMartha',
        resetPosition: '-4.409 1.065 -0.8',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-2.5 1.065 0.53', p2: '0.298 1.065 -1.110'},
        enterDelay: 4800,
        exitCurve: { p1: '-4.83 1.065 2.64', p2: '-4 1.065 -6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelJosh',
        resetPosition: '-4.779 1.065 0.680',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-1.76 1.065 -0.58', p2: '-1.0 1.065 0.835'},
        enterDelay: 5600,
        exitCurve: { p1: '-3.64 1.065 -2.38', p2: '-4 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
      },

      { selector: '#avatarModelJody',
        resetPosition: '-5.233 1.065 -0.2',
        resetRotation: '0 90 0',
        enterCurve: {p1: '-3 1.065 0', p2: '-0.572 1.065 -0.048'},
        enterDelay: 6400,
        exitCurve: { p1: '-4.5 1.065 -0.9', p2: '-4 1.065 6', dur: 6000, startEvent: 'npcWalkOut' }
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

    // Hide everyone except Joe and Megan initially
    this.npcConfigs.forEach(npc => {
      if (npc.selector !== '#avatarModelJoe' && npc.selector !== '#avatarModelMegan') {
        npc.el.setAttribute('visible', false);
      }
    });

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

    this.rig.setAttribute('animation__panIn', 'property: position; to: 0.667 1.87 0.918; startEvents: panCameraIn; dur: 10500; easing: easeInOutQuad');
    this.rig.setAttribute('animation__panOut', 'property: position; to: -4 1.87 0; startEvents: panCameraOut; dur: 10500; easing: easeInOutQuad');
    this.rig.setAttribute('animation__turn', 'property: rotation; to: 0 90 0; startEvents: turnCameraAround; dur: 4000; easing: easeInOutQuad');

    this.npcConfigs.forEach(npc => {
      if (npc.el) {
        npc.el.setAttribute('animation__turn', 'property: rotation; to: 0 -90 0; startEvents: npcTurn; dur: 2000; easing: easeInOutQuad');
      }
    });

    await this.sleep(1500);
    console.log('[seq05] Moving to Floor 1 (silent)…');
    await this.goToFloor(1, true);

    if (!this.isDoorsOpen) {
      this.playLiftAnimation('DoorOpen');
      this.isDoorsOpen = true;
    }
    await this.sleep(2000);

    console.log('[seq05] Floor 1: Characters entering and turning…');

    const npcEnterDur = 3500;
    const mainCharEnterDelay = 1200;
    const mainCharWalkDur = 10500;

    // 1. Main Character Enters
    setTimeout(() => {
      console.log('[seq05] Panning camera in…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      this.rig.emit('panCameraIn');

      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }, mainCharWalkDur);
    }, mainCharEnterDelay);

    // 1. 2 NPCs (Joe, Megan) Enter
    this.npcConfigs.forEach((npc) => {
      if (!npc.el) return;
      if (npc.selector !== '#avatarModelJoe' && npc.selector !== '#avatarModelMegan') return; 

      setTimeout(() => {
        npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        const enterCurveStr = `p1: ${npc.enterCurve.p1}; p2: ${npc.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
        npc.el.setAttribute('curve-walk', enterCurveStr);
        npc.el.emit('npcWalkIn');

        setTimeout(() => {
          npc.el.emit('npcTurn');
          npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
        }, npcEnterDur);
      }, npc.enterDelay);
    });

    await this.sleep(12000);

    // 2. Level 4: 2 NPCs enter (Sophie, Bryce)
    console.log('[seq05] Moving to Floor 4…');

    const sophie = this.npcConfigs.find(npc => npc.selector === '#avatarModelSophie');
    const bryce = this.npcConfigs.find(npc => npc.selector === '#avatarModelBryce');
    
    [sophie, bryce].forEach(npc => {
      if (npc?.el) {
        setTimeout(() => {
          npc.el.setAttribute('visible', true);
        }, 12000);
      }
    });

    await this.goToFloor(4, false);
    await this.sleep(3000); // Wait for doors to open

    console.log('[seq05] Sophie and Bryce walking in…');
    [sophie, bryce].forEach((npc, index) => {
      if (npc?.el) {
        const enterStagger = index * 1000; 

        setTimeout(() => {
          npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
          npc.el.removeAttribute('curve-walk');
          
          const curveStr = `p1: ${npc.enterCurve.p1}; p2: ${npc.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
          npc.el.setAttribute('curve-walk', curveStr);
          npc.el.emit('npcWalkIn');

          setTimeout(() => {
            npc.el.emit('npcTurn');
            npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
          }, npcEnterDur);
        }, enterStagger);
      }
    });
    
    await this.sleep(7000);

    // 3. level 5: 1 NPC enters (Martha)
    console.log('[seq05] Moving to Floor 5…')

    const martha = this.npcConfigs.find(npc => npc.selector === '#avatarModelMartha');

    if(martha?.el){
        setTimeout(() => {
          martha.el.setAttribute('visible', true);
        }, 12000);
      }

    await this.goToFloor(5, false);
    await this.sleep(3000); // Wait for doors to open

    console.log('[seq05] Martha walking in…');
    if (martha?.el) {

      setTimeout(() => {
        martha.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        martha.el.removeAttribute('curve-walk');
          
        const curveStr = `p1: ${martha.enterCurve.p1}; p2: ${martha.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
        martha.el.setAttribute('curve-walk', curveStr);
        martha.el.emit('npcWalkIn');

        setTimeout(() => {
          martha.el.emit('npcTurn');
          martha.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
        }, npcEnterDur);
      }, 0);
    };

    await this.sleep(7000);

    // 4. Level 8: 2 NPCs enter (Josh, Jody)
    console.log('[seq05] Moving to Floor 8…');

    const josh = this.npcConfigs.find(npc => npc.selector === '#avatarModelJosh');
    const jody = this.npcConfigs.find(npc => npc.selector === '#avatarModelJody');
    
    [josh, jody].forEach(npc => {
      if (npc?.el) {
        setTimeout(() => {
          npc.el.setAttribute('visible', true);
        }, 12000);
      }
    });

    await this.goToFloor(8, false);
    await this.sleep(3000); // Wait for doors to open

    console.log('[seq05] Josh and Jody walking in…');
    [josh, jody].forEach((npc, index) => {
      if (npc?.el) {
        const enterStagger = index * 1000;

        setTimeout(() => {
          npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
          npc.el.removeAttribute('curve-walk');
          
          const curveStr = `p1: ${npc.enterCurve.p1}; p2: ${npc.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
          npc.el.setAttribute('curve-walk', curveStr);
          npc.el.emit('npcWalkIn');

          setTimeout(() => {
            npc.el.emit('npcTurn');
            npc.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
          }, npcEnterDur);
        }, enterStagger);
      }
    });

    await this.sleep(7000);

    // 5. Level 10: 1 NPC enters (Louise)
    console.log('[seq05] Moving to Floor 10…')

    const louise = this.npcConfigs.find(npc => npc.selector === '#avatarModelLouise');

    if(louise?.el){
        setTimeout(() => {
          louise.el.setAttribute('visible', true);
        }, 12000);
      }

    await this.goToFloor(10, false);
    await this.sleep(3000); // Wait for doors to open

    console.log('[seq05] Louise walking in…');
    if (louise?.el) {

      setTimeout(() => {
        louise.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        louise.el.removeAttribute('curve-walk');
          
        const curveStr = `p1: ${louise.enterCurve.p1}; p2: ${louise.enterCurve.p2}; dur: ${npcEnterDur}; startEvent: npcWalkIn`;
        louise.el.setAttribute('curve-walk', curveStr);
        louise.el.emit('npcWalkIn');

        setTimeout(() => {
          louise.el.emit('npcTurn');
          louise.el.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
        }, npcEnterDur);
      }, 0);
    };

    await this.sleep(7000);

    // 6. Level 11: a "False Stop"
    console.log('[seq05] Moving to Floor 11…');
    await this.goToFloor(11, false);
    await this.sleep(3000);

    console.log("[seq05] False stop, lift continues to move…")
    await this.sleep(7000);


    // 7. Level 15: Josh exits
    console.log('[seq05] Moving to Floor 15…');
    await this.goToFloor(15, false);
    await this.sleep(3000);

    console.log('[seq05] Josh walking out…');
    if (josh?.el) {
      josh.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      josh.el.removeAttribute('curve-walk');
      const curveStr = `p1: ${josh.exitCurve.p1}; p2: ${josh.exitCurve.p2}; dur: ${josh.exitCurve.dur}; startEvent: npcWalkOut`;
      josh.el.setAttribute('curve-walk', curveStr);
      josh.el.emit('npcWalkOut');
    }
    await this.sleep(7000);

    // 8. The express ride: life goes to level 50
    console.log('[seq05] Moving to Floor 50…');
    await this.goToFloor(50, false);
    await this.sleep(3000);

    console.log('[seq05] Characters walking out…');
    
    // Josh exited earlier on Floor 15. We exclude him from the final exit pool.
    const exitedNpcs = ['#avatarModelJosh']; 
    let remainingNpcs = this.npcConfigs.filter(npc => !exitedNpcs.includes(npc.selector));

    // Sort remaining NPCs by enterDelay descending to reverse the walk-in sequence
    remainingNpcs.sort((a, b) => b.enterDelay - a.enterDelay);

    // A) NPCs Exit First in Reverse Entry Order
    remainingNpcs.forEach((npc, index) => {
      if (!npc.el) return;

      const exitDelay = 500 + (index * 1000); 
      
      setTimeout(() => {
        npc.el.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
        npc.el.removeAttribute('curve-walk');
        
        const curveStr = `p1: ${npc.exitCurve.p1}; p2: ${npc.exitCurve.p2}; dur: ${npc.exitCurve.dur}; startEvent: npcWalkOut`;
        npc.el.setAttribute('curve-walk', curveStr);
        npc.el.emit('npcWalkOut');
      }, exitDelay);
    });

    // B) Main Character Exits After NPCs
    const mainCharExitDelay = 500 + (remainingNpcs.length * 1000); // Delayed until the last NPC starts moving
    
    setTimeout(() => {
      console.log('[seq05] Panning camera out…');
      if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
      this.rig.emit('panCameraOut');
      
      setTimeout(() => {
        if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      }, mainCharWalkDur);
    }, mainCharExitDelay);

    // Wait for all exit animations to finish dynamically based on the final main character exit timing
    const maxNpcExitDelay = 500 + ((remainingNpcs.length - 1) * 1000) + 6000;
    const mainExitTotalDuration = mainCharExitDelay + mainCharWalkDur;
    await this.sleep(Math.max(maxNpcExitDelay, mainExitTotalDuration) + 1000);

    console.log('[seq05] Sequence complete.');
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = true;
    this.setMovementEnabled(true);
  }
  
})();