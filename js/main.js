// ════════════════════════════════════════════════════════════════════════════
// main.js
// Responsible for:
//   1. Resolving which sequence to run (via ?seq= URL param)
//   2. Fetching the sequence's HTML fragment and distributing its content:
//        #seq-assets   → children appended into <a-assets>
//        #seq-entities → children appended into <a-scene>
//   3. Calling the sequence's init() function
//
// Note: GLB asset items are injected by the inline <script> in index.html,
// not here. That script runs synchronously before any entity that references
// those assets is initialised by A-Frame.
//
// Note: The player rig (camera, body, hand controls) lives in index.html,
// not in any sequence fragment. See the comment there for the reason.
//
// To add a new sequence:
//   - Add an entry to SEQUENCES below
//   - Create sequences/sequenceXX.html  (entities + assets, no rig)
//   - Create js/sequenceXX.js           (components + logic)
//   - Add <script src="js/sequenceXX.js"> in index.html <head>
// ════════════════════════════════════════════════════════════════════════════


// ─── Sequence Registry ────────────────────────────────────────────────────────

const SEQUENCES = {
  'easy-standard': {
    key: 'easy-standard',
    startFloor: 2,
    html: 'sequences/sequence01.html',
    init: () => window.Sequence01?.init('easy-standard')
  },

  'easy-without-npcs': {
    key: 'easy-without-npcs',
    startFloor: 2,
    html: 'sequences/sequence02.html',
    init: () => window.Sequence02?.init('easy-without-npcs')
  },

  'easy-with-all-npcs': {
    key: 'easy-with-all-npcs',
    startFloor: 2,
    html: 'sequences/sequence03.html',
    init: () => window.Sequence03?.init()
  }, 

  'normal': {
    key: 'normal',
    startFloor: 4,
    html: 'sequences/sequence04.html',
    init: () => window.Sequence04?.init('normal')
  },

  'hard': {
    key: 'hard',
    startFloor: 4,
    html: 'sequences/sequence05.html',
    init: () => window.Sequence05?.init('hard')
  }
};


// ─── Resolve Active Sequence ──────────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const seqKey = params.get('seq') || 'easy-standard';
const config = SEQUENCES[seqKey] ?? SEQUENCES['easy-standard'];

if (!SEQUENCES[seqKey]) {
  console.warn(`[main] Unknown sequence "${seqKey}", falling back to "easy-standard".`);
}

window.VR_DISABLE_THUMBSTICK_TURN = true;

window.setPlayerMovementEnabled = function (enabled) {
  const rig = document.querySelector('#rig');
  if (!rig) return;

  if (window.VR_DISABLE_THUMBSTICK_TURN) {
    rig.removeAttribute('movement-controls');
    return;
  }

  if (enabled) rig.setAttribute('movement-controls', 'speed: 0.1');
  else rig.removeAttribute('movement-controls');
};


// ─── Sequence Loader ──────────────────────────────────────────────────────────

function clearSequenceContent() {
  const scene  = document.querySelector('a-scene');
  const assets = document.querySelector('a-assets');

  if (!scene || !assets) return;

  scene.querySelectorAll('[data-sequence-owned]').forEach(el => el.remove());
  assets.querySelectorAll('[data-sequence-owned]').forEach(el => el.remove());
}

function trackAssetLoad(item) {
  return new Promise((resolve) => {
    if (item.hasLoaded) return resolve({ id: item.id, ok: true });
    const cleanup = () => {
      item.removeEventListener('loaded', onLoad);
      item.removeEventListener('error', onError);
    };
    const onLoad  = () => { cleanup(); resolve({ id: item.id, ok: true }); };
    const onError = (e) => {
      cleanup();
      console.error(`[main] Asset failed to load: ${item.id}`, e);
      resolve({ id: item.id, ok: false });
    };
    item.addEventListener('loaded', onLoad);
    item.addEventListener('error', onError);
  });
}

// 1. Simplify the loading updates since we are using a static .png now
function updateLoadingOverlay(done, total) {
  // Logic removed: We rely on the static "btn-loading.png" to communicate loading state
}

function showLoadError(failedIds) {
  const loadingBtn = document.getElementById('btn-loading');
  if (loadingBtn) loadingBtn.style.display = 'none';
  
  const overlay = document.getElementById('ui-overlay');
  if (overlay) {
    let errDiv = document.getElementById('load-error-msg');
    if (!errDiv) {
      errDiv = document.createElement('div');
      errDiv.id = 'load-error-msg';
      errDiv.style.color = '#d32f2f';
      errDiv.style.fontWeight = 'bold';
      overlay.querySelector('.ui-content').appendChild(errDiv);
    }
    errDiv.textContent = `Couldn't load: ${failedIds.join(', ')}. Check connection.`;
  }
}

// 2. Wire the new UI elements to A-Frame's VR entry logic
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  const mask = document.querySelector('#ui-overlay');
  const enterButton = document.querySelector('#btn-enter');
  let hasShownStartupCue = false;

  const syncMask = () => {
    if (!scene || !mask) return;
    const shouldShow = !scene.is('vr-mode');
    mask.classList.toggle('is-visible', shouldShow);
  };

  const softRefreshForNewSession = () => {
    if (window.__softRefreshQueued) return;
    window.__softRefreshQueued = true;

    window.setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  const showStartupCue = () => {
    if (hasShownStartupCue) return;
    hasShownStartupCue = true;

    const cue = document.querySelector('#vr-entry-cue');
    if (!cue) return;
    cue.setAttribute('visible', 'true');
    cue.setAttribute('animation__cuefadein', 'property: scale; from: 0.85 0.85 0.85; to: 1 1 1; dur: 220; easing: easeOutQuad');
    setTimeout(() => {
      cue.setAttribute('visible', 'false');
      cue.removeAttribute('animation__cuefadein');
    }, 5000);
  };

  // Wire the visual button directly to the VR scene logic
  enterButton?.addEventListener('click', () => {
    if (scene?.enterVR) scene.enterVR();
  });

  scene?.addEventListener('loaded', syncMask);
  scene?.addEventListener('enter-vr', () => {
    window.__softRefreshQueued = false;
    syncMask();
    showStartupCue();
  });
  scene?.addEventListener('exit-vr', () => {
    syncMask();
    softRefreshForNewSession();
  });
  syncMask();
});

async function loadSequence(cfg, { autostart = false } = {}) {
  const scene  = document.querySelector('a-scene');
  const assets = document.querySelector('a-assets');

  if (!scene || !assets) return;

  // When a sequence is explicitly launched from the menu, suppress the
  // default "show the menu again after assets load" behavior so the scene
  // can run uninterrupted.
  window._suppressSequenceMenu = Boolean(autostart);

  window.Sequence01?.teardown?.();
  window.Sequence02?.teardown?.();
  window.Sequence03?.teardown?.();
  window.Sequence04?.teardown?.();
  window.Sequence05?.teardown?.();
  clearSequenceContent();

  // 1. Fetch the sequence HTML fragment
  let text;
  try {
    const res = await fetch(cfg.html);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    text = await res.text();
  } catch (err) {
    console.error(`[main] Failed to load sequence HTML (${cfg.html}):`, err);
    return;
  }

  // 2. Parse the fragment into a temporary container
  const tmp     = document.createElement('div');
  tmp.innerHTML = text;

  // 3. Move sequence-specific static assets (images, audio) into <a-assets> & track loading
  const seqAssets = tmp.querySelector('#seq-assets');
  const assetPromises = [];
  
  if (seqAssets) {
    [...seqAssets.children].forEach(el => {
      const existing = el.id && assets.querySelector(`[id="${el.id}"]`);
      if (existing) { 
        assetPromises.push(trackAssetLoad(existing)); 
        return; 
      }
      const clone = el.cloneNode(true);
      clone.setAttribute('data-sequence-owned', 'true');
      assets.appendChild(clone);
      assetPromises.push(trackAssetLoad(clone));
    });
  } else {
    console.warn('[main] #seq-assets not found in sequence HTML.');
  }

  updateLoadingOverlay(0, assetPromises.length);
  let doneCount = 0;
  
  assetPromises.forEach(p => p.then(() => updateLoadingOverlay(++doneCount, assetPromises.length)));
  
  const results = await Promise.all(assetPromises);
  const failed = results.filter(r => !r.ok);
  
  if (failed.length) { 
    showLoadError(failed.map(f => f.id)); 
    return; // Halt sequence loading if assets fail
  }

  // 4. Inject A-Frame entities into <a-scene>
  const seqEntities = tmp.querySelector('#seq-entities');
  if (seqEntities) {
    [...seqEntities.children].forEach(el => {
      const clone = el.cloneNode(true);
      clone.setAttribute('data-sequence-owned', 'true');
      scene.appendChild(clone);
    });
  } else {
    console.warn('[main] #seq-entities not found in sequence HTML.');
  }

  window.activeSequenceKey = cfg.key;

  // 5. Hand off to the sequence's own init() (defined in its companion JS)
  cfg.init();

  if (autostart) {
    window.dispatchEvent(new CustomEvent('vr-start-sequence', {
      detail: { key: window.activeSequenceKey }
    }));
  }
}


// ─── Entry Point ─────────────────────────────────────────────────────────────

window.startSelectedSequence = function (key) {
  if (key && !SEQUENCES[key]) {
    console.warn(`[main] Sequence "${key}" is not wired up yet; starting Standard instead.`);
    key = 'easy-standard';
  }

  const selectedKey = key || 'easy-standard';
  const cfg = SEQUENCES[selectedKey] ?? SEQUENCES['easy-standard'];
  loadSequence(cfg, { autostart: true });
};

document.addEventListener('DOMContentLoaded', () => loadSequence(config));

document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  const mask = document.querySelector('#vr-entry-mask');
  const enterButton = document.querySelector('#enter-vr-overlay-button');
  let hasShownStartupCue = false;

  const syncMask = () => {
    if (!scene || !mask) return;
    const shouldShow = !scene.is('vr-mode');
    mask.classList.toggle('is-visible', shouldShow);
  };

  const showStartupCue = () => {
    if (hasShownStartupCue) return;
    hasShownStartupCue = true;

    const cue = document.querySelector('#vr-entry-cue');
    if (!cue) return;
    cue.setAttribute('visible', 'true');
    cue.setAttribute('animation__cuefadein', 'property: scale; from: 0.85 0.85 0.85; to: 1 1 1; dur: 220; easing: easeOutQuad');
    setTimeout(() => {
      cue.setAttribute('visible', 'false');
      cue.removeAttribute('animation__cuefadein');
    }, 5000);
  };

  enterButton?.addEventListener('click', () => {
    if (scene?.enterVR) scene.enterVR();
  });

  scene?.addEventListener('loaded', syncMask);
  scene?.addEventListener('enter-vr', () => {
    syncMask();
    showStartupCue();
  });
  scene?.addEventListener('exit-vr', syncMask);
  syncMask();
});

window.resetEnvironmentState = function(floor = 2) {
  const rig = document.querySelector('#rig');
  const elevator = document.querySelector('#elevatorModel');
  const mainChar = document.querySelector('#mainCharacterEntity');
  
  if (rig) {
    // 1. Kill any active camera/rig animations so they don't override the reset
    rig.removeAttribute('animation__panIn');
    rig.removeAttribute('animation__panOut');
    rig.removeAttribute('animation__turn');

    // 2. Instantly snap player back to starting position
    const currentY = rig.object3D.position.y; // Capture current Y position for dynamic use
    
    // Check which sequence is active to set the precise starting coordinate
    if (window.activeSequenceKey === 'easy-with-all-npcs') {
      rig.setAttribute('position', { x: -4.194, y: currentY, z: -0.015 });
    } else if (window.activeSequenceKey === 'normal') {
      rig.setAttribute('position', { x: -3.965, y: currentY, z: 0.331 });
    } else {
      // Default for easy-standard and easy-without-npcs
      rig.setAttribute('position', { x: -4.5, y: currentY, z: 0 });
    }
    
    rig.setAttribute('rotation', '0 -90 0');

    // 3. Reset the camera's physical look rotation (pitch and yaw)
    const cameraEl = rig.querySelector('[camera]');
    if (cameraEl?.components['look-controls']) {
      cameraEl.components['look-controls'].pitchObject.rotation.x = 0;
      cameraEl.components['look-controls'].yawObject.rotation.y = 0;
    }
  }
  
  // 4. Reset the VR Body sync wrapper
  const bodyWrapper = document.querySelector('#bodyWrapper');
  if (bodyWrapper) bodyWrapper.object3D.rotation.y = 0;
  
  // 5. Stop player animations
  if (mainChar) {
    mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
  }
  
  // 6. Reset Elevator state instantly without re-triggering the door animation
  window.isMoving = false;
  window.isDoorsOpen = false;
  if (elevator) elevator.removeAttribute('animation-mixer');
  
  // 7. Keep the environment at the intended starting floor
  if (floor) {
    window.currentStartFloor = floor;
  }
  
  // 8. Hide dynamic sequence elements
  document.querySelectorAll('[data-sequence-owned]').forEach(el => el.setAttribute('visible', 'false'));
};

