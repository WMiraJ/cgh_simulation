// ════════════════════════════════════════════════════════════════════════════
// sequence02.js  ·  easy-without-npcs
// Uses the SequenceBase architecture.
// ════════════════════════════════════════════════════════════════════════════

window.Sequence02 = new (class extends window.SequenceBase {
  
  constructor() {
    super({
      key: 'easy-without-npcs',
      startFloor: 2,
      npcSelector: null // No NPC to cache
    });
  }

  async executeTimeline() {
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'none';
    this.hasSequenceCompleted = false;
    this.isSequenceRunning = true;
    this.setMovementEnabled(false);

    this.currFloor = this.startFloor;
    this.isMoving = false;
    this.resetLiftDoorState();

    if (window.resetEnvironmentState) window.resetEnvironmentState(this.startFloor);

    // Reset rig, camera, and body to starting positions
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
    
    this.rig.setAttribute('animation__turn', {
      property: 'rotation',
      to: { x: 0, y: 90, z: 0 },
      startEvents: 'turnCameraAround',
      dur: 4000,
      easing: 'easeInOutQuad'
    });

    // ── Step 1: Silent reposition to Floor 1
    await this.sleep(1500);
    console.log('[seq02] Moving to Floor 1 (silent)…');
    await this.goToFloor(1, true);
    
    if (!this.isDoorsOpen) {
      this.playLiftAnimation('DoorOpen');
      this.isDoorsOpen = true;
    }
    await this.sleep(2000);

    // ── Step 2: Player pans into the lift
    console.log('[seq02] Panning camera in…');
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat; timeScale: 0.8');
    this.rig.emit('panCameraIn');
    await this.sleep(4500);
    
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
    await this.sleep(2000);

    // ── Step 3: Ride to Floor 15 (destination)
    console.log('[seq02] Moving to Floor 15…');
    await this.goToFloor(15);
    await this.sleep(3000);

    // ── Step 4: Player exits the lift
    console.log('[seq02] Panning camera out…');
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: walk; loop: repeat');
    this.rig.emit('panCameraOut');
    await this.sleep(4000);
    
    if (this.mainChar) this.mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');

    // ── Done
    console.log('[seq02] Sequence complete.');
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = true;
    this.setMovementEnabled(true);
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'block';
  }

})();