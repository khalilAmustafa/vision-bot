import * as THREE from 'three';

const N=28,R=16,EPS=.0001;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
const lerp=(a,b,t)=>a+(b-a)*t;

function point(t,p0,p1,p2,p3,into){
  const u=1-t;return into.set(
    u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,
    u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y,
    u*u*u*p0.z+3*u*u*t*p1.z+3*u*t*t*p2.z+t*t*t*p3.z
  );
}
function tangent(t,p0,p1,p2,p3,into){
  const u=1-t;
  return into.set(
    3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x),
    3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y),
    3*u*u*(p1.z-p0.z)+6*u*t*(p2.z-p1.z)+3*t*t*(p3.z-p2.z)
  ).normalize();
}

// One capsule-like arm surface. The root sits INSIDE the torso (no visible
// ball joint). The visible part curves without scaling into a giant flipper.
export function createCurvedArm(parent,material,sign){
  const positions=new Float32Array((N+1)*R*3);
  const triangles=[];
  for(let i=0;i<N;i++)for(let j=0;j<R;j++){
    const a=i*R+j,b=i*R+(j+1)%R,c=(i+1)*R+j,d=(i+1)*R+(j+1)%R;
    triangles.push(a,b,c,b,d,c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(triangles);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=sign===1?'VISION_Right_Continuous_Arm':'VISION_Left_Continuous_Arm';
  mesh.frustumCulled=false;
  parent.add(mesh);

  const p0=new THREE.Vector3(),p1=new THREE.Vector3(),p2=new THREE.Vector3(),p3=new THREE.Vector3();
  const center=new THREE.Vector3(),direction=new THREE.Vector3();
  const A=new THREE.Vector3(),B=new THREE.Vector3();
  const alongZ=new THREE.Vector3(0,0,1),alongX=new THREE.Vector3(1,0,0);
  function update(lift,wave=0,front=0,shoulder={x:0,y:0,z:0}){
    lift=ease(clamp(lift));
    // Planned against the approved front/side/wave poses.
    // At idle, arm hangs alongside torso. During wave it steps OUT before UP.
    const sx=shoulder.x||0,sy=shoulder.y||0,sz=shoulder.z||0;
    p0.set(sign*.43+sx,-.28+sy,.055+sz);
    p1.set(sign*lerp(.57,.81,lift)+sx,lerp(-.405,-.36,lift)+sy,lerp(.125,.20,lift)+sz);
    p2.set(sign*lerp(.745,1.065,lift)+sx,lerp(-.66,-.27,lift)+sy,lerp(.16,.28,lift)+sz);
    p3.set(sign*(lerp(.775,1.21,lift)+.026*wave*lift)+sx,
      lerp(-.84,.115,lift)+.028*wave*lift+sy,
      lerp(.155,.31,lift)+.07*front+sz);

    for(let i=0;i<=N;i++){
      const t=i/N;
      point(t,p0,p1,p2,p3,center);
      tangent(t,p0,p1,p2,p3,direction);
      A.crossVectors(direction,alongZ);
      if(A.lengthSq()<EPS)A.crossVectors(direction,alongX);
      A.normalize();B.crossVectors(direction,A).normalize();
      // Broad pill body with full rounded end rather than a thin antenna.
      const cap=t>.76?Math.sqrt(Math.max(0,1-Math.pow((t-.76)/.24,2))):1;
      const rootBlend=lerp(.148,.205,ease(Math.min(1,t/.42)));
      const radius=Math.max(.0018,rootBlend*cap);
      const base=i*R*3;
      for(let j=0;j<R;j++){
        const theta=j/R*Math.PI*2;
        const ca=Math.cos(theta),sa=Math.sin(theta);
        const k=base+j*3;
        positions[k]=center.x+radius*(A.x*ca+B.x*sa*.96);
        positions[k+1]=center.y+radius*(A.y*ca+B.y*sa*.96);
        positions[k+2]=center.z+radius*(A.z*ca+B.z*sa*.96);
      }
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.computeVertexNormals();
  }
  update(0);
  return {mesh,update,geometry};
}
