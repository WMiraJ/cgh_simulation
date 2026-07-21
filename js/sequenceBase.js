// ════════════════════════════════════════════════════════════════════════════
// SequenceBase.js
// The engine handling all shared elevator mechanics, state, and VR events.
// ════════════════════════════════════════════════════════════════════════════

class SequenceBase {
  constructor(config = {}) {
    this.sequenceKey = config.key || 'default';
    this.startFloor = config.startFloor || 1;
    this.npcSelector = config.npcSelector || null; 
    
    // Shared State
    this.currFloor = this.startFloor;
    this.isMoving = false;
    this.isDoorsOpen = false;
    this.hasSequenceCompleted = false;
    this.isSequenceRunning = false;
    this.stopRequested = false;
    this.pendingWaiters = new Set();
    
    window.isSimulationFrozen = false;
    window.activeSequenceKey = this.sequenceKey;
  }

  // ─── Initialization & Teardown ─────────────────────────────────────────────

  init() {
    this.cacheDOM();
    this.setupEventListeners();
  }

  cacheDOM() {
    this.elevator = document.querySelector('#elevatorModel');
    this.rig = document.querySelector('#rig');
    this.mainChar = document.querySelector('#mainCharacterEntity');
    this.assets = document.querySelector('a-assets');
    this.replayBtnContainer = document.querySelector('#ui-container');
    this.loadingOverlay = document.querySelector('#loading-overlay');
    
    // Dynamically cache the NPC based on the config provided by the child class
    this.avatar = this.npcSelector ? document.querySelector(this.npcSelector) : null;
  }

  teardown() {
    this.removeEventListeners();
    window.goToFloor = undefined;
  }

  registerWaiter(waiter) {
    this.pendingWaiters.add(waiter);
    return waiter;
  }

  clearPendingWaiters() {
    this.pendingWaiters.forEach(waiter => {
      if (waiter.type === 'timeout') clearTimeout(waiter.timeoutId);
      if (waiter.type === 'interval') clearInterval(waiter.intervalId);
      waiter.reject?.(new Error('Sequence stopped'));
    });
    this.pendingWaiters.clear();
  }

  stopSequence() {
    if (!this.isSequenceRunning && !this.isMoving) return;

    this.stopRequested = true;
    this.clearPendingWaiters();
    window.isSimulationFrozen = false;
    this.isMoving = false;
    this.isDoorsOpen = false;
    this.isSequenceRunning = false;
    this.hasSequenceCompleted = false;

    this.setNpcVisible(false);
    this.setMovementEnabled(false);
    this.resetLiftDoorState();
    this.setFloorBackdrop(1);
    this.updateAllDisplays(1, 'idle');

    if (window.resetEnvironmentState) window.resetEnvironmentState(1);
    if (window.showSequenceMenu) window.showSequenceMenu();
  }

  // ─── Core Mechanics ────────────────────────────────────────────────────────

  async goToFloor(destFloor, isSilentMove = false) {
    if (this.stopRequested) throw new Error('Sequence stopped');
    if (this.isMoving || this.currFloor === destFloor) return;
    this.isMoving = true;

    const isGoingUp    = destFloor > this.currFloor;
    const screenDir    = isGoingUp ? 'up' : 'down';
    const scrollDir    = isGoingUp ? 'down' : 'up';
    const targetVolume = isSilentMove ? 1 : 2.0;

    ['sound__voiceup', 'sound__voicedown', 'sound__voicedoorclose',
     'sound__doorclose', 'sound__dooropen', 'sound__ding'].forEach(s => {
      if (this.elevator.components[s]) this.elevator.setAttribute(s, 'volume', targetVolume);
    });
    this.elevator.setAttribute('animation__fadein',  { to:   targetVolume });
    this.elevator.setAttribute('animation__fadeout', { from: targetVolume });

    if (this.isDoorsOpen) {
      if (isGoingUp  && this.elevator.components.sound__voiceup)
        this.elevator.components.sound__voiceup.playSound();
      if (!isGoingUp && this.elevator.components.sound__voicedown)
        this.elevator.components.sound__voicedown.playSound();
      await this.sleep(1500);

      if (this.elevator.components.sound__voicedoorclose)
        this.elevator.components.sound__voicedoorclose.playSound();
      await this.sleep(2000);

      this.playLiftAnimation('DoorClose');
      this.isDoorsOpen = false;
      await this.sleep(2000);
    }

    this.updateAllDisplays(this.currFloor, screenDir);

    const firstFloorPlane  = document.querySelector('#first-floor');
    const lowerFloorPlane  = document.querySelector('#lower-floor');
    const middleFloorPlane = document.querySelector('#middle-floor');
    const upperFloorPlane  = document.querySelector('#upper-floor');
    const scrollingShaft   = document.querySelector('#scrolling-shaft');

    if (!isSilentMove) {
      firstFloorPlane?.setAttribute('visible', 'false');
      lowerFloorPlane?.setAttribute('visible', 'false');
      middleFloorPlane?.setAttribute('visible', 'false');
      upperFloorPlane?.setAttribute('visible', 'false');
      scrollingShaft?.setAttribute('visible', 'true');
      scrollingShaft?.setAttribute('texture-scroller', `active: true; direction: ${scrollDir}`);
    } else {
      this.setFloorBackdrop(1);
    }

    if (this.elevator.components.sound) {
      this.elevator.setAttribute('sound', 'volume', 0);
      this.elevator.components.sound.playSound();
      this.elevator.emit('fade-in');
    }

    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.stopRequested) {
          clearInterval(interval);
          this.pendingWaiters.delete(waiter);
          reject(new Error('Sequence stopped'));
          return;
        }
        if (window.isSimulationFrozen) return;
        this.currFloor += isGoingUp ? 1 : -1;
        this.updateAllDisplays(this.currFloor, screenDir);
        if (this.currFloor === destFloor) {
          clearInterval(interval);
          this.pendingWaiters.delete(waiter);
          resolve();
        }
      }, 2800);
      const waiter = { type: 'interval', intervalId: interval, resolve, reject };
      this.registerWaiter(waiter);
    });

    if (!isSilentMove) {
      scrollingShaft?.setAttribute('texture-scroller', 'active: false');
      scrollingShaft?.setAttribute('visible', 'false');
      this.setFloorBackdrop(this.currFloor);
    }

    if (this.elevator.components.sound) {
      this.elevator.emit('fade-out');
      setTimeout(() => { this.elevator.components.sound?.stopSound(); }, 2000);
    }

    this.updateAllDisplays(this.currFloor, 'idle');
    await this.sleep(1000);

    if (this.elevator.components.sound__ding) this.elevator.components.sound__ding.playSound();
    await this.sleep(800);

    this.playLiftAnimation('DoorOpen');
    this.isDoorsOpen = true;
    this.isMoving    = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  async sleep(ms) {
    if (this.stopRequested) throw new Error('Sequence stopped');

    let elapsed = 0;
    const step  = 50;
    while (elapsed < ms) {
      if (this.stopRequested) throw new Error('Sequence stopped');

      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingWaiters.delete(waiter);
          resolve();
        }, step);
        const waiter = { type: 'timeout', timeoutId, resolve, reject };
        this.registerWaiter(waiter);
      });

      if (!window.isSimulationFrozen) elapsed += step;
    }
  }

  playLiftAnimation(name) {
    if (!this.elevator) return;
    this.elevator.setAttribute('animation-mixer', { clip: name, loop: 'once', clampWhenFinished: true });
    if (name === 'DoorOpen'  && this.elevator.components.sound__dooropen)
      this.elevator.components.sound__dooropen.playSound();
    if (name === 'DoorClose' && this.elevator.components.sound__doorclose)
      this.elevator.components.sound__doorclose.playSound();
  }

  setNpcVisible(visible) {
    if (this.avatar) this.avatar.setAttribute('visible', visible);
  }

  playAvatarAnimation(name) {
    if (this.avatar) this.avatar.setAttribute('animation-mixer', { clip: name, loop: 'repeat' });
  }

  updateAllDisplays(floorNumber, direction) {
    document.querySelectorAll('.lift-floor').forEach(el => el.setAttribute('value', floorNumber));
    document.querySelectorAll('.lift-arrow').forEach(el => {
      if      (direction === 'up')   { el.setAttribute('visible', 'true');  el.setAttribute('rotation', '0 0 0');   }
      else if (direction === 'down') { el.setAttribute('visible', 'true');  el.setAttribute('rotation', '0 0 180'); }
      else                           { el.setAttribute('visible', 'false'); }
    });
  }

  setFloorBackdrop(floorNumber) {
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

  setMovementEnabled(enabled) {
    if (window.setPlayerMovementEnabled) {
      window.setPlayerMovementEnabled(enabled);
    } else {
      if (!this.rig) return;
      if (enabled) this.rig.setAttribute('movement-controls', 'speed: 0.1');
      else this.rig.removeAttribute('movement-controls');
    }
  }

  setEntityAnimationsPaused(entity, paused) {
    if (!entity?.components) return;
    Object.keys(entity.components)
      .filter(name => name.startsWith('animation__'))
      .forEach(name => entity.components[name]?.[paused ? 'pause' : 'play']?.());
  }

  resetLiftDoorState() {
    this.elevator?.removeAttribute('animation-mixer');
    this.isDoorsOpen = false;
  }

  // ─── Event Listeners & Handlers ────────────────────────────────────────────

  setupEventListeners() {
    this.onStartHandler = this.onStartSequence.bind(this);
    this.onStopHandler = this.onStopSequence.bind(this);
    this.onFreezeHandler = this.onFreezeSequence.bind(this);
    this.onKeyDownHandler = this.onKeyDown.bind(this);
    this.onAssetsLoadedHandler = this.onAssetsLoaded.bind(this);

    window.addEventListener('vr-start-sequence', this.onStartHandler);
    window.addEventListener('vr-stop-sequence', this.onStopHandler);
    window.addEventListener('vr-freeze-sequence', this.onFreezeHandler);
    window.addEventListener('keydown', this.onKeyDownHandler);

    // Replay button setup
    const replayBtn = document.querySelector('#replayBtn');
    if (replayBtn) {
      this.onReplayClickHandler = () => {
        if (this.isDoorsOpen) { 
          this.playLiftAnimation('DoorClose'); 
          this.isDoorsOpen = false; 
        } else {
          this.resetLiftDoorState();
        }
        this.executeTimeline();
      };
      replayBtn.addEventListener('click', this.onReplayClickHandler);
    }

    if (this.assets) {
      if (this.assets.hasLoaded) this.onAssetsLoaded();
      else this.assets.addEventListener('loaded', this.onAssetsLoadedHandler);
    }
  }

  removeEventListeners() {
    window.removeEventListener('vr-start-sequence', this.onStartHandler);
    window.removeEventListener('vr-stop-sequence', this.onStopHandler);
    window.removeEventListener('vr-freeze-sequence', this.onFreezeHandler);
    window.removeEventListener('keydown', this.onKeyDownHandler);
    
    if (this.assets) this.assets.removeEventListener('loaded', this.onAssetsLoadedHandler);
    const replayBtn = document.querySelector('#replayBtn');
    if (replayBtn && this.onReplayClickHandler) replayBtn.removeEventListener('click', this.onReplayClickHandler);
  }

  onAssetsLoaded() {
    console.log(`[SequenceBase] 3D assets loaded for ${this.sequenceKey}.`);
    this.resetLiftDoorState();

    this.updateAllDisplays(this.currFloor, 'idle');
    this.setFloorBackdrop(this.isSequenceRunning || this.hasSequenceCompleted ? this.currFloor : 1);
    this.setNpcVisible(false);

    if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
    if (this.replayBtnContainer) this.replayBtnContainer.style.display = 'none';

    const menuContainer = document.querySelector('#vr-menu-container');
    const shouldShowMenu = !window._suppressSequenceMenu;

    if (shouldShowMenu && menuContainer) {
      if (window.showSequenceMenu) window.showSequenceMenu();
      menuContainer.setAttribute('animation__fadein',
        'property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 400; easing: easeOutQuad');
    }

    window._suppressSequenceMenu = false;
  }

  onStartSequence(evt) {
    if (window.isMenuOpen || this.isSequenceRunning) return;

    this.stopRequested = false;
    
    if (this.isDoorsOpen) { 
      this.playLiftAnimation('DoorClose'); 
      this.isDoorsOpen = false; 
    }
    
    if (!this.isMoving && !window.isSimulationFrozen) {
      this.executeTimeline().catch(err => {
        if (err?.message === 'Sequence stopped') {
          this.stopSequence();
          return;
        }
        console.error(`[${this.sequenceKey}] Sequence execution failed:`, err);
      });
    }
  }

  onStopSequence() {
    if (window.isMenuOpen) return;
    this.stopSequence();
  }

  onFreezeSequence() {
    if (window.isMenuOpen) return;
    if (this.hasSequenceCompleted) {
      if (window.showSequenceMenu) window.showSequenceMenu();
      return;
    }

    window.isSimulationFrozen = !window.isSimulationFrozen;
    const scrollingShaft = document.querySelector('#scrolling-shaft');

    if (window.isSimulationFrozen) {
      console.log(`[${this.sequenceKey}] FROZEN`);
      this.avatar?.pause();
      this.mainChar?.components?.['animation-mixer']?.pause?.();
      this.setEntityAnimationsPaused(this.rig, true);
      scrollingShaft?.pause();
      this.elevator?.components?.sound?.pauseSound();
    } else {
      console.log(`[${this.sequenceKey}] RESUMED`);
      this.avatar?.play();
      this.mainChar?.components?.['animation-mixer']?.play?.();
      this.setEntityAnimationsPaused(this.rig, false);
      scrollingShaft?.play();
      if (this.isMoving) this.elevator?.components?.sound?.playSound();
    }
  }

  onKeyDown(evt) {
    if (window.isMenuOpen) return;
    if (evt.key === 'a' || evt.key === 'A') {
      if (this.hasSequenceCompleted) window.dispatchEvent(new Event('vr-start-sequence'));
    } else if (evt.key === 'b' || evt.key === 'B') {
      if (this.isSequenceRunning || this.isMoving) {
        evt.preventDefault?.();
        this.stopSequence();
      }
    } else if (evt.key === 'x' || evt.key === 'X') {
      if (this.hasSequenceCompleted) {
        if (window.showSequenceMenu) window.showSequenceMenu();
      } else {
        window.dispatchEvent(new Event('vr-freeze-sequence'));
      }
    }
  }

  async executeTimeline() {
    console.warn("executeTimeline() must be overridden by the child sequence.");
  }
}

window.SequenceBase = SequenceBase;
