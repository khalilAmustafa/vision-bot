# VISION Club — Interactive Mascot (Three.js)

**Live demo:** https://khalilamustafa.github.io/vision-bot/

Interactive, fully procedural 3D mascot for the VISION Entrepreneurship & Innovation Club booth at Applied Science Private University.

## Status

- **V5 connection pass:** unified skinned body for torso, both shoulders/arms and feet, generated with smooth-surface blending in `src/soft-body-v5.js`. Head remains an intentionally rigid separate assembly.
- Body uses 7 bones (root, paired shoulders, wrists and feet); no visibly intersecting arm or leg meshes. Waving wrist motion has been revised to stay readable alongside the head.

- **V3 reference-based model** published to `index.html`, with front/3/4/side/back view controls.
- Designed from the approved charcoal, black, yellow and mint-green turnaround.
- **V4 animation pass:** storyboard-timed Wave/Greet, subtle grounded Idle, gradual smile/eye morph, smooth overlap between head/body/arm and an optional ×0.5 motion review.
- Additional procedural tests: happy, curious, surprised, point, sleep.
- Manual controls on mobile and desktop, optional face and hand tracking from MediaPipe.
- Solid shading by default; optional experimental hologram effect.
- No build step; GitHub Pages deploys static files automatically on pushes to `main`.

## Files

- `src/mascot-v3.js` — scene graph, approved model geometry, morphing face texture and articulated motion
- `src/motion-v4.js` — pure Idle/Wave animation curves with anticipation, deliberate beats and gentle recovery
- `src/soft-body-v5.js` — one fused and skinned procedural body surface with soft joint weighting
- `ANIMATION_SPEC.md` — acting storyboard and reference-based motion constraints
- `src/main-v3.js` — viewer, lighting, camera orbit, interaction UI
- `src/cv-v3.js` — optional camera and MediaPipe detection
- `src/style-v3.css` — responsive studio UI
- `REFERENCE_SPEC.md` — locked design proportions, materials and acceptance checks
- `tools/visual-review.mjs` — browser screenshot smoke tests in GitHub Actions
- `index-v3-preview.html` — same current studio as a direct preview file
- `legacy-v2.html` — previous robot design preserved

## Try it

Visit the live demo on phone or desktop. Drag to turn, select camera view, trigger a reaction, or enable webcam (requires HTTPS and permission). Press **Booth mode** to expand the experience.

The webcam feed is processed within your browser and is not stored by this app. External JS and MediaPipe models are downloaded from CDNs when needed.

## Visual QA

`.github/workflows/visual-review.yml` boots the page in a real Chrome browser via Playwright, captures desktop and mobile views, and fails on JavaScript page errors. The QA artifacts contain front, 3/4, side, back, wave and mobile screenshots, plus twelve staged Wave keyposes with assertions for connected shoulders and reference arm length. **Camera tracking itself is not tested in CI** and should be validated with booth lighting.

## Limitations

This is a **Three.js model study** with object-pivot animation, not a production Blender sculpt, deformable skeletal rig or animated GLB. It is a procedural approximation to the locked concept image with a continuous skinned soft-body (added V5), not a hand-sculpted production asset or a Blender-authored GLB. Head/body separation is still intentional; exact production topology, silhouette accuracy and advanced facial deformation require a later artist-led rigging pass.
