# VISION Club — Interactive 3D Mascot

A mobile-friendly, browser-based Three.js robot mascot for the VISION entrepreneurship and innovation club booth at ASU.

## Preview
When GitHub Pages deployment succeeds, visit: https://khalilamustafa.github.io/vision-bot/

## Features
- Procedural editable 3D robot with head, torso, articulated arms and hands
- Idle float, greeting, wave, curious, surprise, thumbs-up and happy reactions
- Adjustable shell, accent and eye colors
- Solid and experimental hologram material modes
- Optional webcam face/gesture tracking using MediaPipe (open palm, thumbs up, victory)
- Fullscreen booth view

## Deployment
This is a static HTML application. `.github/workflows/pages.yml` deploys automatically on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.

## Development
Open `index.html` using a local web server. The file uses native JavaScript modules and CDN-hosted Three.js/MediaPipe dependencies. A plain `file://` URL may not work.

## Notes
Camera use requires HTTPS or localhost and the visitor's permission. All webcam processing runs in the browser and no video is stored or sent to this repository. The app fetches JavaScript and CV models from external CDNs, so internet is necessary for first load and camera model initialization. This remains a prototype, and should be tested on the actual booth computer before the event.
