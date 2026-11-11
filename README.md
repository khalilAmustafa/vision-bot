# VISION Club — Interactive Mascot

A mobile-friendly Three.js prototype for the VISION Entrepreneurship & Innovation Club booth at ASU.

## Preview

https://khalilamustafa.github.io/vision-bot/

## Art direction (v2)

A compact, original companion robot inspired by clean soft-body industrial design, expressive desktop robots, and the user's reference sketches. This is **not** an Eilik model or a licensed third-party asset.

Changes from the first prototype:
- Soft egg-shaped torso and continuous rounded head instead of assembled boxes
- Broad mechanical flipper arms for greeting and waving
- Larger expressive visor with readable eyes and mouth
- Removed floating cube, headphone discs and oversized projection effects
- Neutral cream and sage materials, controlled cyan accents and studio lighting
- Cleaner navy booth presentation

## Interactions

Manual controls: Greeting, Wave, Happy, Curious, Thumbs Up, Surprise, appearance colors, solid/holographic modes, orbit camera, fullscreen booth mode.

Optional webcam computer vision: MediaPipe face detection (head-following) and gesture recognition (open palm, thumbs-up, victory). Video is processed in the browser; no recording or server-side inference.

## Implementation

Static `index.html` using CDN-imported Three.js and dynamically loaded MediaPipe models. There is no build step, and GitHub Pages deploys via `.github/workflows/pages.yml` on pushes to `main`.

**Limitations:** Internet is needed for CDN/model loading. Webcam requires HTTPS permission. Runtime appearance and CV reliability need checking on a real browser and the intended booth computer.

## Deployment

Open **Settings → Pages**, set source to **GitHub Actions**, and inspect the **Actions** tab for deployment status.
