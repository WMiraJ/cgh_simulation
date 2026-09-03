# Project Report — Claustro VR

**Developer:** Jiang Wenmiao
**Supervisors:** Eugene Kheng Wei Long and Lester Lai Yousheng
**Department & Organization:** Clinical Psychology, Changi General Hospital (CGH)
**Status:** Internally tested, stable prototype

*Note: The clinical rationale documented in this report reflects requirements and background provided by the CGH Clinical Psychology team, which were then mapped to technical implementation by the developer. Sections 4 and 5 in particular describe what the clinical team asked for and why, not independent clinical judgment by the developer.*

---

## 1. Project Context

Claustrophobia is commonly treated with graded exposure therapy: a patient is incrementally exposed to a feared enclosed space under controlled, supportive conditions, so they can re-learn that the situation isn't actually dangerous. In Singapore, a lift is one of the most common everyday triggers — small, often crowded, and hard for most patients to simply avoid.

VR was proposed by the clinical team as a way to combine four properties that are hard to get together with real-world exposure:

- **Accessibility** — a real lift is easy enough to access, but other target situations the same approach could extend to (e.g. flight-related fear) are far harder to arrange for repeated practice.
- **Controllability** — the simulation is pre-designed and the patient can stop immediately if uncomfortable; exposure can move gradually from simple simulation → harder simulation → real life.
- **Repeatability** — a patient can repeat the same scenario as many times as needed to support re-learning.
- **Extendability** — the same codebase could, with modification, extend to other phobia use cases (e.g. agoraphobia).

This project is a working prototype exploring that idea for lift-based claustrophobia: a VR simulation letting a psychologist calibrate exposure intensity (crowd size, ride duration, number of stops) in a way that's difficult and impractical to arrange safely with a real lift.

Mira was the sole developer, working under an internship arrangement with CGH, in ongoing collaboration with Eugene and Lester from the Clinical Psychology team, who provided the clinical requirements and background described below, as well as testing devices and feedback.

## 2. Background: Why Exposure Therapy Works This Way

This background was provided by the clinical team at the project's outset, and shapes several of the requirements in Section 4:

Anxiety tends to generalize. A specific learned fear ("strangers can be dangerous") can broaden into a wider belief ("everyone is dangerous, I can't trust people"). This generalization is typically learned either directly or through others, and — importantly — it can also be *re-learned* in the other direction: by slowly and safely exposing someone to the feared situation, showing them it is not actually threatening.

The clinical team identified claustrophobia — specifically fear of enclosed or tight spaces, fear of being unable to escape, and fear of crowded lifts — as the target for this prototype, and specified that the exposure experience should be structured from least scary to most scary, rather than as a single fixed scenario.

## 3. Objectives

- Build a working VR prototype simulating a lift ride, usable on department VR headsets
- Support multiple exposure intensity levels, adjustable by crowd size and number of stops, ordered from least to most intense
- Keep the experience controllable and safe for a facilitator to run with a patient
- Produce something usable and documented enough for others to pick up and continue

## 4. Clinical Requirements (Provided by Psychology Team)

The following were specified or requested by the clinical team, then implemented technically by the developer:

- **A graded difficulty ladder, not a single scenario.** The clinical team requested a step-up sequence (Introductory → Intermediate → Advanced) so a facilitator can start a patient at a tolerable intensity and build up over multiple sessions, consistent with the least-to-most-scary structure described in Section 2.
- **Real-world pacing.** The team asked that lift movement timing be calibrated against a real lift ride (~70s baseline) and real lift dimensions (120×140×210 cm), rather than an arbitrary or dramatized pace, so the experience matches what patients actually encounter day to day.
- **Facilitator-controllable freeze.** The team specified a mechanism letting the facilitator hold the patient in the lift longer than the scripted timeline, as a deliberate exposure technique — implemented as the 'X' button, held on a controller either the patient or facilitator can be holding. This is explicitly not a pause/comfort feature; if a patient is genuinely struggling, the specified response is removing the headset, not freezing the scene.
- **Warning cues before movement.** Since the patient's body stays physically stationary while the visual scene moves, a warning cue was requested to appear before any lift movement, so the patient is never moved without warning. This was reinforced after a tester reported motion discomfort (see Section 6).
- **Height lock.** The team requested that the patient's viewpoint be locked at a standing height inside the lift regardless of whether they're actually standing or sitting, so the visual exposure is consistent across patients — sitting is supported specifically as a safety option for patients who need it.
- **Simple, deliberate controls.** Only three buttons matter during a session, and trigger/grip inputs were deliberately avoided for these actions, to reduce the risk of an accidental press from a nervous or shaky patient.
- **No data collection.** The team did not request any patient data logging; the app is frontend-only, with no backend, login, or database — nothing about a patient or their session is recorded anywhere.

## 5. System Overview

Claustro VR runs in a browser using WebXR — no app-store install required — and has been built and tested for the Meta Quest 2. On the department's 3 headsets it's saved as a PWA for one-tap access from the headset home screen; it also works offline after the first load, since it caches its own 3D models, images, and audio.

A facilitator selects one of five scenarios from an in-VR menu before a session starts:

| Sequence | Duration (inside lift) | Characters | Stops | What it does |
|---|:---:|:---:|:---:|---|
| Introductory — Standard | 80s (65s) | 1 NPC | 1 | A gentle first step: one stranger, one intermediate stop |
| Introductory — Empty | 70s (57s) | 0 NPCs | 0 | Direct express ride, completely alone |
| Introductory — Crowded | 90s (65s) | 8 NPCs | 0 | Full crowding, but a direct ride — no stop-and-go |
| Intermediate | 185s (160s) | 4 NPCs | 5 | Realistic peak-hour ride: moderate crowding, frequent stops |
| Advanced | 315s (305s) | 8 NPCs | 6 | Full crowding and an extended, unpredictable ride |

Crowd size and stop count are the two levers used to grade exposure intensity. Rough storyboards:

- **Introductory — Standard:** enter with 1 NPC → NPC exits at an intermediate stop → patient exits at destination.
- **Intermediate:** enter with 3 NPCs → crowd thins and re-forms over 5 intermediate stops → patient exits alone at the final stop.
- **Advanced:** crowd builds from 2 to a maximum of 8 NPCs over several stops → a "false stop" where the doors open but nobody enters or exits (tension without relief) → ~100s of unbroken crowded transit to the final destination floor.

Full operating instructions are in the [User Guide](./USER_GUIDE.md); technical/architecture details are in the [README](./README.md).

## 6. Design Decisions

Choices made in the course of implementation, distinct from the clinical requirements in Section 4:

- **AI-generated outside/lobby view.** Real 360° on-site photography was attempted, but real sightlines were blocked by pillars, gates, and railings, and upper-floor access was restricted — so real photos couldn't reliably convey height. The fix was a curved reference image paired with an AI-generated, semi-transparent sky layer, giving a clear and controllable sense of altitude that's also simple to build and adjust.
- **Advanced scenario's final destination.** The Advanced scenario ends at a high floor as an actual destination in the storyboard, chosen over duplicating or editing the 3D lift model, which would have added unnecessary load weight.
- **Auto-turn removed.** An earlier version auto-rotated the camera on lift entry; this was removed so the patient controls the camera themselves.
- **Hosting approach.** The app is hosted free on GitHub Pages, requires no app-store install, and works offline after first load. For quick testing it can also be sideloaded directly onto a Quest headset over USB. Store distribution (via the Meta Horizon Store, since Quest runs on Android) is a possible future option, not pursued yet.
- **Two-layer code structure.** A shared engine (lift movement, main character) is used by every scenario; each scenario then only needs to define its own specific events and NPC behavior on top of that shared engine — chosen to keep adding new scenarios cheap.

## 7. Development Process & Key Milestones

- Built with A-Frame (WebXR framework), no build tooling — static HTML/JS deployed via GitHub Pages, auto-deploying on every push to `main`.
- Roughly a 12-week build: physical shell (lift, hallway, lobby) → realism pass (surfaces, rendering) → assembly (bringing models into A-Frame, characters, spatial audio) → animation and exposure ladder implementation → refinement (current phase).
- Underwent two major architecture refactors: an initial split of a monolithic scene file into a modular multi-file structure, followed by a later consolidation of shared persistent scene elements (lift model, lighting, camera rig) into a single shared shell to avoid duplicate asset loads and ID collisions across scenarios.
- Built a custom VR difficulty-select menu (laser-pointer + trigger selection, hover/selected states, controller-agnostic input).
- Resolved several technical issues along the way: a sequence-start race condition, lighting misconfiguration, texture errors from styling detached entities, a sequence-key mismatch between the menu and the sequence registry, and a camera/body desync from A-Frame's default camera injection.
- Presented project progress to the wider department and incorporated the resulting feedback (see Section 8).

## 8. Testing & Feedback

Testing has been informal and internal, run alongside development rather than as a separate formal QA phase:

- **Motion discomfort.** An early tester reported feeling sick/uncomfortable during lift movement, since patients can't physically move while wearing the headset. In response, camera movement was slowed by roughly 50%, and a warning cue was added before any movement starts.
- **NPC animation feedback.** A colleague flagged that one NPC's idle animation was distracting to a patient standing near him. His position was adjusted; whether to keep or remove the idle animation entirely is still an open decision (see Section 9).
- **Control logic.** Early open questions about who should hold the controllers and what each button should do were resolved through iteration and clinical-team discussion, landing on the current A/X/B scheme, with either the patient or facilitator able to hold the freeze-capable controller.
- **Department presentation.** Feedback from presenting to the wider department was tracked and largely addressed in following iterations (destination floor, motion comfort, control logic).

## 9. Known Limitations & Open Questions

**Resolved during development:**
- Controller ownership and button scheme (A/X/B)
- Motion discomfort mitigation (slower movement + warning cues)
- Destination floor for the Advanced scenario
- Height locking for standing/sitting use

**Still open:**
- Whether to keep or remove one NPC's idle animation
- Whether to invest further in NPC realism (livelier behavior, carrying props) — flagged as a possible bandwidth/loading cost, not yet researched in depth
- Whether a self-assessment component (e.g. patient-reported distress rating) should be added
- No formal clinical validation or patient outcome data exists yet — testing so far has been internal and informal, not a clinical trial

## 10. Future Work

- A possible extension to other phobia types (e.g. an agoraphobia scenario using fog to control perceived horizon/visibility as a difficulty lever) has been discussed as a demonstration of the codebase's extendability — not started.
- Continued refinement of NPC behavior and animation.
- Formal usability/clinical testing with actual patients, beyond internal testing.
- Deciding on and potentially implementing a self-assessment/distress-rating component.
- Possible store distribution via the Meta Horizon Store.

## 11. Handover Notes

For anyone picking this project up:

- Start with the [README](./README.md) for the codebase structure and how to run/deploy it.
- The [User Guide](./USER_GUIDE.md) covers day-to-day operation for facilitators.
- Sections 2 and 4 of this report are the best available summary of *why* things were built the way they were, and Section 9 covers what's still undecided — worth reading before making design changes.
- Mira remains reachable to advise on bugs.

## Appendix

- Live app: https://wmiraj.github.io/cgh_simulation/
- Source code: https://github.com/WMiraJ/cgh_simulation
- [README](./README.md) — technical/architecture reference
- [User Guide](./USER_GUIDE.md) — facilitator operating instructions
