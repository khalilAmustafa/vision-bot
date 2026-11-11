// Soft-body mesh for the reference-locked VISION mascot.
// A single implicit surface for torso + arms + feet, with smoothly blended skin weights.
// Head, display and earpads stay rigid as intentional manufactured parts.
import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=(x,a,b)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};
function ellipsoid(x,y,z,cx,cy,cz,rx,ry,rz){
  const X=(x-cx)/rx,Y=(y-cy)/ry,Z=(z-cz)/rz;
  const k0=Math.hypot(X,Y,Z);
  const k1=Math.hypot(X/rx,Y/ry,Z/rz);
  return k1<.00001?-Math.min(rx,ry,rz):k0*(k0-1)/k1;
}
function union(a,b,k){
  const h=clamp(.5+.5*(b-a)/k);
  return b+(a-b)*h-k*h*(1-h);
}
function field(x,y,z){
  // Broad lower torso with narrow upper chest, all soft-surface and reference scale.
  let q=ellipsoid(x,y,z,0,-.672,.006,.648,.486,.497);
  q=union(q,ellipsoid(x,y,z,0,-.337,.0,.448,.285,.42),.19);
  for(const s of [-1,1]){
    // Shoulders are fused under the chest silhouette, not balls glued onto it.
    q=union(q,ellipsoid(x,y,z,s*.574,-.518,.018,.269,.286,.258),.205);
    q=union(q,ellipsoid(x,y,z,s*.768,-.780,.018,.217,.354,.242),.115);
    // Thick feet with the separation between them preserved.
    q=union(q,ellipsoid(x,y,z,s*.294,-1.343,.085,.274,.329,.299),.095);
  }
  return q;
}
function getWeights(x,y,z){
  const right=x>=0, abs=Math.abs(x);
  // Broad continuous transitions around shoulder. The root keeps control of the
  // central torso and shared shoulder skin to avoid tearing or hard joins.
  let arm=smooth(abs,.40,.84)*smooth(-y,.27,.55)*(1-smooth(-y,1.05,1.28))*.97;
  let foot=smooth(-y,1.00,1.43)*smooth(abs,.06,.29)*.94;
  const den=Math.max(1,arm+foot);
  arm/=den;foot/=den;
  const wrist=arm*smooth(-y,.66,1.03)*.48;
  const shoulder=arm-wrist;
  const root=Math.max(0,1-arm-foot);
  // Bone order: 0=root, 1=left shoulder, 2=left wrist,
  // 3=right shoulder, 4=right wrist, 5=left foot, 6=right foot.
  return {
    indices:right?[0,3,4,6]:[0,1,2,5],
    weights:[root,shoulder,wrist,foot]
  };
}
function generate(){
  const nx=48,ny=55,nz=38;
  const min=[-1.29,-1.73,-.735],max=[1.29,.045,.74];
  const step=[(max[0]-min[0])/(nx-1),(max[1]-min[1])/(ny-1),(max[2]-min[2])/(nz-1)];
  const idx=(i,j,k)=>(i*ny+j)*nz+k;
  const scalar=new Float32Array(nx*ny*nz);
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++)
    scalar[idx(i,j,k)]=field(min[0]+i*step[0],min[1]+j*step[1],min[2]+k*step[2]);
  const corners=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const tetras=[[0,5,1,7],[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7]];
  const pts=[],norm=[],indices=[],weights=[];
  const p=new Array(8),v=new Float32Array(8);
  const surfaceNormal=xyz=>{
    const eps=.007;
    const x=xyz[0],y=xyz[1],z=xyz[2];
    const nx=field(x+eps,y,z)-field(x-eps,y,z);
    const ny=field(x,y+eps,z)-field(x,y-eps,z);
    const nz=field(x,y,z+eps)-field(x,y,z-eps);
    const l=Math.hypot(nx,ny,nz)||1;return [nx/l,ny/l,nz/l];
  };
  function emit(a,b,c){
    // Make winding outward according to surface gradient, then supply the same
    // analytic gradient to every triangle vertex for seamless shading.
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),C=new THREE.Vector3(...c);
    const n=surfaceNormal([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3]);
    if(B.clone().sub(A).cross(C.clone().sub(A)).dot(new THREE.Vector3(...n))<0)[b,c]=[c,b];
    for(const point of [a,b,c]){
      pts.push(...point);norm.push(...surfaceNormal(point));
      const skin=getWeights(...point);
      indices.push(...skin.indices);weights.push(...skin.weights);
    }
  }
  function intersect(a,b){
    const va=v[a],vb=v[b],t=va/(va-vb);
    return [
      p[a][0]+(p[b][0]-p[a][0])*t,
      p[a][1]+(p[b][1]-p[a][1])*t,
      p[a][2]+(p[b][2]-p[a][2])*t
    ];
  }
  for(let i=0;i<nx-1;i++)for(let j=0;j<ny-1;j++)for(let k=0;k<nz-1;k++){
    let countInside=0;
    for(let t=0;t<8;t++){
      const [a,b,c]=corners[t];
      p[t]=[min[0]+(i+a)*step[0],min[1]+(j+b)*step[1],min[2]+(k+c)*step[2]];
      v[t]=scalar[idx(i+a,j+b,k+c)];
      if(v[t]<0)countInside++;
    }
    if(!countInside||countInside===8)continue;
    for(const tet of tetras){
      const ins=[],out=[];
      for(const n of tet)(v[n]<0?ins:out).push(n);
      if(ins.length===1){
        emit(intersect(ins[0],out[0]),intersect(ins[0],out[1]),intersect(ins[0],out[2]));
      }else if(ins.length===3){
        emit(intersect(out[0],ins[0]),intersect(out[0],ins[1]),intersect(out[0],ins[2]));
      }else if(ins.length===2){
        const a=intersect(ins[0],out[0]),b=intersect(ins[0],out[1]);
        const c=intersect(ins[1],out[0]),d=intersect(ins[1],out[1]);
        emit(a,b,c);emit(b,d,c);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}
let cachedGeometry;
export function createSoftBody(parent, material){
  if(!cachedGeometry)cachedGeometry=generate();
  const root=new THREE.Bone();root.name='BodyRoot';
  const L=new THREE.Bone();L.name='LeftShoulder';L.position.set(-.615,-.355,.055);root.add(L);
  const LW=new THREE.Bone();LW.name='LeftWrist';LW.position.set(-.12,-.43,.0);L.add(LW);
  const R=new THREE.Bone();R.name='RightShoulder';R.position.set(.615,-.355,.055);root.add(R);
  const RW=new THREE.Bone();RW.name='RightWrist';RW.position.set(.12,-.43,.0);R.add(RW);
  const LF=new THREE.Bone();LF.name='LeftFoot';LF.position.set(-.295,-1.005,.01);root.add(LF);
  const RF=new THREE.Bone();RF.name='RightFoot';RF.position.set(.295,-1.005,.01);root.add(RF);
  const skin=new THREE.SkinnedMesh(cachedGeometry,material);
  skin.name='VISION_Continuous_Skinned_Body';
  skin.frustumCulled=false;
  skin.add(root);parent.add(skin);parent.updateMatrixWorld(true);
  const skeleton=new THREE.Skeleton([root,L,LW,R,RW,LF,RF]);
  skin.bind(skeleton);
  return {skin,body:root,left:L,right:R,leftFlipper:LW,rightFlipper:RW,legL:LF,legR:RF,vertexCount:cachedGeometry.getAttribute('position').count};
}
