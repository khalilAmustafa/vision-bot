
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CLIP_DURATION, evaluatePose, blinkAmount} from './motion-v4.js';

const C = { charcoal:'#3b3e42', visor:'#0e0e0e', yellow:'#ffd84d', sage:'#a8c7a6' };
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const spring = (a,b,k,dt) => mix(a,b,1-Math.exp(-k*dt));
const mat = (color,extra={}) => new THREE.MeshPhysicalMaterial({color,roughness:.7,metalness:0,...extra});
const mesh = (g,m,parent,pos=[0,0,0]) => {const o=new THREE.Mesh(g,m);o.position.set(...pos);parent.add(o);return o};
const egg=(x,y,z,material,parent,pos) => {const m=mesh(new THREE.SphereGeometry(1,48,32),material,parent,pos);m.scale.set(x,y,z);return m;};
const rounded=(w,h,d,r,material,parent,pos) =>
  mesh(new RoundedBoxGeometry(w,h,d,10,r),material,parent,pos);

function rrShape(w,h,r){
  const x=w/2,y=h/2,s=new THREE.Shape();
  s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.absarc(x-r,-y+r,r,-Math.PI/2,0,false);
  s.lineTo(x,y-r);s.absarc(x-r,y-r,r,0,Math.PI/2,false);
  s.lineTo(-x+r,y);s.absarc(-x+r,y-r,r,Math.PI/2,Math.PI,false);
  s.lineTo(-x,-y+r);s.absarc(-x+r,-y+r,r,Math.PI,Math.PI*1.5,false);return s;
}
function softPanel(w,h,r,depth,material,parent,pos,bevel=.018){
  const g=new THREE.ExtrudeGeometry(rrShape(w,h,r),{
    depth,bevelEnabled:true,bevelSegments:5,steps:1,curveSegments:20,
    bevelThickness:bevel,bevelSize:bevel,bevelOffset:0
  });
  g.computeVertexNormals();return mesh(g,material,parent,pos);
}
function capsuleBetween(a,b,r,material,parent){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const dir=end.clone().sub(start),p=start.clone().add(end).multiplyScalar(.5);
  const geom=new THREE.CylinderGeometry(r,r,dir.length(),18,1,false);
  const obj=mesh(geom,material,parent,p.toArray());obj.quaternion.setFromUnitVectors(
    new THREE.Vector3(0,1,0),dir.normalize());
  egg(r,r,r,material,parent,a);egg(r,r,r,material,parent,b);
}
function createShadow(){
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const x=c.getContext('2d'),g=x.createRadialGradient(128,128,6,128,128,124);
  g.addColorStop(0,'rgba(18,21,24,0.48)');g.addColorStop(.35,'rgba(20,24,28,0.30)');
  g.addColorStop(.7,'rgba(20,24,28,0.06)');g.addColorStop(1,'rgba(20,24,28,0)');
  x.fillStyle=g;x.fillRect(0,0,256,256);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.1,2.8),new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide
  }));m.rotation.x=-Math.PI/2;m.position.set(0,-1.624,0);return m;
}

export class VisionMascot {
  constructor(scene){
    this.scene=scene;this.root=new THREE.Group();scene.add(this.root);
    this.parts={};this.expression='neutral';this.active=null;this.actionStart=0;
    this.faceTarget={x:0,y:0};this.faceAim={x:0,y:0};
    this.time=0;this.idleTime=0;this.lastBlink=0;this.blink=0;
    this.hologram=false;this.armWaves=0;this.faceMood=0;this.faceDrawAt=0;
    this.build();
  }
  build(){
    const shell=mat(C.charcoal,{roughness:.79});
    const body=mat('#383b3f',{roughness:.84});
    const trim=mat('#4b4e52',{roughness:.59});
    const dark=mat('#26292c',{roughness:.55});
    const black=mat('#0b0c0d',{roughness:.1,clearcoat:1,clearcoatRoughness:.12});
    const glass=mat(C.visor,{roughness:.11,metalness:.03,clearcoat:1,clearcoatRoughness:.065});
    const green= new THREE.MeshBasicMaterial({color:C.sage,toneMapped:false});
    const yellow=new THREE.MeshBasicMaterial({color:C.yellow,toneMapped:false});
    this.materials={shell,body,trim,dark,black,glass,green,yellow};
    const whole=new THREE.Group();this.root.add(whole);this.parts.whole=whole;
    const neck=egg(.22,.14,.25,dark,whole,[0,-.105,0]);neck.name='neck';
    const head=new THREE.Group();head.position.set(0,-.08,0);whole.add(head);this.parts.head=head;
    // The center of the head lies 0.70 units above its neck pivot.
    rounded(2.16,1.65,1.40,.5,shell,head,[0,.76,0]).name='head_shell';
    // Slightly proud rim and an inset glossy visor, with a continuous silhouette.
    softPanel(1.82,1.31,.35,.09,trim,head,[0,.72,.592],.045).name='screen_bezel';
    softPanel(1.72,1.21,.32,.034,black,head,[0,.72,.713],.024).name='screen_seal';
    softPanel(1.65,1.145,.30,.022,glass,head,[0,.72,.762],.008).name='black_glass';
    // Canvas carries all expressions; the physical visor remains a separate mesh.
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=690;
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    const faceTexture=new THREE.CanvasTexture(canvas);faceTexture.colorSpace=THREE.SRGBColorSpace;
    faceTexture.anisotropy=8;
    this.texture=faceTexture;
    this.facePlane=mesh(new THREE.PlaneGeometry(1.48,1.01),
      new THREE.MeshBasicMaterial({map:faceTexture,transparent:true,depthWrite:false,opacity:1,toneMapped:false}),
      head,[0,.73,.826]);
    // Two little spherical antennae, exactly matching the approved reference.
    for(const s of [-1,1]){
      egg(.075,.12,.075,dark,head,[s*.56,1.58,-.13]);
      egg(.125,.125,.125,shell,head,[s*.56,1.65,-.13]);
      // Each side gets the same green indicator, facing OUTWARD on the pad.
      const ear=rounded(.19,.56,.53,.087,trim,head,[s*1.107,.74,-.045]);
      ear.name=s<0?'left_indicator_pad':'right_indicator_pad';
      const strip=rounded(.034,.282,.095,.015,green,head,[s*1.218,.745,-.045]);
      strip.name=s<0?'left_mint_strip':'right_mint_strip';
    }
    // Tapered soft torso, one smoothly connected organic volume.
    const coords=[
      [0,-1.10],[.34,-1.10],[.56,-1.065],[.66,-.98],[.68,-.83],
      [.64,-.59],[.55,-.37],[.44,-.22],[.28,-.18],[0,-.18]
    ];
    const curve=new THREE.SplineCurve(coords.map(([r,y])=>new THREE.Vector2(r,y)));
    const torso=mesh(new THREE.LatheGeometry(curve.getPoints(54),72),body,whole);
    torso.scale.z=.79;torso.name='torso';this.parts.torso=torso;
    // Mint V mark follows the chest rather than being an arbitrary neon badge.
    const v=new THREE.Group();whole.add(v);this.parts.logo=v;
    capsuleBetween([-.12,-.52,.524],[0,-.69,.536],.03,green,v);
    capsuleBetween([0,-.69,.536],[.12,-.52,.524],.03,green,v);
    // Rounded mitten arms. They are single deformable-looking shapes with true shoulder pivots.
    for(const sign of [-1,1]){
      const a=new THREE.Group();
      a.position.set(sign*.615,-.355,.055);
      whole.add(a);a.rotation.z=-sign*.18;
      // No separate ball joint: the arm silhouette flows into the torso.
      const hand=egg(.19,.355,.198,body,a,[sign*.12,-.385,.02]);
      hand.rotation.z=sign*.24;
      this.parts[sign<0?'leftFlipper':'rightFlipper']=hand;
      a.name=sign<0?'LeftArm_Pivot':'RightArm_Pivot';
      this.parts[sign<0?'left':'right']=a;
    }
    // Short, thick feet; the character is grounded, not hovering.
    for(const sign of [-1,1]){
      const leg=new THREE.Group();leg.position.set(sign*.295,-1.005,.01);whole.add(leg);
      rounded(.54,.68,.58,.25,body,leg,[0,-.28,.075]);leg.name=sign<0?'leftFoot':'rightFoot';
      this.parts[sign<0?'legL':'legR']=leg;
    }
    this.shadow=createShadow();this.scene.add(this.shadow);
    this.applyFace();
  }
  setHologram(on){
    this.hologram=on;
    const m=this.materials;
    for(const k of ['shell','body','trim']){
      m[k].transparent=on;m[k].opacity=on?.78:1;m[k].depthWrite=!on;
      m[k].emissive.set(on?'#17463b':'#000000');
      m[k].emissiveIntensity=on?.24:0;
      m[k].needsUpdate=true;
    }
    this.shadow.material.opacity=on?.48:1;
  }
  setFaceTarget(x,y){this.faceTarget.x=clamp(x,-1,1);this.faceTarget.y=clamp(y,-1,1)}
  trigger(name,now=this.time){
    if(!CLIP_DURATION[name])return;
    this.active={name,start:now,duration:CLIP_DURATION[name]};
    this.expression=name==='greet'?'wave':name;
    // Emotion and body pose ease in together; no instant emoji swap.
  }
  reset(){
    this.active=null;this.expression='neutral';
    this.setFaceTarget(0,0);
    this.faceMood=0;
    this.applyFace();
  }
  applyFace(){
    const c=this.ctx;
    c.clearRect(0,0,1024,690);
    c.save();c.lineCap='round';c.lineJoin='round';
    const xx=this.faceAim.x*20,yy=-this.faceAim.y*14;
    const glow='#ffd84d';
    const eyes=[330+xx,690+xx],emotion=this.expression;
    const smile=emotion==='wave'||emotion==='greet'||emotion==='happy'?this.faceMood:0;
    const blink=Math.min(1,Math.max(0,this.blink));
    c.shadowColor='rgba(255,216,77,.45)';c.shadowBlur=18;
    for(let i=0;i<2;i++){
      const x=eyes[i],y=305+yy;
      const h=Math.max(4,73*(1-blink));
      c.fillStyle=glow;c.strokeStyle=glow;
      if(emotion==='sleep'||emotion==='think'){
        c.beginPath();c.lineWidth=23;c.moveTo(x-48,y+6);c.lineTo(x+48,y+6);c.stroke();continue;
      }
      if(emotion==='surprised'){
        c.beginPath();c.ellipse(x,y,46,60*(1-.88*blink),0,0,Math.PI*2);c.fill();continue;
      }
      if(emotion==='curious'&&i===0){
        c.beginPath();c.ellipse(x,y,40,55*(1-.90*blink),0,0,Math.PI*2);c.fill();continue;
      }
      // A neutral pair of warm-yellow ovals morphs into smiling arcs.
      if(smile<.999){
        c.globalAlpha=(1-smile);
        c.beginPath();c.ellipse(x,y,63,h,0,0,Math.PI*2);c.fill();
      }
      if(smile>.001){
        c.globalAlpha=smile;
        c.beginPath();c.lineWidth=36;c.moveTo(x-60,y+28);
        c.quadraticCurveTo(x,y-68*(1-blink)+y*blink*.0,x+60,y+28);
        c.stroke();
      }
      c.globalAlpha=1;
    }
    c.fillStyle=glow;c.strokeStyle=glow;
    c.beginPath();
    if(emotion==='surprised'){
      c.ellipse(512,471,26,34,0,0,Math.PI*2);c.fill();
    }else if(emotion==='sad'){
      c.lineWidth=21;c.arc(512,508,45,Math.PI*1.11,Math.PI*1.88);c.stroke();
    }else if(emotion==='sleep'||emotion==='think'){
      c.lineWidth=18;c.moveTo(476,470);c.lineTo(548,470);c.stroke();
    }else{
      c.moveTo(430,445);c.quadraticCurveTo(512,456,594,445);
      c.quadraticCurveTo(585,521,512,521);
      c.quadraticCurveTo(439,521,430,445);
      c.closePath();c.fill();
    }
    c.restore();this.texture.needsUpdate=true;
  }
  update(time,dt){
    const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
    const damp=(value,target,rate)=>value+(target-value)*(1-Math.exp(-rate*dt));
    dt=clamp(dt,.001,.05);
    this.time=time;this.idleTime+=dt;
    let clip='',elapsed=0;
    if(this.active){
      clip=this.active.name;
      elapsed=Math.max(0,time-this.active.start);
      if(elapsed>=this.active.duration){
        this.active=null;clip='';elapsed=0;this.expression='neutral';
      }
    }
    const pose=evaluatePose(clip,elapsed,this.idleTime);
    const whole=this.parts.whole,head=this.parts.head;
    // Relative hand/head/body motion is deliberately offset for follow-through.
    whole.position.y=damp(whole.position.y,pose.y,10);
    whole.rotation.z=damp(whole.rotation.z,pose.lean,10);
    whole.rotation.x=damp(whole.rotation.x,pose.bodyPitch,8);
    whole.scale.x=damp(whole.scale.x,pose.sx,8);
    whole.scale.y=damp(whole.scale.y,pose.sy,8);
    whole.scale.z=damp(whole.scale.z,pose.sz,8);
    this.faceAim.x=damp(this.faceAim.x,this.faceTarget.x,4.5);
    this.faceAim.y=damp(this.faceAim.y,this.faceTarget.y,4.5);
    head.rotation.y=damp(head.rotation.y,pose.headYaw+this.faceAim.x*.24,7);
    head.rotation.x=damp(head.rotation.x,pose.headPitch-this.faceAim.y*.14,7);
    head.rotation.z=damp(head.rotation.z,pose.headRoll,8.5);
    this.parts.left.rotation.z=damp(this.parts.left.rotation.z,pose.armL,10);
    this.parts.right.rotation.z=damp(this.parts.right.rotation.z,pose.armR,12);
    this.parts.left.rotation.x=damp(this.parts.left.rotation.x,pose.armFrontL,8);
    this.parts.right.rotation.x=damp(this.parts.right.rotation.x,pose.armFrontR,10);
    const r=this.parts.right;
    r.position.x=damp(r.position.x,.615+pose.shoulderOffsetX,10);
    r.position.y=damp(r.position.y,-.355+pose.shoulderOffsetY,10);
    r.position.z=damp(r.position.z,.055+pose.shoulderOffsetZ,10);
    this.parts.leftFlipper.rotation.z=damp(this.parts.leftFlipper.rotation.z,-.24,10);
    this.parts.rightFlipper.rotation.z=damp(this.parts.rightFlipper.rotation.z,.24+pose.wristWave,15);
    this.parts.legL.rotation.x=damp(this.parts.legL.rotation.x,pose.feet,9);
    this.parts.legR.rotation.x=damp(this.parts.legR.rotation.x,-pose.feet,9);
    // Blinks have eyelid opening/closing rather than a one-frame disappearance.
    this.blink=blinkAmount(this.idleTime);
    this.faceMood=damp(this.faceMood,pose.happy,9);
    if(clip==='wave'||clip==='greet')this.expression=clip;
    // Face updates are capped for mobile but still smoothly morph between expressions.
    if(time-this.faceDrawAt>.038){
      this.faceDrawAt=time;this.applyFace();
    }
  }
}
