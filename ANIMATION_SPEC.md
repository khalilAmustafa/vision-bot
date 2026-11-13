# VISION animation contract — November 12, 2026

Supersedes procedural V4/V6 rules, including the old allowance for arm stretching.

## Blender clips
Idle 4.8 s; Wave 4 s; Point 3.2 s; Think 3.6 s; Happy 2.4 s; Curious 2.8 s; Surprised 2.2 s; Sleep 4.8 s. Greet aliases Wave. All clips are in assets/vision.glb.

Wave: notice 0–0.25 s, anticipation 0.20–0.55 s, lift 0.55–1.15 s, two greeting oscillations 1.15–2.65 s, lower 2.65–3.65 s, settle through 4.0 s. Head tilts opposite the hand on delayed timing. Idle channels have equal endpoint transforms.

Shoulders belong to Body_Pivot: Blender X ±0.395, Y -0.12, Z 1.105, below the head lower edge (~1.12). Shoulder positions never change during animation. The shorter arms use separate skins and fixed sockets recessed into the torso. Each wrist articulates independently. Arms use smooth weighted skeletons: upper arm, two elbow bend segments, and wrist/hand. The upper arm lifts then holds during the greeting; the wrist produces the two oscillations. Bone lengths and scale remain fixed. No visible mechanical joints. Feet remain planted. This replaces the earlier single rigid-flipper approach after user motion feedback.

## Runtime APIs
- setExpression(name, {duration: 0.18}): face only. Neutral, Happy, Sad, Curious, Low Battery, Sleepy, Excited, Surprised, Think; lowercase aliases accepted.
- playAction(name, {restart: true, fade: 0.3}): body only. Interruptions and repeated actions blend from the captured current pose.
- trigger(name, now): existing button/gesture compatibility, selecting the corresponding action and expression.
- reset(): neutral expression, Idle, centered gaze. Page resets slow-motion speed too.
- seek(name, seconds): deterministic paused mixer pose; resume() resumes.
- status(): actual rig state. Page review hook exposes pose/resume/expression/view/status/metrics.

A curved Face_Surface uses one packed atlas with open/closed variants for nine expressions. Expression weights blend over 180 ms. Blinks preserve the mouth. Blender uses the same image and surface. Head_Aim provides damped gaze tracking separately from authored Head_Pivot motion.

## Verification
Tests cover clip presence, horn absence, body-mounted shoulders, no scale channels, triangle budget, Idle endpoints, wave samples, fixed feet/shoulders, expression independence/blending, head tracking, interruptions, reset, slow motion, mobile layout, load failure, and mocked camera callbacks. Physical camera recognition and hardware 60 FPS are not established by mocks/software rendering.

Editable Blender Scene properties: ExpressionIndex (0–8) and Blink (0–1) drive the same atlas without affecting body actions. The exported GLB retains a neutral standard material; runtime supplies the independent expression/blink blend shader. No Blender-only handlers are needed for the GLB.
