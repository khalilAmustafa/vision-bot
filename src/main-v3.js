
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VisionMascot} from './mascot-v3.js';
import {MascotVision} from './cv-v3.js';

const $=id=>document.getElementById(id);
const host=$('canvas-host'),scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(37,1,.05,100);
camera.position.set(2.6,.66,5.7);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
renderer.setClearColor(0xffffff,0);
host.appendChild(renderer.domElement);
renderer.domElement.style.width='100%';
renderer.domElement.style.height='100%';
renderer.domElement.style.display='block';

const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,.04,0);
controls.enableDamping=true;
controls.dampingFactor=.065;
controls.enablePan=false;
controls.minDistance=3.5;
controls.maxDistance=9;
controls.maxPolarAngle=Math.PI*.75;
controls.update();

scene.add(new THREE.HemisphereLight('#ffffff','#717985',2.5));
const key=new THREE.DirectionalLight('#fff5e7',3.2);key.position.set(-3.4,5.5,7);scene.add(key);
const fill=new THREE.DirectionalLight('#dce3ec',1.5);fill.position.set(5,3,2);scene.add(fill);
const rim=new THREE.DirectionalLight('#e9fff0',3.1);rim.position.set(2.5,4,-4);scene.add(rim);
const low=new THREE.DirectionalLight('#c9d9d1',.9);low.position.set(-4,-1,-5);scene.add(low);

const bot=new VisionMascot(scene);
let cameraTarget=null;
const views={
 front:[0,.15,6.15],
 three:[2.6,.66,5.7],
 side:[6.1,.2,0],
 back:[0,.15,-6.15]
};
function selectView(view){
  cameraTarget=new THREE.Vector3(...views[view]);
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
}
controls.addEventListener('start',()=>{cameraTarget=null;document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('selected'))});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
const speech={
 wave:'Hi there! Nice to meet you.',
 greet:'Hey! Welcome to VISION.',
 happy:'That made my day!',
 curious:'Hmm… what have we got here?',
 surprised:'Whoa! That surprised me.',
 point:'Come check out VISION Club!',
 sleep:'Just recharging my ideas…',
 idle:'Hey! Welcome to VISION.'
};
function trigger(name){
  bot.trigger(name,performance.now()/1000);
  $('speech').textContent=speech[name]||speech.idle;
}
document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>trigger(b.dataset.motion)));
$('reset-btn').addEventListener('click',()=>{bot.reset();$('speech').textContent=speech.idle;selectView('three')});
$('solid-btn').addEventListener('click',()=>{
  bot.setHologram(false);$('solid-btn').classList.add('selected');$('holo-btn').classList.remove('selected')
});
$('holo-btn').addEventListener('click',()=>{
  bot.setHologram(true);$('holo-btn').classList.add('selected');$('solid-btn').classList.remove('selected')
});

let vision=null;
const status=$('camera-status');
$('camera-btn').addEventListener('click',async()=>{
  if(vision?.running){
    vision.stop();vision=null;$('camera-btn').textContent='Enable camera & gestures';
    $('camera-preview').classList.remove('on');status.textContent='Off — manual animations work without camera access.';
    status.classList.remove('on');return;
  }
  const b=$('camera-btn');b.disabled=true;
  vision=new MascotVision({
    onFace:(x,y)=>bot.setFaceTarget(x,y),
    onGreeting:()=>trigger('greet'),
    onGesture:(action)=>trigger(action),
    onStatus:text=>{status.textContent=text;status.classList.toggle('on',text.includes('Camera live'))}
  });
  try{
    await vision.start($('camera-preview'));
    $('camera-preview').classList.add('on');
    b.textContent='Disable camera';
  }catch(e){
    $('camera-preview').classList.remove('on');
    vision=null;b.textContent='Enable camera & gestures';
  }finally{b.disabled=false}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&vision?.running){
    vision.stop();vision=null;
    $('camera-preview').classList.remove('on');
    $('camera-btn').textContent='Enable camera & gestures';
    status.textContent='Paused because the tab was hidden.';
    status.classList.remove('on')
  }
});
let booth=false;
function setBooth(v){
  booth=v;document.body.classList.toggle('booth',v);
  $('booth-btn').textContent=v?'Exit booth':'Booth mode';
  requestAnimationFrame(resize);
}
$('booth-btn').addEventListener('click',async()=>{
  setBooth(!booth);
  if(booth){try{await document.documentElement.requestFullscreen()}catch{}}
  else if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&booth)setBooth(false);
  const map={'1':'wave','2':'happy','3':'curious','4':'surprised','5':'point','6':'sleep'};
  if(map[e.key]&&!(e.target instanceof HTMLInputElement))trigger(map[e.key]);
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&booth)setBooth(false)});
const observer=new ResizeObserver(resize);
observer.observe(host);
function resize(){
  const w=host.clientWidth,h=host.clientHeight;
  if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
resize();
let prev=performance.now(),start=performance.now(),introDone=false;
function animate(now){
  requestAnimationFrame(animate);
  const delta=Math.min((now-prev)/1000,.05);prev=now;
  if(!introDone&&now-start>1700){introDone=true;trigger('greet')}
  if(cameraTarget){
    camera.position.lerp(cameraTarget,1-Math.exp(-delta*4.2));
    if(camera.position.distanceTo(cameraTarget)<.009)cameraTarget=null;
  }
  bot.update(now/1000,delta);
  controls.update();
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
