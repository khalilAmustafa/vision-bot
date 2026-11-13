import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const EXPRESSIONS=['Neutral','Happy','Sad','Curious','Low Battery','Sleepy','Excited','Surprised','Think'];
const ALIASES={neutral:'Neutral',idle:'Neutral',happy:'Happy',sad:'Sad',curious:'Curious',battery:'Low Battery','low battery':'Low Battery',sleep:'Sleepy',sleepy:'Sleepy',excited:'Excited',surprised:'Surprised',think:'Think',wave:'Happy',greet:'Happy',point:'Curious'};
const BODY={idle:'Idle',wave:'Wave',greet:'Wave',point:'Point',think:'Think',happy:'Happy',curious:'Curious',surprised:'Surprised',sleep:'Sleep'};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>t*t*(3-2*t);

export class VisionMascot {
 constructor(scene,{assetUrl=new URL('../assets/vision.glb',import.meta.url).href}={}) {
  this.scene=scene;this.root=new THREE.Group();scene.add(this.root);
  this.time=0;this.idleTime=0;this.expression='Neutral';this.weights=[1,0,0,0,0,0,0,0,0];this.fromWeights=[...this.weights];this.expressionElapsed=0;this.expressionDuration=0;
  this.faceTarget={x:0,y:0};this.faceAim={x:0,y:0};this.parts={};this.actions={};this.paused=false;this.hologram=false;this.snapshots=[];this.pendingAction=null;this.loaded=false;this.error=null;
  this.ready=this.load(assetUrl).catch(error=>{this.error=error;const speech=document.getElementById('speech');if(speech)speech.textContent='Model could not load. Reload to retry.';throw error;});
 }
 async load(url){
  const g=await new GLTFLoader().loadAsync(url);this.model=g.scene;this.model.position.y=-1.65;this.root.add(this.model);
  this.parts.head=this.model.getObjectByName('Head_Pivot');this.parts.aim=this.model.getObjectByName('Head_Aim');this.parts.right=this.model.getObjectByName('Shoulder_R');this.parts.left=this.model.getObjectByName('Shoulder_L');
  this.parts.upperArm=this.model.getObjectByName('UpperArm_R');this.parts.elbow=this.model.getObjectByName('ElbowB_R');this.parts.hand=this.model.getObjectByName('Hand_R');
  this.parts.body=this.model.getObjectByName('Body_Pivot');this.parts.footL=this.model.getObjectByName('Foot_L');this.parts.footR=this.model.getObjectByName('Foot_R');
  this.mixer=new THREE.AnimationMixer(this.model);this.clips=g.animations;
  this.actions=Object.fromEntries(g.animations.map(c=>[c.name,this.mixer.clipAction(c)]));
  for(const [name,action] of Object.entries(this.actions)){action.setLoop(name==='Idle'?THREE.LoopRepeat:THREE.LoopOnce,name==='Idle'?Infinity:1);action.clampWhenFinished=name!=='Idle';}
  this.mixer.addEventListener('finished',event=>{if(event.action===this.current)this.pendingIdle=true;});
  this.trackNames=[...new Set(g.animations.flatMap(c=>c.tracks.map(t=>t.name)))];
  const face=this.model.getObjectByName('Face_Surface');if(!face)throw new Error('The GLB is missing Face_Surface');
  const atlas=face.material.map||face.material.emissiveMap;if(!atlas)throw new Error('The GLB is missing its embedded expression atlas');
  atlas.flipY=false;atlas.colorSpace=THREE.SRGBColorSpace;atlas.wrapS=atlas.wrapT=THREE.ClampToEdgeWrapping;atlas.needsUpdate=true;this.atlas=atlas;
  this.faceMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{atlas:{value:atlas},weights:{value:this.weights},blink:{value:0},gaze:{value:new THREE.Vector2()},opacity:{value:1}},
   vertexShader:`varying vec2 faceUv; void main(){faceUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform sampler2D atlas; uniform float weights[9];uniform float blink;uniform vec2 gaze;uniform float opacity;varying vec2 faceUv;
    vec4 tile(int index,vec2 uv){float f=float(index);return texture2D(atlas,(clamp(uv,vec2(.002),vec2(.998))+vec2(mod(f,6.),floor(f/6.)))/vec2(6.,3.));}
    void main(){vec2 uv=faceUv-gaze;vec4 sum=vec4(0.);for(int i=0;i<9;i++){if(weights[i]>.0001){vec4 a=tile(i*2,uv);vec4 b=tile(i*2+1,uv);a.rgb*=a.a;b.rgb*=b.a;sum+=mix(a,b,blink)*weights[i];}}
     gl_FragColor=vec4(sum.a>.00001?sum.rgb/sum.a:vec3(0.),sum.a*opacity);
     #include <colorspace_fragment>
    }`});
  face.material.dispose();face.material=this.faceMaterial;face.renderOrder=2;
  this.model.traverse(o=>{if(o.isMesh&&o!==face){o.material=o.material.clone();o.userData.solidMaterial={opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite};}});
  this.makeGrounding();this.loaded=true;this.playAction('Idle',{fade:0});
  if(this.pendingAction){const pending=this.pendingAction;this.pendingAction=null;this.playAction(pending.name,pending.options);}
  this.updateExpression(0);
 }
 makeGrounding(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');const g=c.createRadialGradient(64,64,4,64,64,63);g.addColorStop(0,'rgba(15,18,20,.32)');g.addColorStop(.45,'rgba(15,18,20,.17)');g.addColorStop(1,'rgba(15,18,20,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);const shadow=(x,w,d,opacity)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity}));o.rotation.x=-Math.PI/2;o.position.set(x,-1.648,.015);o.renderOrder=-1;this.root.add(o);};
  shadow(0,2.35,1.45,.3);shadow(-.255,.65,.72,.85);shadow(.255,.65,.72,.85);
 }
 setExpression(name,{duration=.18}={}){
  const canonical=ALIASES[String(name).toLowerCase()]||name;if(!EXPRESSIONS.includes(canonical))throw new RangeError(`Unknown expression: ${name}`);
  this.expression=canonical;this.fromWeights=[...this.weights];this.expressionElapsed=0;this.expressionDuration=Math.max(0,duration);if(!duration){this.weights.fill(0);this.weights[EXPRESSIONS.indexOf(canonical)]=1;}
 }
 updateExpression(dt){
  this.expressionElapsed+=dt;const t=this.expressionDuration?smooth(clamp(this.expressionElapsed/this.expressionDuration,0,1)):1;const index=EXPRESSIONS.indexOf(this.expression);
  for(let i=0;i<this.weights.length;i++)this.weights[i]=THREE.MathUtils.lerp(this.fromWeights[i],i===index?1:0,t);
  if(!this.faceMaterial)return;this.faceMaterial.uniforms.weights.value=this.weights;
  const cycle=this.idleTime%5.7;const blink=this.paused?0:cycle<.09?smooth(cycle/.09):cycle<.22?1-smooth((cycle-.09)/.13):0;
  this.faceMaterial.uniforms.blink.value=blink;this.faceMaterial.uniforms.gaze.value.set(this.faceAim.x*.018,-this.faceAim.y*.012);
 }
 snapshotClip(duration){
  const tracks=[];
  for(const name of this.trackNames){const parsed=THREE.PropertyBinding.parseTrackName(name);const node=this.model.getObjectByName(parsed.nodeName)||this.model.getObjectByProperty('uuid',parsed.nodeName);if(!node)continue;const prop=node[parsed.propertyName];if(!prop?.toArray)continue;const value=prop.toArray();const Type=parsed.propertyName==='quaternion'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;tracks.push(new Type(name,[0,duration+.05],[...value,...value]));}
  return new THREE.AnimationClip(`Transition_${this.time}_${this.snapshots.length}`,duration+.05,tracks);
 }
 playAction(name,{restart=true,fade=.3}={}){
  const canonical=BODY[String(name).toLowerCase()]||name;
  if(!this.loaded){this.pendingAction={name:canonical,options:{restart,fade}};return;}
  const next=this.actions[canonical];if(!next)throw new RangeError(`Missing body clip: ${name}`);
  if(this.current===next&&!restart)return;
  const transition=this.current&&fade>0?this.snapshotClip(fade):null;
  this.mixer.stopAllAction();this.pendingIdle=false;
  for(const s of this.snapshots)this.mixer.uncacheClip(s.clip);this.snapshots=[];
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();this.current=next;this.action=canonical;this.actionElapsed=0;
  if(transition){const holding=this.mixer.clipAction(transition);holding.setLoop(THREE.LoopOnce,1).play().fadeOut(fade);next.fadeIn(fade);this.snapshots.push({clip:transition,elapsed:0,duration:fade+.06,action:holding});}
  this.mixer.update(0);
 }
 trigger(name,now=this.time){this.time=now;this.paused=false;this.setExpression(ALIASES[name]||name);if(BODY[name])this.playAction(BODY[name],{restart:true,fade:.3});}
 setFaceTarget(x,y){this.faceTarget.x=clamp(Number.isFinite(x)?x:0,-1,1);this.faceTarget.y=clamp(Number.isFinite(y)?y:0,-1,1);}
 reset(){this.paused=false;this.setFaceTarget(0,0);this.faceAim={x:0,y:0};this.idleTime=.5;this.setExpression('Neutral');this.playAction('Idle',{restart:true});}
 seek(name,seconds){
  const canonical=BODY[String(name).toLowerCase()]||name;this.paused=true;this.playAction(canonical,{restart:true,fade:0});const duration=this.current.getClip().duration;this.current.time=clamp(seconds,0,duration-.00001);this.mixer.update(0);this.setExpression(ALIASES[String(name).toLowerCase()]||'Neutral',{duration:0});this.faceAim={x:0,y:0};this.parts.aim.rotation.set(0,0,0);this.updateExpression(0);this.model.updateMatrixWorld(true);
 }
 resume(){this.paused=false;}
 status(){
  if(!this.loaded)return {loaded:false,error:this.error?.message};this.model.updateMatrixWorld(true);
  const pos=o=>o.getWorldPosition(new THREE.Vector3()).toArray();
  return {loaded:true,clip:this.action,time:this.current.time,expression:this.expression,weights:[...this.weights],rightArm:this.parts.right.rotation.z,headTilt:this.parts.head.rotation.z,shoulder:this.parts.right.position.toArray(),upperArm:this.parts.upperArm.quaternion.toArray(),wrist:this.parts.hand.quaternion.toArray(),handWorld:pos(this.parts.hand),headAim:this.parts.aim.rotation.toArray().slice(0,3),feet:{left:pos(this.parts.footL),right:pos(this.parts.footR)},paused:this.paused};
 }
 setHologram(on){this.hologram=on;this.model?.traverse(o=>{if(o.isMesh&&o.material!==this.faceMaterial){o.material.transparent=on||o.userData.solidMaterial.transparent;o.material.opacity=on?.65:o.userData.solidMaterial.opacity;o.material.depthWrite=on?false:o.userData.solidMaterial.depthWrite;o.material.needsUpdate=true;}});}
 update(time,dt){
  this.time=time;if(!this.loaded)return;dt=clamp(dt,0,.1);
  if(!this.paused){this.idleTime+=dt;this.actionElapsed+=dt;this.mixer.update(dt);
   for(const s of this.snapshots){s.elapsed+=dt;if(s.elapsed>=s.duration){s.action.stop();this.mixer.uncacheClip(s.clip);}}this.snapshots=this.snapshots.filter(s=>s.elapsed<s.duration);
   if(this.pendingIdle){this.pendingIdle=false;this.playAction('Idle',{fade:.3});}
   const k=1-Math.exp(-dt*5);this.faceAim.x+=(this.faceTarget.x-this.faceAim.x)*k;this.faceAim.y+=(this.faceTarget.y-this.faceAim.y)*k;
   this.parts.aim.rotation.y=this.faceAim.x*.14;this.parts.aim.rotation.x=-this.faceAim.y*.07;
  }
  this.updateExpression(this.paused?0:dt);
 }
 dispose(){this.mixer?.stopAllAction();const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();this.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of o.material?[].concat(o.material):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});if(this.atlas)textures.add(this.atlas);for(const x of [...geometries,...materials,...textures,...skeletons])x.dispose();this.scene.remove(this.root);}
}
