# VISION Mascot — Animation Direction V4

Reference lock: `REFERENCE_SPEC.md` and the approved VISION mascot turnaround in the project conversation. Do not change head/torso proportions, body charcoal, yellow face, mint V, or the paired mint indicator strips while working on animations.

## Acting intent

The mascot is grounded, soft and friendly: **not** a bouncy toy constantly jumping. Use small movements with readable intention and different timing for each body part. Never solve weak animation by adding holograms or glow.

## Idle — 4.7s breathing rhythm

- Chest/body breathing: approximately 0.7% height change, with matching subtle width compensation.
- Root stays planted (vertical drift about 0.006 scene units, not floating).
- Head micro-tilt and look direction move on non-synchronized 7–11 second cycles.
- Natural closing/reopening blink, occasional double blink.
- Both mitten arms have a subtle delayed sway; no constant limb waving.
- Feet are planted and the approved rest silhouette remains recognizable.

## Wave / Greet — 3.65s

| Time | Acting beat | Design rule |
|---|---|---|
| 0.00–0.28s | Notice visitor | Subtle gaze/head turn |
| 0.22–0.56s | Anticipate | Tiny body compress, opposite arm pre-motion |
| 0.56–1.12s | Raise arm | Smooth ease, mitten silhouette remains connected |
| 1.12–2.63s | Greet | Two gentle deliberate waves; smile morphs gradually |
| 2.61–3.65s | Recover | Soft arm settle, face returns to normal |

The right shoulder stays anchored to the body; no floating hand/pivot teleport. The mitten may stretch up to 16% while raised as a controlled cartoon deformation. The head and body react on offset timings rather than moving in lockstep.

## Technical implementation

- `src/motion-v4.js`: deterministic acting poses and easing curves, no CV dependency.
- `src/mascot-v3.js`: actual Three.js rig transforms, eye morphing, blinking and 3D geometry.
- `src/main-v3.js`: live motion controls, slow-motion review and a deterministic pose inspection hook.
- `tools/visual-review.mjs`: screenshot tests, twelve discrete wave poses and arm angle acceptance.

## Limitations

This remains a procedural Three.js rig with independent mesh pivots and restricted squash/stretch. It is **not** skinned, sculpted or animated in Blender, and there is no production `.glb` animation clip yet. Smoothness is animation timing and posing inside the browser, not a replacement for more advanced character rigging.

The CV implementation is out of scope for this iteration.
