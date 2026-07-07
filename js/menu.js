// ════════════════════════════════════════════════════════════════════════════
// menu.js
// VR difficulty-select menu, styled as frosted "glass" panels that sit as a
// mask in front of the elevator model rather than a solid opaque background.
//
// Visual approach: A-Frame's plane geometry can't do border-radius or
// box-shadow on its own, so panel backgrounds are drawn on an offscreen
// <canvas> (rounded rect + soft glow) and applied as a texture. This keeps
// everything self-contained — no extra image assets to host.
// ════════════════════════════════════════════════════════════════════════════

// ─── Palette ───────────────────────────────────────────────────────────────
// Calm clinical blue/teal — kept deliberately quiet so it doesn't compete
// with the therapeutic content itself.
// Translates a selection into the exact key main.js's SEQUENCES registry
// expects. Keep this in sync with main.js — 'EASY' + 'Standard' is the only
// one actually wired up to a real sequence (easy-standard → sequence01.html).
const SEQUENCE_KEY_MAP = {
  EASY: {
    'Standard': 'easy-standard',
    'Without NPCs': 'easy-without-npcs',
    'With All NPCs': 'easy-with-all-npcs'
  },
  NORMAL: 'normal',
  HARD: 'hard'
};

const MENU_COLORS = {
  panelFill:     '0,100,245',    // deep navy glass
  panelFillSel:  '0,122,255',    // slightly lighter navy for the selected card
  borderIdle:    '124,141,166', // muted slate border for unselected cards
  borderActive:  '79,209,197',  // teal glow border for the selected card / dropdown
  borderSuccess: '52,211,153',  // soft green for confirmed selection
  textPrimary:   '#F4F8FC',
  textMuted:     '#AAB8CC'
};

// ─── Canvas texture helpers ────────────────────────────────────────────────

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Rounded "frosted glass" card with an optional glow border.
function createGlassPanelTexture({
  width = 512,
  height = 512,
  radius = 64,
  fillRGB = MENU_COLORS.panelFill,
  fillAlpha = 0.78,
  borderRGB = MENU_COLORS.borderIdle,
  borderAlpha = 0.9,
  borderWidth = 6,
  glow = true,
  glowBlur = 26
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const pad = borderWidth / 2 + (glow ? glowBlur * 0.6 : 4);

  if (glow) {
    ctx.save();
    ctx.shadowColor = `rgba(${borderRGB},${borderAlpha})`;
    ctx.shadowBlur = glowBlur;
    roundRectPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.fillStyle = `rgba(${fillRGB},${fillAlpha})`;
    ctx.fill();
    ctx.restore();
  }

  roundRectPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
  ctx.fillStyle = `rgba(${fillRGB},${fillAlpha})`;
  ctx.fill();

  if (borderWidth > 0) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = `rgba(${borderRGB},${borderAlpha})`;
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

// Soft radial vignette — the "mask" layer that sits behind the menu panels
// so text stays legible while the elevator model still shows through at
// the edges, instead of a flat opaque rectangle.
function createVignetteMaskTexture({
  width = 1024,
  height = 900,
  rgb = '5,13,26',
  maxAlpha = 0.55
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const cx = width / 2, cy = height / 2;
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
  grd.addColorStop(0,    `rgba(${rgb},${maxAlpha})`);
  grd.addColorStop(0.65, `rgba(${rgb},${maxAlpha * 0.75})`);
  grd.addColorStop(1,    `rgba(${rgb},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}


AFRAME.registerComponent('vr-sequence-menu', {
  schema: {
    options: { type: 'array', default: ['EASY', 'NORMAL', 'HARD'] },
    easySubOptions: { type: 'array', default: ['Standard', 'Without NPCs', 'With All NPCs'] }
  },

  init: function () {
    this.currentIndex = 0;
    this.subIndex = 1;
    this.inSubMenu = false;
    this.canScroll = true;
    this.hasSelected = false;

    this.carousel = document.querySelector('#carousel-container');
    this.dropdown = document.querySelector('#dropdown-container');
    this.dropdownPanel = document.querySelector('#dropdown-panel');
    this.dropdownHighlight = document.querySelector('#dropdown-highlight');
    this.container = document.querySelector('#vr-menu-container');
    this.titlePanel = document.querySelector('#title-panel');

    // Some entities register this component twice (once per hand). Only
    // the first instance should build the shared DOM/canvas-driven visuals.
    if (!this.container.dataset.menuBuilt) {
      this.container.dataset.menuBuilt = 'true';
      // this.buildBackdrop();
      this.styleTitlePanel();
      this.styleDropdown();
      this.buildCarouselArrows();
      this.buildDropdownArrows();
    } else {
      // Re-grab arrow refs built by the first instance.
      this.leftArrow = document.querySelector('#carousel-arrow-left');
      this.rightArrow = document.querySelector('#carousel-arrow-right');
      this.upArrow = document.querySelector('#dropdown-arrow-up');
      this.downArrow = document.querySelector('#dropdown-arrow-down');
    }

    this.onThumbstick = this.onThumbstick.bind(this);
    this.onAButton = this.onAButton.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onMenuBack = this.onMenuBack.bind(this);
    this.onMenuScroll = this.onMenuScroll.bind(this);

    this.el.addEventListener('thumbstickmoved', this.onThumbstick);
    this.el.addEventListener('abuttondown', this.onAButton);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('vr-menu-select', this.onAButton);
    window.addEventListener('vr-menu-back', this.onMenuBack);
    window.addEventListener('vr-menu-scroll', this.onMenuScroll);

    this.renderCarousel();
    this.updateDisplay();
  },

  // ─── One-time visual setup ────────────────────────────────────────────

  buildBackdrop: function () {
    // Soft frosted "mask" sitting just behind the whole menu — this is
    // what keeps the elevator model visible in the gaps instead of the
    // menu reading as a flat opaque background.
    const mask = document.createElement('a-entity');
    mask.setAttribute('id', 'menu-backdrop-mask');
    mask.setAttribute('position', '0 0.3 -0.06');
    this.container.insertBefore(mask, this.container.firstChild);
    this.backdrop = mask;

    mask.setAttribute('geometry', { primitive: 'plane', width: 4.2, height: 3.4 });
    mask.setAttribute('material', {
      shader: 'flat',
      transparent: true,
      src: createVignetteMaskTexture()
    });

    // Slow ambient breathing so the whole panel doesn't feel static.
    mask.setAttribute('animation__breathe',
      'property: material.opacity; from: 0.85; to: 1; dir: alternate; loop: true; dur: 4000; easing: easeInOutSine');
  },

  styleTitlePanel: function () {
    if (!this.titlePanel) return;
    this.titlePanel.setAttribute('geometry', { primitive: 'plane', width: 3.1, height: 0.85 });
    this.titlePanel.setAttribute('material', {
      shader: 'flat',
      transparent: true,
      src: createGlassPanelTexture({
        borderRGB: MENU_COLORS.borderActive,
        borderAlpha: 0.55,
        fillAlpha: 0.72,
        glowBlur: 18
      })
    });
  },

  styleDropdown: function () {
    if (!this.dropdownPanel || !this.dropdownHighlight) return;
    this.dropdownPanel.setAttribute('geometry', { primitive: 'plane', width: 1.3, height: 0.65 });
    this.dropdownPanel.setAttribute('material', {
      shader: 'flat',
      transparent: true,
      src: createGlassPanelTexture({
        radius: 40,
        borderRGB: MENU_COLORS.borderActive,
        borderAlpha: 0.7,
        fillAlpha: 0.85,
        glowBlur: 20
      })
    });

    this.dropdownHighlight.setAttribute('geometry', { primitive: 'plane', width: 1.15, height: 0.17 });
    this.dropdownHighlight.setAttribute('material', {
      shader: 'flat',
      transparent: true,
      src: createGlassPanelTexture({
        radius: 24,
        fillRGB: MENU_COLORS.borderActive,
        fillAlpha: 0.28,
        borderRGB: MENU_COLORS.borderActive,
        borderAlpha: 0.7,
        borderWidth: 3,
        glowBlur: 14
      })
    });
  },

  buildCarouselArrows: function () {
    const makeArrow = (id, glyph, x) => {
      const arrow = document.createElement('a-text');
      arrow.setAttribute('id', id);
      arrow.setAttribute('value', glyph);
      arrow.setAttribute('align', 'center');
      arrow.setAttribute('width', 6);
      arrow.setAttribute('color', MENU_COLORS.textMuted);
      arrow.setAttribute('position', `${x} 0 0.05`);
      arrow.setAttribute('animation__pulse',
        'property: material.opacity; from: 0.4; to: 0.9; dir: alternate; loop: true; dur: 900; easing: easeInOutSine');
      this.carousel.parentNode.insertBefore(arrow, this.carousel.nextSibling);
      return arrow;
    };
    this.leftArrow = makeArrow('carousel-arrow-left', '\u276E', -1.9);
    this.rightArrow = makeArrow('carousel-arrow-right', '\u276F', 1.9);
  },

  buildDropdownArrows: function () {
    const makeArrow = (id, glyph, y) => {
      const arrow = document.createElement('a-text');
      arrow.setAttribute('id', id);
      arrow.setAttribute('value', glyph);
      arrow.setAttribute('align', 'center');
      arrow.setAttribute('width', 5);
      arrow.setAttribute('color', MENU_COLORS.textMuted);
      arrow.setAttribute('visible', false);
      arrow.setAttribute('position', `0.75 ${y} 0.05`);
      arrow.setAttribute('animation__pulse',
        'property: material.opacity; from: 0.4; to: 0.9; dir: alternate; loop: true; dur: 900; easing: easeInOutSine');
      this.dropdown.appendChild(arrow);
      return arrow;
    };
    this.upArrow = makeArrow('dropdown-arrow-up', '\u25B4', 0.22);
    this.downArrow = makeArrow('dropdown-arrow-down', '\u25BE', -0.22);
  },


  isMenuVisible: function () {
    return this.container && this.container.getAttribute('visible') !== false;
  },

  setMenuMovementState: function (isOpen) {
    window.isMenuOpen = isOpen;
    if (window.setPlayerMovementEnabled) window.setPlayerMovementEnabled(!isOpen);
    else {
      const rig = document.querySelector('#rig');
      if (rig) {
        if (isOpen) rig.removeAttribute('movement-controls');
        else rig.setAttribute('movement-controls', 'speed: 0.1');
      }
    }
  },

  returnToParentMenu: function () {
    if (!this.inSubMenu || this.hasSelected) return false;

    this.inSubMenu = false;
    this.dropdown.setAttribute('visible', 'false');
    if (this.upArrow) this.upArrow.setAttribute('visible', false);
    if (this.downArrow) this.downArrow.setAttribute('visible', false);
    if (this.leftArrow) this.leftArrow.setAttribute('visible', true);
    if (this.rightArrow) this.rightArrow.setAttribute('visible', true);
    this.updateDisplay();
    return true;
  },

  resetMenu: function () {
    this.currentIndex = 0;
    this.subIndex = 1;
    this.inSubMenu = false;
    this.canScroll = true;
    this.hasSelected = false;

    this.container.setAttribute('visible', 'true');
    this.container.removeAttribute('animation__fadeout');
    this.container.setAttribute('scale', '1 1 1');
    this.dropdown.setAttribute('visible', 'false');

    if (this.leftArrow) this.leftArrow.setAttribute('visible', true);
    if (this.rightArrow) this.rightArrow.setAttribute('visible', true);
    if (this.upArrow) this.upArrow.setAttribute('visible', false);
    if (this.downArrow) this.downArrow.setAttribute('visible', false);

    this.optionEntities.forEach((entity, index) => {
      entity.setAttribute('material', 'src', this.cardTextureIdle);
      const text = entity.querySelector('a-text');
      if (text) {
        text.setAttribute('color', MENU_COLORS.textPrimary);
        text.setAttribute('value', this.data.options[index]);
      }
    });

    this.setMenuMovementState(true);
    this.updateDisplay();
  },

  // ─── Carousel cards ────────────────────────────────────────────────────

  renderCarousel: function () {
    this.optionEntities = [];


    this.cardTextureIdle = createGlassPanelTexture({ borderRGB: MENU_COLORS.borderIdle, fillAlpha: 0.75 });
    this.cardTextureSelected = createGlassPanelTexture({
      borderRGB: MENU_COLORS.borderActive, borderAlpha: 0.9,
      fillRGB: MENU_COLORS.panelFillSel, fillAlpha: 0.85
    });
    this.cardTextureSuccess = createGlassPanelTexture({
      borderRGB: MENU_COLORS.borderSuccess, borderAlpha: 1,
      fillRGB: MENU_COLORS.panelFillSel, fillAlpha: 0.9, glowBlur: 32
    });

    this.data.options.forEach((opt) => {
      const entity = document.createElement('a-entity');
      this.carousel.appendChild(entity);

      // 1. Base card
      entity.setAttribute('geometry', { primitive: 'plane', width: 1.05, height: 0.45 });
      entity.setAttribute('material', { shader: 'flat', transparent: true, src: this.cardTextureIdle });


      // 3. Text Layer
      const text = document.createElement('a-text');
      text.setAttribute('value', opt);
      text.setAttribute('align', 'center');
      text.setAttribute('width', 4);
      text.setAttribute('font', 'exo2semibold'); // Matches your UI font
      text.setAttribute('color', MENU_COLORS.textPrimary);
      text.setAttribute('position', '0 0 0.02'); // Pushed safely to the front

      entity.appendChild(text);
      this.optionEntities.push(entity);
    });
  },

  // ─── Layout / animation ────────────────────────────────────────────────

  updateDisplay: function () {
    if (this.hasSelected) return;

    const total = this.data.options.length;

    this.optionEntities.forEach((entity, index) => {
      let offset = (index - this.currentIndex + total) % total;
      if (offset > Math.floor(total / 2)) offset -= total;

      let targetPos, targetScale, isCenter = false;

      if (offset === 0) {
        targetPos = '0 0 0.1';
        targetScale = '1.25 1.25 1.25';
        isCenter = true;
      } else if (offset === 1) {
        targetPos = '1.25 0 0';
        targetScale = '0.78 0.78 0.78';
      } else if (offset === -1) {
        targetPos = '-1.25 0 0';
        targetScale = '0.78 0.78 0.78';
      } else {
        targetPos = '0 0 -1';
        targetScale = '0.001 0.001 0.001';
      }

      entity.setAttribute('animation__pos', `property: position; to: ${targetPos}; dur: 300; easing: easeOutBack`);
      entity.setAttribute('animation__scale', `property: scale; to: ${targetScale}; dur: 300; easing: easeOutBack`);

    });


    if (this.inSubMenu) {
      const yPos = 0.15 - (this.subIndex * 0.15);
      this.dropdownHighlight.setAttribute('animation__pos', `property: position; to: 0 ${yPos} 0.005; dur: 150; easing: easeOutQuad`);
      if (this.upArrow) this.upArrow.setAttribute('visible', this.subIndex > 0);
      if (this.downArrow) this.downArrow.setAttribute('visible', this.subIndex < this.data.easySubOptions.length - 1);
    }
  },

  // ─── Input handling (unchanged behaviour) ─────────────────────────────

  handleScroll: function (direction) {
    if (!this.canScroll || this.hasSelected || !this.isMenuVisible()) return;

    if (this.inSubMenu && (direction === 'left' || direction === 'right')) {
      this.returnToParentMenu();
      this.throttleScroll();
      return;
    }

    if (!this.inSubMenu) {
      if (direction === 'right') {
        this.currentIndex = (this.currentIndex + 1) % this.data.options.length;
      } else if (direction === 'left') {
        this.currentIndex = (this.currentIndex - 1 + this.data.options.length) % this.data.options.length;
      }
    } else {
      if (direction === 'up') {
        this.subIndex = (this.subIndex - 1 + this.data.easySubOptions.length) % this.data.easySubOptions.length;
      } else if (direction === 'down') {
        this.subIndex = (this.subIndex + 1) % this.data.easySubOptions.length;
      }
    }

    this.updateDisplay();
    this.throttleScroll();
  },

  onKeyDown: function (evt) {
    if (!this.isMenuVisible()) return;

    switch (evt.key) {
      case 'ArrowRight': this.handleScroll('right'); break;
      case 'ArrowLeft': this.handleScroll('left'); break;
      case 'ArrowUp': this.handleScroll('up'); break;
      case 'ArrowDown': this.handleScroll('down'); break;
      case 'Enter': this.onAButton(); break;
      case 'x':
      case 'X': this.onMenuBack(); break;
    }
  },

  onThumbstick: function (evt) {
    if (!this.isMenuVisible()) return;

    const x = evt.detail.x;
    const y = evt.detail.y;
    if (x > 0.6) this.handleScroll('right');
    else if (x < -0.6) this.handleScroll('left');
    else if (y < -0.6) this.handleScroll('up');
    else if (y > 0.6) this.handleScroll('down');
  },


  onMenuBack: function () {
    if (!this.isMenuVisible()) return;
    this.returnToParentMenu();
  },

  onMenuScroll: function (evt) {
    if (!this.isMenuVisible()) return;
    this.handleScroll(evt.detail?.direction);
  },

  throttleScroll: function () {
    this.canScroll = false;
    setTimeout(() => { this.canScroll = true; }, 350);
  },

  onAButton: function () {
    if (this.hasSelected || !this.isMenuVisible()) return;

    const selectedMain = this.data.options[this.currentIndex];

    if (selectedMain === 'EASY' && !this.inSubMenu) {
      this.inSubMenu = true;
      this.dropdown.setAttribute('visible', 'true');
      if (this.leftArrow) this.leftArrow.setAttribute('visible', false);
      if (this.rightArrow) this.rightArrow.setAttribute('visible', false);
      this.updateDisplay();
      return;
    }

    this.hasSelected = true;

    // finalKey is what actually gets passed to window.startSelectedSequence
    // and must match a key in main.js's SEQUENCES registry. finalLabel is
    // just for the on-screen "LOADING..." card text.
    let finalKey, finalLabel = selectedMain;

    if (this.inSubMenu) {
      const subLabel = this.data.easySubOptions[this.subIndex];
      finalKey = SEQUENCE_KEY_MAP.EASY[subLabel];
      finalLabel = `EASY - ${subLabel}`;
    } else {
      finalKey = SEQUENCE_KEY_MAP[selectedMain];
    }

    this.dropdown.setAttribute('visible', 'false');
    this.setMenuMovementState(false);
    if (this.upArrow) this.upArrow.setAttribute('visible', false);
    if (this.downArrow) this.downArrow.setAttribute('visible', false);

    const selectedCard = this.optionEntities[this.currentIndex];
    selectedCard.setAttribute('material', 'src', this.cardTextureSuccess);
    const selectedText = selectedCard.querySelector('a-text');
    selectedText.setAttribute('color', '#34D399');
    selectedText.setAttribute('value', 'LOADING...');

    // Fade the whole menu (panels + backdrop mask) out smoothly instead of
    // an abrupt hide, then hand off to the sequence loader.
    setTimeout(() => {
      this.container.setAttribute('animation__fadeout',
        'property: scale; to: 0.001 0.001 0.001; dur: 500; easing: easeInQuad');
      setTimeout(() => {
        if (this.container) this.container.setAttribute('visible', 'false');
        if (window.startSelectedSequence) {
          if (!finalKey) {
            console.warn(`[menu] No sequence key mapped for "${finalLabel}" — check SEQUENCE_KEY_MAP.`);
            return;
          }
          window.startSelectedSequence(finalKey);
        }
      }, 500);
    }, 800);
  }
});
