
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
  await page.goto('http://127.0.0.1:4173/index-v3-preview.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(6500);
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
await shot('mobile-idle',{width:390,height:844});
await browser.close();
if(failures.length){console.error('VISUAL SMOKE FAIL',JSON.stringify(failures));process.exit(1)}
