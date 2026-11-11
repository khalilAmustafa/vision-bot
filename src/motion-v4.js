// VISION mascot acting curves. Pure functions: deterministic and independent of Three.js/CV.
// Timeline seconds correspond to storyboard: NOTICE → ANTICIPATE → LIFT → WAVE → RECOVER.
export const MOTION_VERSION='4.0.0';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const phase=(t,a,b)=>ease((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>phase(t,a,b)*(1-phase(t,c,d));
const lerp=(a,b,k)=>a+(b-a)*k;
const TAU=2*Math.PI;
export const CLIP_DURATION=Object.freeze({
  wave:3.65,greet:3.65,happy:2.2,curious:2.3,surprised:1.8,
  point:2.6,think:2.5,sleep:3.2
});
export function idlePose(t){
  // Small, NON-synchronized overlapping frequencies; grounded feet.
  const breath=Math.sin(TAU*t/4.7);
  const look= .042*Math.sin(TAU*t/10.6) + .024*Math.sin(TAU*t/6.7+.8);
  const lean=.014*Math.sin(TAU*t/7.4);
  const micro=.015*Math.sin(TAU*t/5.7+.35);
  return {
    y:.006*breath,
    lean,
    bodyPitch:micro,
    sx:1-.0035*breath,
    sy:1+.007*breath,
    sz:1-.0035*breath,
    headYaw:look,
    headPitch:.012*Math.sin(TAU*t/7.9),
    headRoll:.016*Math.sin(TAU*t/9.3),
    armL:-.13 + .016*Math.sin(TAU*t/5.1+1.8),
    armR: .13 + .016*Math.sin(TAU*t/5.1+.3),
    armFrontL:0,armFrontR:0,
    shoulderOffsetX:0,shoulderOffsetY:0,shoulderOffsetZ:0,
    wristWave:0,armStretch:0,
    feet:0,
    happy:0,
    eyebrow:0
  };
}
export function wavePose(t){
  t=clamp(t,0,3.65);
  const attention=phase(t,.0,.28);
  const windup=pulse(t,.22,.42,.56,.85);
  const lifted=phase(t,.56,1.11)*(1-phase(t,2.61,3.28));
  const waves=pulse(t,1.12,1.38,2.37,2.63);
  // Two deliberate waves with a subtle deceleration; never a frantic perpetual sine.
  const swing=Math.sin(TAU*2.05*(t-1.3)+.15);
  const settle=pulse(t,2.79,3.18,3.22,3.65);
  const reaction=pulse(t,.42,.80,2.84,3.5);
  return {
    y: -.02*windup +.018*lifted - .008*settle,
    lean:-.032*attention -.034*lifted,
    bodyPitch:-.012*windup +.032*lifted,
    sx:1+.022*windup-.012*lifted,
    sy:1-.030*windup+.017*lifted,
    sz:1+.021*windup-.006*lifted,
    headYaw:-.09*attention+.02*waves,
    headPitch:-.06*reaction + .026*settle,
    headRoll:-.11*reaction +.025*settle,
    // Positive local Z lifts its right arm out to the screen's right.
    armL:-.13-.065*reaction,
    armR:.13-.12*windup +2.18*lifted+.19*waves*swing,
    armFrontL:.05*reaction,
    armFrontR:.34*lifted,
    // The shoulder must stay physically attached to the torso. No floating hand.
    shoulderOffsetX:.015*lifted,
    shoulderOffsetY:.012*lifted,
    shoulderOffsetZ:.075*lifted,
    wristWave:.29*waves*swing,
    armStretch:.16*lifted,
    feet:0,
    happy:pulse(t,.53,.86,2.78,3.20),
    eyebrow:reaction
  };
}
export function otherPose(name,t,duration){
  const u=clamp(t/duration);
  const w=phase(u,.06,.26)*(1-phase(u,.76,1));
  const p={
    y:0,lean:0,bodyPitch:0,sx:1,sy:1,sz:1,headYaw:0,headPitch:0,headRoll:0,
    armL:-.13,armR:.13,armFrontL:0,armFrontR:0,shoulderOffsetX:0,
    shoulderOffsetY:0,shoulderOffsetZ:0,wristWave:0,armStretch:0,feet:0,happy:0,eyebrow:0
  };
  if(name==='happy'){
    const jump=Math.max(0,Math.sin(u*Math.PI*2));
    p.y=.095*jump*w;p.sy=1-.075*Math.max(0,Math.sin(u*Math.PI*4))*w;
    p.sx=1+.042*Math.max(0,Math.sin(u*Math.PI*4))*w;p.sz=p.sx;
    p.armL-=.75*w;p.armR+=.75*w;p.happy=w;p.headRoll=.08*w;
    p.feet=.085*w*Math.sin(u*Math.PI*7);
  }else if(name==='curious'||name==='think'){
    p.headRoll=-.17*w;p.headYaw=.11*w;p.armR+=.18*w;
  }else if(name==='surprised'){
    p.y=.065*w;p.sy=1.025*w+1-w;p.armL-=.63*w;p.armR+=.63*w;p.headPitch=-.085*w;
  }else if(name==='point'){
    p.armR+=1.48*w;p.armFrontR=.22*w;p.shoulderOffsetX=.07*w;p.shoulderOffsetZ=.15*w;
    p.headYaw=-.12*w;p.headRoll=-.055*w;
  }else if(name==='sleep'){
    p.headRoll=.15*w;p.headPitch=.08*w;p.y=-.03*w;
  }
  return p;
}
export function evaluatePose(name,elapsed,ambient){
  const idle=idlePose(ambient);
  if(!name)return idle;
  const d=CLIP_DURATION[name]||2.3;
  const clipped=clamp(elapsed,0,d);
  const action=name==='wave'||name==='greet'?wavePose(clipped):otherPose(name,clipped,d);
  // The acting layer naturally starts/ends at rest, avoiding hard jumps
  // if the previous state was already at the neutral pose.
  const weight=phase(clipped,0,.10)*(1-phase(clipped,d-.22,d));
  const out={};
  for(const k of Object.keys(idle)){
    if(['sx','sy','sz'].includes(k))out[k]=idle[k]+(action[k]-1)*weight;
    else if(k==='armR')out[k]=idle[k]+(action[k]-.13)*weight;
    else if(k==='armL')out[k]=idle[k]+(action[k]+.13)*weight;
    else out[k]=idle[k]+action[k]*weight;
  }
  return out;
}
export function blinkAmount(t){
  // Real eyelid closure and opening with 85ms down / 105ms up.
  const period=5.13, k=((t+.4)%period+period)%period;
  const single=pulse(k,4.06,4.145,4.19,4.295);
  // A quick occasional double-blink every fourth cycle.
  const double=Math.floor((t+.4)/period)%4===3?pulse(k,4.39,4.46,4.49,4.57):0;
  return Math.max(single,double);
}
