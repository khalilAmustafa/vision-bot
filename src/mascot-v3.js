
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
    this.hologram=false;this.armWaves=0;
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
    const durations={wave:3.3,greet:3.4,happy:2.2,curious:2.3,surprised:1.8,think:2.5,point:2.6,sleep:3.2};
    if(!durations[name])return;
    this.active={name,start:now,duration:durations[name]};
    this.expression=name==='greet'?'happy':name;
    this.applyFace();
  }
  reset(){this.active=null;this.expression='neutral';this.setFaceTarget(0,0);this.applyFace()}
  applyFace(){
    const c=this.ctx,W=this.canvas.width,H=this.canvas.height;
    c.clearRect(0,0,W,H);
    c.save();c.lineCap='round';c.lineJoin='round';
    const xx=this.faceAim.x*22, yy=-this.faceAim.y*17;
    const glow='#ffd84d';c.fillStyle=glow;c.strokeStyle=glow;
    c.shadowColor='rgba(255,216,77,.53)';c.shadowBlur=22;
    const eyes=[330+xx,690+xx];
    const type=this.expression,blink=this.blink>.65;
    for(let i=0;i<2;i++){
      const x=eyes[i],y=305+yy;
      c.beginPath();
      if(blink||type==='sleep'||type==='think'){
        c.lineWidth=27;c.moveTo(x-51,y+6);c.lineTo(x+51,y+6);c.stroke();
      }else if(type==='happy'||type==='wave'||type==='greet'){
        c.lineWidth=37;c.moveTo(x-61,y+35);c.quadraticCurveTo(x,y-75,x+61,y+35);c.stroke();
      }else if(type==='surprised'){
        c.ellipse(x,y,47,66,0,0,Math.PI*2);c.fill();
      }else if(type==='curious'&&i===0){
        c.ellipse(x,y,40,54,0,0,Math.PI*2);c.fill();
      }else if(type==='sad'){
        c.lineWidth=33;c.moveTo(x-50,y-12);c.quadraticCurveTo(x,y+36,x+50,y-12);c.stroke();
      }else{
        c.ellipse(x,y,64,73,0,0,Math.PI*2);c.fill();
      }
    }
    c.beginPath();
    if(type==='surprised'){
      c.ellipse(512+xx*.25,470+yy*.25,27,35,0,0,Math.PI*2);c.fill();
    }else if(type==='sad'){
      c.lineWidth=20;c.arc(512,509,42,Math.PI*1.11,Math.PI*1.89);c.stroke();
    }else if(type==='sleep'||type==='think'){
      c.lineWidth=20;c.moveTo(474,476);c.lineTo(550,476);c.stroke();
    }else{
      // Rounded crescent smile matches the approved face rather than a generic emoticon.
      c.moveTo(423,442);c.quadraticCurveTo(512,462,601,442);
      c.quadraticCurveTo(583,530,512,530);
      c.quadraticCurveTo(441,530,423,442);c.closePath();c.fill();
    }
    c.restore();this.texture.needsUpdate=true;
  }
  update(time,dt){
    dt=clamp(dt,.001,.05);this.time=time;this.idleTime+=dt;
    const s=this.idleTime;
    let type='',u=0,fade=0;
    if(this.active){
      type=this.active.name;u=clamp((time-this.active.start)/this.active.duration,0,1);
      fade=smooth(0,.18,u)*(1-smooth(.78,1,u));
      if(u>=1){this.active=null;this.expression='neutral';this.applyFace();type='';fade=0}
    }
    // Independent low-amplitude breathing: always alive but never twitchy.
    const whole=this.parts.whole;
    const idleY=Math.sin(s*1.5)*.012, idleTilt=Math.sin(s*.82)*.012;
    let bob=idleY,bodyTilt=idleTilt,headTilt=Math.sin(s*.66)*.018;
    let armL=-.13,armR=.13,armForward=0,armLift=0;
    let legs=0;
    if(type==='wave'||type==='greet'){
      const amp=fade;
      const wave=Math.sin(Math.max(0,u-.14)*Math.PI*9)*.20;
      armR=.20+amp*(2.03+wave);
      armL=-.11;headTilt=-.11*amp;bodyTilt=-.036*amp;
      bob+=.028*amp*Math.sin(u*13);armForward=.42*amp;armLift=amp;
    }else if(type==='happy'){
      bob+=Math.abs(Math.sin(u*Math.PI*3))*.12*fade;
      headTilt=.10*fade;bodyTilt=Math.sin(u*14)*.055*fade;
      armR+=.85*fade;armL-=.85*fade;
      legs=Math.sin(u*12)*.10*fade;
    }else if(type==='curious'||type==='think'){
      headTilt=-.17*fade;armR+=.22*fade;bodyTilt=.035*fade;
    }else if(type==='surprised'){
      bob+=.09*fade;armR+=.65*fade;armL-=.65*fade;headTilt=-.045*fade;
    }else if(type==='point'){
      armR= .16+1.52*fade;headTilt=-.09*fade;bodyTilt=-.04*fade;
    }else if(type==='sleep'){
      headTilt=.14*fade;bob-=.035*fade;
    }
    whole.position.y=spring(whole.position.y,bob,6,dt);
    whole.rotation.z=spring(whole.rotation.z,bodyTilt,6,dt);
    const head=this.parts.head;
    this.faceAim.x=spring(this.faceAim.x,this.faceTarget.x,4.3,dt);
    this.faceAim.y=spring(this.faceAim.y,this.faceTarget.y,4.3,dt);
    head.rotation.y=spring(head.rotation.y,this.faceAim.x*.25,4.8,dt);
    head.rotation.x=spring(head.rotation.x,-this.faceAim.y*.14,4.8,dt);
    head.rotation.z=spring(head.rotation.z,headTilt,6,dt);
    this.parts.left.rotation.z=spring(this.parts.left.rotation.z,armL,9,dt);
    this.parts.right.rotation.z=spring(this.parts.right.rotation.z,armR,9,dt);
    this.parts.right.rotation.x=spring(this.parts.right.rotation.x,armForward,8,dt);
    this.parts.right.position.x=spring(this.parts.right.position.x,.615+.17*armLift,8,dt);
    this.parts.right.position.y=spring(this.parts.right.position.y,-.355+.12*armLift,8,dt);
    this.parts.right.position.z=spring(this.parts.right.position.z,.055+.39*armLift,8,dt);
    this.parts.left.rotation.x=spring(this.parts.left.rotation.x,0,8,dt);
    this.parts.legL.rotation.x=spring(this.parts.legL.rotation.x,legs,9,dt);
    this.parts.legR.rotation.x=spring(this.parts.legR.rotation.x,-legs,9,dt);
    whole.scale.y=spring(whole.scale.y,1+(type==='happy'?.025*fade*Math.sin(u*16):.005*Math.sin(s*1.6)),7,dt);
    const prev=this.blink;
    // Two-frame eyelid motion, with natural variable gaps.
    const cycle=s%5.6;
    this.blink=cycle>4.75&&cycle<4.89?1:0;
    if(prev!==this.blink || Math.floor(s*12)!==Math.floor((s-dt)*12))this.applyFace();
  }
}
