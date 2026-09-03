# CGH Claustrophobia VR Simulation

A WebXR virtual reality exposure-therapy prototype that simulates riding a lift, built with [A-Frame](https://aframe.io/). Developed in collaboration with Changi General Hospital (CGH) Clinical Psychology team as a tool for graded claustrophobia exposure therapy.

**Live demo:** https://wmiraj.github.io/cgh_simulation/

For a non-technical walkthrough of what the simulation does and how to run a session, see the [User Guide](./USER_GUIDE.md). For clinical background and design rationale, see the [Project Report](./REPORT.md).

---

## What this is

The app puts the user in a first-person VR view inside a lift. A menu lets the user choose one of five scenarios, ranging from an empty lift with no other occupants up to a crowded, multi-stop ride with several NPCs. Each scenario is a scripted timeline of lift movement, door opening/closing, NPC entry/exit, together with ambient sound to mirror the real pacing of a typical lift ride.

## Tech stack

- **[A-Frame 1.6.0](https://aframe.io/)** — WebXR scene framework, loaded via CDN (no bundler/build step)
- **[aframe-extras](https://github.com/c-frame/aframe-extras)**, **[aframe-environment-component](https://github.com/supermedium/aframe-environment-component)**, **[aframe-htmlembed-component](https://github.com/supereggbert/aframe-htmlembed-component)** — third-party A-Frame plugins, also via CDN
- Plain HTML/CSS/JavaScript — no framework, no `package.json`, no build step
- **Git LFS** for the `.glb` 3D models (see `.gitattributes`)
- Deployed automatically to **GitHub Pages** on every push to `main` (`.github/workflows/static.yml`)
- Ships a `manifest.json` + `service-worker.js`, so it can be installed as a PWA and used offline once cached
- Built and tested for **Meta Quest 2**; accessed by users through the headset's built-in browser via the GitHub Pages URL above

## Repo structure

```
index.html              Scene shell: persistent entities (lift model, lighting, floor
                         displays, shaft-view images, camera/body rig, VR menu), shared
                         by every sequence. Also defines the pre-VR "Enter" overlay UI.
manifest.json            PWA manifest (icons, install shortcuts, screenshots)
service-worker.js         Offline caching for the PWA

js/
  main.js                Sequence registry + router. Reads ?seq= from the URL, fetches
                         the matching sequences/sequenceXX.html fragment, injects its
                         assets/entities into the scene, then calls its init().
  menu.js                Difficulty-select menu component (vr-sequence-menu) and the
                         Intro/Intermediate/Advanced button → sequence-key mapping
                         (SEQUENCE_KEY_MAP).
  components.js          Shared custom A-Frame components used across sequences:
                         vr-height-fix, body-sync, sequence-controller,
                         vr-controller-input, texture-scroller, curve-walk,
                         fix-ui-rendering.
  sequenceBase.js         SequenceBase class — the shared engine for lift state,
                         movement, door/floor logic, and VR event handling. Every
                         sequence extends this.
  sequence01.js .. 05.js  One controller per scenario (NPC configs, timelines).
                         Registered on window as Sequence01 … Sequence05.

sequences/
  sequence01.html .. 05.html   HTML fragments (entities + assets only, no player
                                 rig) loaded on demand by main.js for each scenario.

assets/                  3D models (.glb, via Git LFS), lobby/floor-view images,
                         UI graphics, sound effects.
screenshots/             PWA install screenshots.
favicon_io/              App icons.
```

## Scenario / sequence map

The menu maps to `main.js`'s `SEQUENCES` registry via `SEQUENCE_KEY_MAP` in `menu.js`:

| Menu button                       | Sequence key         | File               | Duration    |
|------------------------------------|-----------------------|--------------------|:-----------:|
| Introductory → Standard             | `easy-standard`        | `sequence01.js/html` | ~100s |
| Introductory → Empty                | `easy-without-npcs`    | `sequence02.js/html` | ~90s |
| Introductory → Crowded              | `easy-with-all-npcs`   | `sequence03.js/html` | ~110s |
| Intermediate                        | `normal`               | `sequence04.js/html` | ~190s |
| Advanced                            | `hard`                 | `sequence05.js/html` | ~320s |

## Running it locally

No build step is required — it's static HTML/JS. Serve the folder with any local static server (opening `index.html` directly via `file://` will break asset loading), for example:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed local URL in a WebXR-capable browser, or on a headset's browser for the full VR experience.

## Deployment

Pushing to `main` triggers `.github/workflows/static.yml`, which checks out the repo (with Git LFS enabled) and deploys the whole repo root to GitHub Pages. No manual deploy step is needed.

## Adding a new scenario

As noted in `main.js`:
1. Add an entry to the `SEQUENCES` object in `js/main.js`.
2. Create `sequences/sequenceXX.html` (entities + assets only — the player rig already lives in `index.html`, don't duplicate it).
3. Create `js/sequenceXX.js`, extending `SequenceBase`.
4. Add `<script src="js/sequenceXX.js">` in `index.html`'s `<head>`.
5. If it should be reachable from the menu, add a button/mapping in `js/menu.js`.

## Known limitations / open items

See the [Project Report](./REPORT.md) for a detailed history of the project, including resolved technical challenges and any remaining clinical considerations being worked through with the CGH team.

## License / usage

This prototype was developed by Jiang Wenmiao, in collaboration with the Changi General Hospital (CGH) Clinical Psychology team.

*Note: This is a specialized clinical prototype intended for graded exposure therapy, not a general-purpose open-source project. Please consult with the CGH Clinical Psychology team regarding any usage, distribution, or clinical application.*
