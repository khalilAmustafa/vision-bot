
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
fs.mkdirSync('review-artifacts',{recursive:true});
let failures=[];
async function shot(name,viewport,steps=[]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGE '+String(e)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text())});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__VISION_BOT__?.loaded);
  for(const step of steps){await page.locator(step).click();await page.waitForTimeout(1100)}
  await page.screenshot({path:'review-artifacts/'+name+'.png',fullPage:true});
  const canvas=await page.locator('#canvas-host canvas').count();
  const speech=await page.locator('#speech').innerText();
  console.log(name,JSON.stringify({canvas,speech,errors}));
  if(!canvas||errors.length)failures.push({name,errors,canvas});
  await page.close();
}
await shot('desktop-idle',{width:1440,height:950});
await shot('desktop-wave',{width:1440,height:950},['[data-motion=wave]']);
await shot('desktop-side',{width:1440,height:950},['[data-view=side]']);
await shot('desktop-front',{width:1440,height:950},['[data-view=front]']);
await shot('desktop-back',{width:1440,height:950},['[data-view=back]']);
await shot('mobile-idle',{width:390,height:844});
// Sample actual WebGL keyposes through the full four-second wave, not a single still.
const seq=await browser.newPage({viewport:{width:1040,height:850},deviceScaleFactor:1});
const seqErrors=[];
seq.on('pageerror',e=>seqErrors.push(String(e)));
await seq.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
await seq.waitForFunction(()=>window.__VISION_BOT__?.loaded);
const times=[.08,.3,.58,.83,1.12,1.42,1.7,2.05,2.45,2.85,3.2,3.58];
const arms=[];
for(let i=0;i<times.length;i++){
  const time=times[i];
  await seq.evaluate(seconds=>window.__VISION_MOTION_REVIEW__.pose('wave',seconds),time);
  await seq.waitForTimeout(420);
  const pose=await seq.evaluate(()=>window.__VISION_MOTION_REVIEW__.status());
  arms.push({time,headTilt:pose.headTilt,upper:pose.upperArm,wrist:pose.wrist,shoulder:pose.shoulder});
  await seq.locator('#stage').screenshot({path:'review-artifacts/wave-'+String(i).padStart(2,'0')+'.png'});
}
console.log('WAVE-KEYFRAMES',JSON.stringify(arms));
const greeting=arms.filter(p=>p.time>=1.42&&p.time<=2.45);
if(greeting.some(p=>p.headTilt<.045))failures.push({name:'head-tilt',arms});
if(arms.some(p=>p.shoulder.some((v,i)=>Math.abs(v-arms[0].shoulder[i])>1e-5)))failures.push({name:'shoulder-drift',arms});
if(!greeting.some(p=>p.wrist.some((v,i)=>Math.abs(v-greeting[0].wrist[i])>.04)))failures.push({name:'missing-wrist-motion',arms});
if(seqErrors.length)failures.push({name:'wave-sequence-errors',errors:seqErrors});
await seq.close();
await browser.close();
if(failures.length){console.error('VISUAL SMOKE FAIL',JSON.stringify(failures));process.exit(1)}
