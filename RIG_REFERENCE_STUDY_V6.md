# VISION Mascot — reference geometry and rig study (V6 experiment)

Status: **experimental; do not replace the approved live character on visual-code checks alone.** Source images: the user's locked front, 3/4, side and back PNG references plus the Wave concept mock. Measurements are **approximate, normalized design targets** derived from perspective artwork, not measured manufacturing CAD.

## Visible anatomy in the approved reference

| Feature | Reference observation | V4 deviation | Target in 3D study |
|---|---|---|---|
| Head | Wider than torso, smoothly rounded-square | acceptable core outline | keep 2.16 × 1.65 × 1.40 units |
| Face/frame | black screen opening ~77% of outer head width in front reference | projection makes black opening seem too large and gray band thin | front opening geometry ~1.47 wide, 1.00 high; frame exterior ~1.88 wide, 1.39 high; test on-camera |
| Bezel depth | prominent gray **solid** frame with soft rounded edge, glossy black inset | current layers protrude visually and expose narrow rim | thicker matte-gray surround, screen recessed relatively to frame |
| Neck | none visible | extra sphere removed in V4 | head sits directly over upper torso; hidden pivot only |
| Arms | long rounded capsules, taper towards a hidden root under head; visible independent seams against torso | separate ellipsoids pivot too far out/down, rigid rotation clips head | shoulder driver X ±.515, Y −.29, Z .06; capsule root begins X ±.43, Y −.28 inside body |
| Arm shape | soft volume, no fingers, no exposed circular shoulder | floating/flat flipper look | curved capsule surface, variable radius ~.15–.205, rounded distal tip |
| Hips / legs | two short thick rounded legs with tops hidden beneath torso, narrow vertical seam between legs | feet too tall / appear detached | leg width .54, height .60, depth .58, centers ±.295 and ~Y−1.32 |
| Indicator lights | mint vertical bars on **both HEAD sides** | must remain mirrored | unchanged from locked reference |

## Head geometry

- Outer front head width (image estimate): ~500 pixels.
- Black display width: ~385 pixels, giving 0.77 width ratio (image estimate).
- Estimated visual surround on each side is ~50–60 reference pixels, thicker around the corners.
- Perspective magnifies the display because it sits in front of the shell. The literal Three.js mesh ratio is not the rendered screen ratio; validate the final apparent 0.77 ratio from front camera.
- Preferred layers: sculpted charcoal outer head, slightly lighter gray rounded bezel, thin black seal, glossy black recessed display, animated yellow face texture.

## Attachment coordinates / arcs (whole-body local units)

The following coordinates are initial targets and require multi-view review:

| Point | Rest | Raised Wave |
|---|---|---|
| Right shoulder (hidden) | (0.515, −0.29, 0.06) | fixed, may translate ≤0.02 |
| Right arm buried root | (0.43, −0.28, 0.055) | anchored to torso |
| Right upper bend guide | (0.57, −0.405, 0.125) | (0.98, −0.36, 0.20) |
| Right outer bend guide | (0.745, −0.66, 0.16) | (1.17, −0.27, 0.30) |
| Right rounded tip | (0.775, −0.84, 0.155) | (1.26, 0.10, 0.36) |
| Left shoulder and arm | mirror X | mirror X when left-wave is added |
| Hip centers | X ±0.295, Y approximately −1.01 | no significant translation |

The arm is a separately shaded **continuous capsule** with its root embedded in the torso. The torso and arms must **not** be merged into a swollen one-piece animal-like silhouette. Small intentional seams are part of the character's design.

## Animation collision and readability tests

1. At rest, each arm joins at or just below head bottom and extends only about as low as the torso; feet clearly begin underneath.
2. At the start of Wave, the hand first moves **outward**, then upward.
3. When raised, the hand tip is beyond the screen/outer-face silhouette, and the hand never penetrates the head or visor. Check side as well as front.
4. During Wave, the shoulder remains fixed inside torso; never translate/teleport an exposed socket.
5. The head tilts in the **opposite direction** from the waving hand, returning to neutral during recovery.
6. Exactly two readable, gentle greeting beats. No giant limb stretch, sharp pivots, or pet-like flipper movement.
7. Frame thickening must preserve the bright eyes and face readability on a booth screen.

## Scope and validation

V6 is a sandbox preview served at `index-v6-preview.html`, with model in `src/mascot-v6.js`, dynamic arm geometry in `src/curve-arm-v6.js`, and a separate Playwright visual review. **Do not switch `index.html` to V6 until reference comparison and human review approve all views and motion.**

## Side-view review note
The first V6 wave looked too close to the lower head in profile. Driving the entire hand far forward in Z made it resemble a long pet flipper. That version was rejected. The corrected experiment moves the arm farther **laterally** (X) and keeps wave depth near the original reference, accepting a small hidden intersection at the buried shoulder only. Front and side screenshots are required before promotion.
