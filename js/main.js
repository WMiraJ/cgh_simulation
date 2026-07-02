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
    html: 'sequences/sequence01.html',
    init: () => window.Sequence01?.init()
  }

  // Placeholder for future sequences:
  // 'easy-standard-02': {
  //   html: 'sequences/sequence02.html',
  //   init: () => window.Sequence02?.init()
  // }
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

async function loadSequence(cfg) {
  const scene  = document.querySelector('a-scene');
  const assets = document.querySelector('a-assets');

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
    [...seqAssets.children].forEach(el => assets.appendChild(el.cloneNode(true)));
  } else {
    console.warn('[main] #seq-assets not found in sequence HTML.');
  }

  // 4. Inject A-Frame entities into <a-scene>
  const seqEntities = tmp.querySelector('#seq-entities');
  if (seqEntities) {
    [...seqEntities.children].forEach(el => scene.appendChild(el.cloneNode(true)));
  } else {
    console.warn('[main] #seq-entities not found in sequence HTML.');
  }

  // 5. Hand off to the sequence's own init() (defined in its companion JS)
  cfg.init();
}


// ─── Entry Point ─────────────────────────────────────────────────────────────

window.startSelectedSequence = function (key) {
  if (key && key !== 'easy-standard') {
    console.warn(`[main] Sequence "${key}" is not wired up yet; starting the current sequence instead.`);
  }
  window.dispatchEvent(new Event('vr-start-sequence'));
};

document.addEventListener('DOMContentLoaded', () => loadSequence(config));
