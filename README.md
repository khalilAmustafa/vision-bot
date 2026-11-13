# VISION Club interactive mascot

[Live preview](https://khalilamustafa.github.io/vision-bot/)

The current mascot uses the VISION Media navy, circuit-blue, and cyan palette and the circuit-bulb chest badge. The Blender-authored GLB includes weighted arm rigs, eight body animations, and a shared expression atlas. Three.js handles viewing, animation blending, and expressions.

Open the live preview on desktop or mobile to orbit the mascot, choose a view, or trigger an animation. Optional MediaPipe face and gesture tracking runs in the browser and requires camera permission. The viewer serves Three.js locally and loads MediaPipe on demand.

Run locally with `python -m http.server 4173` from the repository root. GitHub Pages deploys the static site on pushes to `main`.

The model is in `assets/vision.glb`. See [the animation contract](ANIMATION_SPEC.md) and [the reference contract](REFERENCE_SPEC.md) for rig and design details. The visual review workflow checks the current GLB, and the V6 and legacy preview pages preserve earlier designs.
