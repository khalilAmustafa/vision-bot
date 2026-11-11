# VISION Mascot — Locked Design Specification

This specification describes the **approved character reference** from the conversation (November 11, 2026). The Three.js implementation is a best-effort **procedural interpretation**, not a traced mesh or Blender-quality sculpt. **Do not substitute a generic white robot, floating drone, cube, scarf, vehicle, or headphones.**

## Character silhouette

- Chibi companion robot, nearly symmetrical.
- Wide, deeply rounded-square head with a soft charcoal shell and substantial rounded bezel.
- Deep glossy black inset screen, containing only warm yellow facial graphics (no painted physical eyes).
- Two **small black spherical nubs** on top, equally spaced.
- Two mirrored side pads, each with **one vertical mint-green luminous indicator**. The pad geometry and indicator placement must remain consistent around the model.
- Small tapered charcoal torso, very short connected pill-shaped arms and stubby, rounded-bottom feet.
- A small mint-green V mark centered on the chest. No extra logos or geometric ornaments.
- Character stands on the ground. It is not a floating robot.

## Locked palette
- Body shell: `#3B3E42`, matte and soft
- Face screen: `#0E0E0E`, glossy black
- Eyes/mouth: `#FFD84D`, bright soft yellow
- V and side lights: `#A8C7A6`, muted mint

## Current procedural proportions (approximate units)
- Head: 2.16 × 1.65 × 1.40, center Y≈0.68
- Visor black opening: about 1.65 × 1.15
- Torso: height≈0.9, maximum width≈1.35
- Leg group: two short separated rounded feet, total foot-bottom≈Y -1.62
- Shoulder/arm pivots: X ±0.615, Y -0.355
- Two head-side light pods at X ±1.11

## Animation language
- Smooth easing, layered secondary motion, natural anticipation and follow-through
- Subtle breathing and blinks in idle; no aggressive constant bobbing
- Wave: look toward visitor, tilt head, raise one arm and perform a small greeting oscillation, then settle back to idle
- Happy: change eyes and add a small squash/stretch reaction
- Curious: tilt the head and focus gaze
- Surprised: open eyes and small body recoil
- Never use rigid instant rotations or flashy excessive particle effects

## What is implemented
- `src/mascot-v3.js`: procedural geometry, articulated parts, expression texture, movement
- `src/main-v3.js`: studio scene, lighting, controls, interaction state
- `src/cv-v3.js`: optional browser-local MediaPipe processing
- `src/style-v3.css`: studio and booth layout
- `tools/visual-review.mjs`: Playwright screenshot smoke checks run in GitHub Actions

## Acceptance criteria
1. Character visible at front, 3/4 front, side and back with matching silhouette and materials.
2. Both side-light indicators use one consistent mirrored part definition.
3. Idle should be grounded, face readable, limbs down, with no clipping into the head.
4. Waving arm is clearly readable and returns to neutral smoothly.
5. Mobile layout must not cover the character with labels.
6. Browser has no page errors; WebGL renders in screenshot tests.

## Remaining limits
The live Three.js model is a prototype. It uses independent articulated groups rather than deformation-based skinning, and it does not yet provide a native Blender project or GLB file. Exact production-quality topology and soft body deformation would require a dedicated modeling and rigging pass. Camera interaction must be tested with the actual booth hardware and lighting.
