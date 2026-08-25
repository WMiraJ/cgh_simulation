const SEQUENCE_KEY_MAP = {
  'Standard': 'easy-standard',
  'Empty': 'easy-without-npcs',
  'Crowded': 'easy-with-all-npcs',
  'Intermediate': 'normal',
  'Advanced': 'hard'
};

window.isMenuOpen = false;
window.havePreviousSequence = false;
window.latestSequenceKey = null;

window.updateVRMenuVisibility = function () {
  window.dispatchEvent(new Event('vr-menu-visibility-changed'));
};

window.showSequenceMenu = function () {
  const menuContainer = document.querySelector('#vr-menu-container');
  if (menuContainer && menuContainer.components['vr-sequence-menu']) {
    menuContainer.components['vr-sequence-menu'].resetMenu();
  }
};

AFRAME.registerComponent('vr-sequence-menu', {
  init: function () {
    this.container = this.el;
    this.panel = document.getElementById('panel');
    
    // Bind all buttons directly from the injected HTML DOM
    this.introBtn = document.getElementById('introBtn');
    this.interBtn = document.getElementById('interBtn');
    this.advBtn = document.getElementById('advBtn');
    
    this.subStandard = document.getElementById('subStandard');
    this.subEmpty = document.getElementById('subEmpty');
    this.subCrowded = document.getElementById('subCrowded');
    this.replayBtn = document.getElementById('replayBtn');
    this.focusedMenuTarget = null;

    // Attach click listeners to top level buttons
    this.introBtn.addEventListener('click', () => this.handleMainClick(this.introBtn));
    this.interBtn.addEventListener('click', () => this.handleMainClick(this.interBtn, 'Intermediate'));
    this.advBtn.addEventListener('click', () => this.handleMainClick(this.advBtn, 'Advanced'));

    // Attach click listeners to sub-buttons
    this.subStandard.addEventListener('click', () => this.handleSubClick(this.subStandard, 'Standard'));
    this.subEmpty.addEventListener('click', () => this.handleSubClick(this.subEmpty, 'Empty'));
    this.subCrowded.addEventListener('click', () => this.handleSubClick(this.subCrowded, 'Crowded'));
    this.replayBtn.addEventListener('click', () => this.replayLatestSequence());

    this.onFocusableEnter = evt => {
      const target = evt.detail?.target || evt.target;
      const button = target?.closest?.('button');
      if (button && this.panel.contains(button)) this.focusedMenuTarget = button;
    };
    this.onFocusableLeave = evt => {
      const target = evt.detail?.target || evt.target;
      const button = target?.closest?.('button');
      if (!button || button === this.focusedMenuTarget) this.focusedMenuTarget = null;
    };
    this.onVRMenuSelect = evt => this.handleVRSelect(evt);

    this.container.addEventListener('focusableenter', this.onFocusableEnter);
    this.container.addEventListener('focusableleave', this.onFocusableLeave);
    window.addEventListener('vr-menu-select', this.onVRMenuSelect);

    // Initialize the summon listener
    this.armSummonListener();
  },

  remove: function () {
    this.container.removeEventListener('focusableenter', this.onFocusableEnter);
    this.container.removeEventListener('focusableleave', this.onFocusableLeave);
    window.removeEventListener('vr-menu-select', this.onVRMenuSelect);
  },

  armSummonListener: function () {
    const summon = (evt) => {
      const activeSequence = window.activeSequence;
      const sequenceIsRunning = activeSequence?.isSequenceRunning || activeSequence?.isMoving;

      // The menu is available between sequences, including after completion.
      if (!window.isMenuOpen && !sequenceIsRunning) {
        this.resetMenu();
      }
    };

    // 1. Desktop Keyboard: Listen for any key press
    window.addEventListener('keydown', summon);

    // 2. VR Controllers: Listen for typical buttons
    const vrButtons = [
      'triggerdown', 'gripdown',
      'xbuttondown', 'ybuttondown', 'thumbstickdown', 'trackpaddown'
    ];
    const attachController = (controller) => {
      if (controller.__menuSummonListenersAttached) return;
      controller.__menuSummonListenersAttached = true;
      vrButtons.forEach(btn => controller.addEventListener(btn, summon));
    };

    document.querySelectorAll('[vr-controller-input]').forEach(attachController);
    this.el.sceneEl.addEventListener('controllerconnected', evt => attachController(evt.target));
  },

  handleMainClick: function (btn, sequenceKeyName) {
    if (!window.isMenuOpen) return;

    const isIntro = btn.id === 'introBtn';

    if (isIntro) {
      const expanding = !this.panel.classList.contains('expanded');
      this.panel.classList.toggle('expanded');
      btn.classList.toggle('selected', expanding);
      
      if (!expanding) {
        document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('selected'));
      }

      this.forceMenuRender();
    } else {
      document.querySelectorAll('.btn, .sub-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      this.panel.classList.remove('expanded');
      this.forceMenuRender();
      this.launchSequence(SEQUENCE_KEY_MAP[sequenceKeyName]);
    }
  },

  handleSubClick: function (btn, sequenceKeyName) {
    if (!window.isMenuOpen) return;

    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.forceMenuRender();
    this.launchSequence(SEQUENCE_KEY_MAP[sequenceKeyName]);
  },

  launchSequence: function(finalKey) {
    window.isMenuOpen = false;
    window.latestSequenceKey = finalKey;
    window.havePreviousSequence = true;
    this.updateReplayButton();
    this.setMenuInteractionEnabled(false);
    if (window.updateVRMenuVisibility) window.updateVRMenuVisibility();
    if (window.setPlayerMovementEnabled) window.setPlayerMovementEnabled(false);
    
    setTimeout(() => {
        this.container.setAttribute('visible', 'false');
        if (window.startSelectedSequence) {
            window.startSelectedSequence(finalKey);
        }
    }, 600);
  },

  replayLatestSequence: function () {
    if (!window.isMenuOpen || !window.havePreviousSequence || !window.latestSequenceKey) return;
    document.querySelectorAll('.btn, .sub-btn').forEach(b => b.classList.remove('selected'));
    this.replayBtn.classList.add('selected');
    this.forceMenuRender();
    this.launchSequence(window.latestSequenceKey);
  },

  resetMenu: function () {
    window.isMenuOpen = true;
    this.updateReplayButton();
    this.setMenuInteractionEnabled(true);
    this.container.setAttribute('visible', 'true');
    if (window.updateVRMenuVisibility) window.updateVRMenuVisibility();
    if (window.setPlayerMovementEnabled) window.setPlayerMovementEnabled(false);

    this.panel.classList.remove('expanded');
    document.querySelectorAll('.btn, .sub-btn').forEach(b => b.classList.remove('selected'));
    this.replayBtn.classList.remove('selected');
    this.focusedMenuTarget = null;
    this.forceMenuRender();
  },

  setMenuInteractionEnabled: function (enabled) {
    document.querySelectorAll('[raycaster]').forEach(controller => {
      const raycaster = controller.components?.raycaster;
      if (raycaster?.data.objects?.includes('[htmlembed]')) {
        controller.setAttribute('raycaster', 'enabled', enabled);
      }
    });
  },

  updateReplayButton: function () {
    if (!this.replayBtn) return;
    this.replayBtn.hidden = !window.havePreviousSequence;
  },

  handleVRSelect: function (evt) {
    if (!window.isMenuOpen) return;

    if (this.focusedMenuTarget && !this.focusedMenuTarget.disabled && !this.focusedMenuTarget.hidden) {
      this.focusedMenuTarget.click();
      return;
    }

    evt.detail?.controller?.components.cursor?.intersectedEl?.emit('click');
  },

  forceMenuRender: function () {
    const embed = this.container.components?.htmlembed;
    if (!embed?.forceRender) return;

    embed.forceRender();
    requestAnimationFrame(() => embed.forceRender());
  }
});
