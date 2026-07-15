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
  }
};


// ─── Resolve Active Sequence ──────────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const seqKey = params.get('seq') || 'easy-standard';
const config = SEQUENCES[seqKey] ?? SEQUENCES['easy-standard'];

if (!SEQUENCES[seqKey]) {
  console.warn(`[main] Unknown sequence "${seqKey}", falling back to "easy-standard".`);
}

window.setPlayerMovementEnabled = function (enabled) {
  const rig = document.querySelector('#rig');
  if (!rig) return;

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

  // 3. Move sequence-specific static assets (images, audio) into <a-assets>
  const seqAssets = tmp.querySelector('#seq-assets');
  if (seqAssets) {
    [...seqAssets.children].forEach(el => {
      if (el.id && assets.querySelector(`[id="${el.id}"]`)) {
        return;
      }
      const clone = el.cloneNode(true);
      clone.setAttribute('data-sequence-owned', 'true');
      assets.appendChild(clone);
    });
  } else {
    console.warn('[main] #seq-assets not found in sequence HTML.');
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

window.resetEnvironmentState = function(floor = 2) {
  const rig = document.querySelector('#rig');
  const elevator = document.querySelector('#elevatorModel');
  const mainChar = document.querySelector('#mainCharacterEntity');
  
  // 1. Instantly snap player back to starting position
  const currentY = rig.object3D.position.y; // Capture current Y position for dynamic use
  rig.setAttribute('position', '-4.5 ' + currentY + ' 0');
  rig.setAttribute('rotation', '0 -90 0');
  
  // 2. Stop player animations
  mainChar.setAttribute('animation-mixer', 'clip: Idle; loop: repeat');
  
  // 3. Reset Elevator state instantly without re-triggering the door animation
  window.isMoving = false;
  window.isDoorsOpen = false;
  elevator?.removeAttribute('animation-mixer');
  
  // 4. Keep the environment at the intended starting floor
  if (floor) {
    window.currentStartFloor = floor;
  }
  
  // 5. Hide dynamic sequence elements
  document.querySelectorAll('[data-sequence-owned]').forEach(el => el.setAttribute('visible', 'false'));
};

