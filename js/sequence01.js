// ════════════════════════════════════════════════════════════════════════════
// sequence01.js  ·  easy-standard
// Uses the SequenceBase architecture.
// ════════════════════════════════════════════════════════════════════════════

window.Sequence01 = new (class extends window.SequenceBase {
  
  constructor() {
    super({
      key: 'easy-standard',
      startFloor: 2,
      npcSelector: '#avatarModelSophie' // Base class will dynamically cache this
    });
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
    const pos = this.rig.getAttribute('position');
    const currentY = pos.y; 

    this.rig.removeAttribute('movement-controls');
    
    // Set the starting position using an Object (bypasses string parsing bugs)
    this.rig.setAttribute('position', { x: -4.5, y: currentY, z: 0 });
    this.rig.setAttribute('rotation', '0 -90 0');

    const cameraEl = this.rig.querySelector('[camera]');
    if (cameraEl?.components['look-controls']) {
      cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
      cameraEl.components['look-controls'].yawObject.rotation.y  = 0;
    }

    const bodyWrapper = document.querySelector('#bodyWrapper');
    if (bodyWrapper) bodyWrapper.object3D.rotation.y = 0;

    if (this.mainChar) {
      this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat; crossFadeDuration: 0.2');
    }

    // Pre-register animations using strict Object syntax
    this.rig.setAttribute('animation__panIn', {
      property: 'position',
      to: { x: 0.3, y: currentY, z: 0 },
      startEvents: 'panCameraIn',
      dur: 7000,
      easing: 'easeInOutQuad'
    });

    this.rig.setAttribute('animation__panOut', {
      property: 'position',
      to: { x: -4.5, y: currentY, z: 0 },
      startEvents: 'panCameraOut',
      dur: 7000,
      easing: 'easeInOutQuad'
    });
    
    this.rig.setAttribute('animation__turn', 'property: rotation; to: 0 90 0; startEvents: turnCameraAround; dur: 4000; easing: easeInOutQuad');
    
    this.setNpcVisible(true);
    if (this.avatar) {
      // 1. Reset NPC starting position and state
      this.avatar.removeAttribute('curve-walk');
      this.avatar.setAttribute('position', '-3 1.065 -0.2');
      this.avatar.setAttribute('rotation', '0 90 0');
      this.avatar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
      
      // 2. Register standard string animations
      this.avatar.setAttribute('animation__walkin', 'property: position; to: -0.3 1.065 -0.6; startEvents: npcWalkIn;   dur: 3500; easing: linear');
      this.avatar.setAttribute('animation__turn',   'property: rotation; to: 0 -90 0;      startEvents: npcTurn;        dur: 2000; easing: easeInOutQuad');
    }

    // ── Step 1: Silent reposition to Floor 1
    await this.sleep(1500);
    console.log('[seq01] Moving to Floor 1 (silent)…');
    await this.goToFloor(1, true);
    
    if (!this.isDoorsOpen) {
      this.playLiftAnimation('DoorOpen');
      this.isDoorsOpen = true;
    }
    await this.sleep(2000);

    // ── Step 2: NPC walks into the lift
    console.log('[seq01] NPC walk-in…');
    if (this.avatar) {
      this.avatar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
      this.avatar.emit('npcWalkIn');
    }
    await this.sleep(1500);

    // ── Step 3: Player pans into the lift
    console.log('[seq01] Panning camera in…');
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
    this.rig.emit('panCameraIn');
    await this.sleep(1000);

    // ── Step 4: NPC turns to face the doors
    console.log('[seq01] NPC turning…');
    if (this.avatar) {
      this.avatar.emit('npcTurn');
      this.avatar.setAttribute('animation-mixer', 'clip: turn; loop: once');
      this.avatar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
    }
    await this.sleep(3000);

    // ── Step 5: Camera transitions
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
    await this.sleep(2500);

    // ── Step 6: Ride to Floor 8 (intermediate stop)
    console.log('[seq01] Moving to Floor 8…');
    await this.goToFloor(8);
    await this.sleep(3000);

    // ── Step 7: NPC exits at Floor 8
    console.log('[seq01] NPC walk-out…');
    if (this.avatar) {
      this.avatar.setAttribute('curve-walk', 'p1: -4 1.065 1; p2: -8 1.065 -6; dur: 6000; startEvent: npcWalkOut');
      this.avatar.emit('npcWalkOut');
    }
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

    // ── Step 8: Continue to Floor 15 (destination)
    console.log('[seq01] Moving to Floor 15…');
    await this.goToFloor(15);
    await this.sleep(2000);

    // ── Step 9: Player exits the lift
    console.log('[seq01] Panning camera out…');
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
    this.rig.emit('panCameraOut');
    await this.sleep(4000);
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

    // ── Done
    console.log('[seq01] Sequence complete.');
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = true;
    this.setMovementEnabled(true);
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'block';
  }

})();