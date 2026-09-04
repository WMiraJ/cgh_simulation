# Project Report — Claustro VR

**Developer:** Jiang Wenmiao

**Supervisors:** Eugene Kheng Wei Long and Lester Lai Yousheng

**Department & Organization:** Clinical Psychology, Changi General Hospital (CGH)

**Status:** Internally tested, stable prototype

*Note: The clinical rationale documented in this report reflects general direction and background provided by the CGH Clinical Psychology team, refined through ongoing discussion and feedback between the developer and the team. Sections 4 and 5 in particular describe the clinical thinking behind the app and how it shaped implementation, not independent clinical judgment by the developer.*

---

## 1. Project Context

Claustrophobia is commonly treated with graded exposure therapy: a patient is incrementally exposed to a feared enclosed space under controlled, supportive conditions, so they can re-learn that the situation isn't actually dangerous. In Singapore, a lift is one of the most common everyday triggers — small, often crowded, and hard for most patients to simply avoid.

VR was proposed by the clinical team as a way to combine four properties that are hard to get together with real-world exposure:

- **Accessibility** — a real lift is easy enough to access, but other target situations the same approach could extend to (e.g. flight-related fear) are far harder to arrange for repeated practice.
- **Controllability** — the simulation is pre-designed and the patient can stop immediately if uncomfortable; exposure can move gradually from simple simulation → harder simulation → real life.
- **Repeatability** — a patient can repeat the same scenario as many times as needed to support re-learning.
- **Extendability** — the same codebase could, with modification, extend to other phobia use cases (e.g. agoraphobia).

This project is a working prototype exploring that idea for lift-based claustrophobia: a VR simulation letting a psychologist calibrate exposure intensity (crowd size, ride duration, number of stops) in a way that's difficult and impractical to arrange safely with a real lift.


## 2. Background: Why Exposure Therapy Works This Way

This background was shared by the clinical team and shapes several of the design decisions in Section 4:

Anxiety tends to generalize. A specific learned fear ("strangers can be dangerous") can broaden into a wider belief ("everyone is dangerous, I can't trust people"). This generalization is typically learned either directly or through others, and — importantly — it can also be *re-learned* in the other direction: by slowly and safely exposing someone to the feared situation, showing them it is not actually threatening.

Claustrophobia — fear of tight or enclosed spaces, generally rooted in a fear of suffocation or physical restriction — was the phobia the team chose as this prototype's target, voted on early in the project. A crowded lift was picked as a common, concrete, relatable everyday scenario in which that fear shows up. The exposure experience was designed to be structured from least scary to most scary, rather than as a single fixed scenario, so a facilitator can grade intensity over multiple sessions.

## 3. Objectives

- Build a working VR prototype simulating a lift ride, usable on department VR headsets
- Support multiple exposure intensity levels, adjustable by crowd size and number of stops, ordered from least to most intense
- Keep the experience controllable and safe for a facilitator to run with a patient
- Produce something usable and documented enough for others to pick up and continue

## 4. Clinical Direction & Requirements

- **A graded difficulty ladder, not a single scenario.** In line with the least-to-most-scary structure from Section 2, the team's direction was a step-up sequence (Introductory → Intermediate → Advanced) so a facilitator can start a patient at a tolerable intensity and build up over multiple sessions. Introductory itself has three variants (Standard/Empty/Crowded) partly because "empty lift" and "crowded lift" test different fears — no-one-around vs. no-personal-space — so offering both was more useful than picking one.
- **Facilitator-controllable freeze.** The team specified a mechanism letting the facilitator hold the patient in the lift longer than the scripted timeline, as a deliberate exposure technique — implemented as the 'X' button, held on a controller either the patient or facilitator can be holding. This is explicitly not a pause/comfort feature; if a patient is genuinely struggling, the specified response is removing the headset, not freezing the scene.
- **Warning cues before movement.** Since the patient's body stays physically stationary while the visual scene moves, a warning cue was added before any lift movement, so the patient is never moved without warning. This was reinforced after a tester reported motion discomfort (see Section 8).
- **Height lock.** Following discussion with the team, the patient's viewpoint is locked at a standing height inside the lift regardless of whether they're actually standing or sitting, so the visual exposure is consistent across patients — sitting is supported specifically as a safety option for patients who need it.
- **Simple, deliberate controls.** Only three buttons matter during a session, and trigger/grip inputs were deliberately avoided for these actions, to reduce the risk of an accidental press from a nervous or shaky patient.
- **No data collection.** Patient data logging was never part of the direction given; the app is frontend-only, with no backend, login, or database — nothing about a patient or their session is recorded anywhere.

## 5. System Overview

Claustro VR runs in a browser using WebXR — no app-store install required — and has been built and tested for the Meta Quest 2. On the department's 3 headsets it's saved as a PWA for one-tap access from the headset home screen; it also works offline after the first load, since it caches its own 3D models, images, and audio.

A user selects one of five scenarios from an in-VR menu before a session starts:

| Sequence | Duration (inside lift) | Characters | Stops | What it does |
|---|:---:|:---:|:---:|---|
| Introductory — Standard | ~100s | 1 NPC | 2 | A gentle first step: one stranger, one intermediate stop |
| Introductory — Empty | ~90s | 0 NPCs | 1 | Direct express ride, completely alone |
| Introductory — Crowded | ~110s | 8 NPCs | 1 | Full crowding, but a direct ride — no stop-and-go |
| Intermediate | ~190s | 4 NPCs | 6 | Realistic peak-hour ride: moderate crowding, frequent stops |
| Advanced | ~320s | 8 NPCs | 7 | Full crowding and an extended, unpredictable ride |

Crowd size and stop count are the two levers used to grade exposure intensity. Rough storyboards:

- **Introductory — Standard:** enter with 1 NPC → NPC exits at an intermediate stop → patient exits at destination.
- **Intermediate:** enter with 3 NPCs → crowd thins and re-forms over 5 intermediate stops → patient exits alone at the final stop.
- **Advanced:** crowd builds from 2 to a maximum of 8 NPCs over several stops → a "false stop" at level 11 where the doors open but nobody enters or exits (tension without relief) → ~100s of unbroken crowded transit to the 50th floor.

Full operating instructions are in the [User Guide](./USER_GUIDE.md); technical/architecture details are in the [README](./README.md).

## 6. Design Decisions

Choices made in the course of implementation, distinct from the clinical directions in Section 4:

- **AI-generated outside/lobby view.** The problem with on-site 360° photography was that the outside view couldn't be controlled or defined: shots were blocked by other buildings, suffered overexposure, were taken from a building that didn't actually have the needed floor, or didn't show enough height change to read as "high up." The fix was to remove the outside-view portion from the real photo in Photoshop and paste a generated outside view in behind it, giving full control over what the view outside the lift actually shows.
- **Advanced scenario's final destination.** The 50th floor wasn't planned during the earlier 3D model-building phase, so the lift's control panel model has no floor-50 button. Once floor 50 was decided on for the Advanced scenario, the choice was to leave the panel as-is rather than add another model and increase asset weight.
- **Auto-turn removed.** An earlier version auto-rotated the camera on lift entry; this was removed so the patient controls the camera themselves, which reduces VR dizziness and keeps the experience more realistic.
- **Hosting approach.** The app is hosted free on GitHub Pages, requires no app-store install, and works offline after first load. For quick testing it can also be sideloaded directly onto a Quest headset over USB. Store distribution (via the Meta Horizon Store, since Quest runs on Android) is a possible future option, not pursued yet.
- **Two-layer code structure.** A shared engine (lift movement, main character) is used by every scenario; each scenario then only needs to define its own specific events and NPC behavior on top of that shared engine — chosen to keep adding new scenarios cheap.

## 7. Development Process & Key Milestones

- Built with A-Frame (WebXR framework), no build tooling — static HTML/JS deployed via GitHub Pages, auto-deploying on every push to `main`.
- Roughly a 16-week build: physical shell (lift, hallway, lobby) → realism pass (surfaces, rendering) → assembly (bringing models into A-Frame, characters, spatial audio) → animation and exposure ladder implementation → refinement & documentation.
- Underwent two major architecture refactors: an initial split of a monolithic scene file into a modular multi-file structure, followed by a later consolidation of shared persistent scene elements (lift model, lighting, camera rig) into a single shared shell to avoid duplicate asset loads and ID collisions across scenarios.
- Built a custom VR difficulty-select menu (laser-pointer + trigger selection, hover/selected states, controller-agnostic input).
- Resolved several technical issues along the way: a sequence-start race condition, lighting misconfiguration, texture errors from styling detached entities, a sequence-key mismatch between the menu and the sequence registry, and a camera/body desync from A-Frame's default camera injection.
- Presented project progress to the wider department and incorporated the resulting feedback (see Section 8).

## 8. Testing & Feedback

Testing has been informal and internal, run alongside development rather than as a separate formal QA phase:

- **Motion discomfort.** A tester reported feeling sick/uncomfortable during lift movement, since patients can't physically move while wearing the headset. In response, camera movement was slowed by roughly 50%, and a warning cue was added before any movement starts.
- **Control logic.** Early open questions about who should hold the controllers and what each button should do were resolved through iteration and clinical-team discussion, landing on the current A/X/B scheme, with either the patient or facilitator able to hold the freeze-capable controller.

## 9. Known Limitations & Open Questions

- Whether to invest further in NPC realism (livelier behavior, carrying props) — flagged as a possible bandwidth/loading cost, not yet researched in depth
- No formal clinical validation or patient outcome data exists yet — testing so far has been internal and informal, not a clinical trial

## 10. Future Work

- A possible extension to other phobia types (e.g. an agoraphobia scenario using fog to control perceived horizon/visibility as a difficulty lever).
- Continued refinement of NPC behavior and animation.
- Formal usability/clinical testing with actual patients, beyond internal testing.

## 11. Handover Notes

For anyone picking this project up:

- Start with the [README](./README.md) for the codebase structure and how to run/deploy it.
- The [User Guide](./USER_GUIDE.md) covers day-to-day operation for facilitators.
- Sections 2 and 4 of this report are the best available summary of *why* things were built the way they were, and Section 9 covers what's still undecided — worth reading before making design changes.
- Wenmiao remains reachable to advise on bugs.

## Appendix

- Live app: https://wmiraj.github.io/cgh_simulation/
- Source code: https://github.com/WMiraJ/cgh_simulation
- [README](./README.md) — technical/architecture reference
- [User Guide](./USER_GUIDE.md) — facilitator operating instructions
