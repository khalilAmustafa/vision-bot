
const MODEL_BASE='https://storage.googleapis.com/mediapipe-models';
const WASM_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';

export class MascotVision {
  constructor({onFace,onGreeting,onGesture,onStatus}){
    this.cb={onFace,onGreeting,onGesture,onStatus};
    this.video=null;this.stream=null;this.detector=null;this.gesture=null;this.timer=null;
    this.lastFace=0;this.visible=false;this.lastGesture='';this.confirmations=0;this.cooldown=0;
    this.running=false;this.busy=false;
  }
  status(s){this.cb.onStatus?.(s)}
  async start(video){
    if(this.running)return;
    this.video=video;this.status('Requesting camera permission…');
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({
        audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}}
      });
      video.srcObject=this.stream;
      await video.play();
      this.status('Loading vision models…');
      const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');
      const files=await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      this.detector=await vision.FaceDetector.createFromOptions(files,{
        baseOptions:{modelAssetPath:MODEL_BASE+'/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',delegate:'CPU'},
        runningMode:'VIDEO',minDetectionConfidence:.55
      });
      this.gesture=await vision.GestureRecognizer.createFromOptions(files,{
        baseOptions:{modelAssetPath:MODEL_BASE+'/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',delegate:'CPU'},
        runningMode:'VIDEO',numHands:1
      });
      this.running=true;this.status('Camera live • show your hand');
      this.timer=setInterval(()=>this.tick(),165);
    }catch(err){
      this.stop();
      this.status('Camera unavailable: '+(err?.message||String(err)));
      throw err;
    }
  }
  tick(){
    const v=this.video;
    if(!this.running||this.busy||!v||v.readyState<2||v.videoWidth===0)return;
    this.busy=true;
    try{
      const now=performance.now();
      const det=this.detector.detectForVideo(v,now).detections;
      const face=det?.[0]?.boundingBox;
      if(face){
        const cx=(face.originX+face.width/2)/v.videoWidth;
        const cy=(face.originY+face.height/2)/v.videoHeight;
        this.cb.onFace?.((.5-cx)*2,(.5-cy)*2);
        if(!this.visible){this.visible=true;this.cb.onGreeting?.()}
        this.lastFace=now;
      }else if(this.visible&&now-this.lastFace>1700){
        this.visible=false;this.cb.onFace?.(0,0);
      }
      const result=this.gesture.recognizeForVideo(v,now).gestures?.[0]?.[0];
      const name=result?.score>.71?result.categoryName:'';
      this.confirmations=name&&name===this.lastGesture?this.confirmations+1:1;
      this.lastGesture=name;
      const allowed={Open_Palm:'wave',Thumb_Up:'happy',Victory:'happy'};
      if(allowed[name]&&this.confirmations>=3&&now-this.cooldown>3300){
        this.cooldown=now;
        this.cb.onGesture?.(allowed[name],name);
      }
    }catch(err){
      this.status('Vision processing issue: '+(err?.message||err));
    }finally{this.busy=false}
  }
  stop(){
    if(this.timer)clearInterval(this.timer);this.timer=null;
    this.running=false;this.visible=false;
    if(this.stream)this.stream.getTracks().forEach(t=>t.stop());
    this.stream=null;
    if(this.video){this.video.pause();this.video.srcObject=null}
    try{this.detector?.close()}catch{}
    try{this.gesture?.close()}catch{}
    this.detector=null;this.gesture=null;
    this.cb.onFace?.(0,0);
  }
}
