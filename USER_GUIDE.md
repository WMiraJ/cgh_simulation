# User Guide — CGH Claustrophobia VR Simulation

For facilitators running exposure-therapy sessions on the 3 department VR headsets. For technical details, see the [README](./README.md).

---

## Opening the app

- **On the 3 department headsets:** open the library from the homepage and launch **"Claustro VR"** — it's already saved there as an app.
- **On any other headset:** open the browser, go to https://wmiraj.github.io/cgh_simulation/, then save it as a shortcut from the browser menu for quicker access next time.

You'll land on a 2D screen first — press **ENTER** to move into the VR view.

## Choosing a scenario

Point the controller like a laser at a menu option and pull the trigger to select. Use either the left or right controller — but **don't pull both triggers at the same time**, as this confuses the menu's laser pointer and can cause the selection to misfire.

**Introductory** expands into a submenu (Standard / Empty / Crowded) — click **Introductory** again to collapse it.

| Scenario | NPCs | Stops | Duration |
|---|:---:|:---:|:---:|
| Introductory → Standard | 1 | 2 | ~100s |
| Introductory → Empty | 0 | 1 | ~90s |
| Introductory → Crowded | 8 | 1 | ~110s |
| Intermediate | 4 | 6 | ~190s |
| Advanced | 8 | 7 | ~320s |

NPC count and stop count are the main factors that decide how enclosed and prolonged the exposure feels — use these to pick where to start and how to step a patient up.

## Controls during a session

- **Button X** (left controller) — freeze/unfreeze the sequence. Either the patient or the facilitator can hold this controller. **This is not a comfort/pause button. It is designed so the facilitator can hold the user in the lift longer as part of the exposure exercise.**
- **Button A** (right controller) — stop and return to the menu
- **Button B** (right controller, menu page only) — exit straight back to the 2D home screen

## Between users

Exiting the VR view restarts the session. If a previous session wasn't properly exited, press **B** (while the menu is showing) to return to the 2D home screen, then press **ENTER** again — this gives the next user a fresh session.

## Watching along (casting)

The facilitator can see what the user sees via Meta casting. This needs the same Meta Horizon account logged in on both the headset and the casting device — the department headsets are on account **VRman**.

- **Mobile:** install the Meta Horizon app, make sure your mobile phone's app is logged into the **VRman** account (not your personal account), connect to the running headset, and tap **Cast**.
- **Desktop:** log in on both devices, on the headset go to **Camera → Cast → Desktop**, then view it at [horizon.meta.com/casting](https://horizon.meta.com/casting/).

## Good to know

- **Standing or sitting is fine** — the app locks the user's height/position inside the lift to a standing view either way. Sitting is supported specifically as a safety option for the patient.
- **A see-through wall with a cross pattern** means the user or controller has touched the Meta Guardian boundary. Long-press the Meta button on the right controller to recenter, or reset the boundary in the Quest settings.

## If the program isn't working properly

Do a hard refresh: in the browser, go to **Menu → Clear all browsing data**, then refresh the page.

## Project status

This has been internally tested and is a stable, running program — not a polished commercial product, but not a rough prototype either. For bug reports or questions, reach out to [Jiang Wenmiao](mailto:wenmiao_jiang@mymail.sutd.edu.sg).
