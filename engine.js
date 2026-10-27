import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const TL=window.TL, ENV=window.ENV, FPS=24;
const Q=new URLSearchParams(location.search);
const W=+(Q.get('w')||1280), H=Math.round(W*9/16), K=W/1280;
let seed=11;const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ss=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u)};
const seg=(a,b,x)=>clamp((x-a)/(b-a));
const lerp=(a,b,u)=>a+(b-a)*u;
const ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const eo=u=>1-Math.pow(1-u,3);
const L3=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];
function envAt(name,t,sm=2){const a=ENV[name];if(!a)return 0;const f=Math.floor(t*FPS);let s=0,n=0;for(let i=f-sm;i<=f;i++){if(i>=0&&i<a.length){s+=a[i];n++}}return n?s/n:0}
const BEAT=TL.BEAT;
const THEME=[[[69,1,'ko'],[74,.5,'e'],[76,.5,'wo'],[77,1,'ka'],[76,.5,'shi'],[74,.5,'te']],[[74,1.5,'a'],[72,.5,'na'],[74,1,'ta'],[77,1,'no']],
 [[72,1,'u'],[69,.5,'ta'],[72,.5,'ni'],[77,1.5,'na'],[76,.5,'ru']],[[76,3,'yo'],[null,1]],[[69,1,'wa'],[74,.5,'su'],[76,.5,'re'],[77,1,'na'],[79,.5,'i'],[81,.5,'de']],
 [[81,1.5,'me'],[79,.5,'ro'],[77,1,'di'],[74,1,'i']],[[76,1,'zu'],[79,1,'tto'],[77,.5,'ko'],[76,.5,'ko'],[72,1,'ni']],[[76,1,'i'],[74,3,'ru']]];
function themeNotes(bars){const out=[];bars.forEach((bi,k)=>{let b=k*4;for(const [m,d,s] of THEME[bi]){if(m!=null)out.push({b,d,m,s,bar:bi});b+=d}});return out}
const SONG=themeNotes([0,1,2,3]);
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const glc=renderer.domElement;
const out=document.createElement('canvas');out.width=W;out.height=H;document.body.appendChild(out);const ctx=out.getContext('2d');
const scene=new THREE.Scene();scene.background=new THREE.Color(0,0,0);
const camera=new THREE.PerspectiveCamera(40,W/H,0.02,4000);
const composer=new EffectComposer(renderer);composer.setPixelRatio(1);composer.setSize(W,H);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(W,H),1.0,0.55,0.55);composer.addPass(bloom);
const GradeShader={uniforms:{tDiffuse:{value:null},uExp:{value:1},uSat:{value:1},uTint:{value:new THREE.Vector3(1,1,1)},uVig:{value:0.35},uGrain:{value:0.04},uTime:{value:0},uCA:{value:0.002},uGlitch:{value:0},uFlash:{value:0},uLift:{value:new THREE.Vector3(0,0,0)}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uExp,uSat,uVig,uGrain,uTime,uCA,uGlitch,uFlash;uniform vec3 uTint,uLift;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 uv=vUv;
  if(uGlitch>0.){float row=floor(uv.y*36.)+floor(uTime*15.)*7.;float g=step(0.62,h(vec2(row,1.)));uv.x+=(h(vec2(row,2.))-.5)*0.09*uGlitch*g;
   float blk=step(0.93,h(floor(uv*vec2(12.,8.))+floor(uTime*10.)));uv+=blk*uGlitch*(vec2(h(uv.yx+3.),h(uv+5.))-.5)*0.04;}
  vec2 d=uv-.5;float ca=uCA+uGlitch*0.012;
  vec3 c=vec3(texture2D(tDiffuse,uv+d*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-d*ca).b);
  c*=uExp;c=c*uTint+uLift;float l=dot(c,vec3(.2126,.7152,.0722));c=max(mix(vec3(l),c,uSat),0.);
  c*=1.-uVig*smoothstep(0.25,0.95,length(d*vec2(1.25,1.)));
  float gr=h(uv*vec2(1297.,731.)+fract(uTime*7.13))-.5;c+=gr*uGrain*(0.25+sqrt(l+0.001)*0.75);
  c=mix(c,vec3(3.),uFlash);
  gl_FragColor=vec4(max(c,0.),1.);}`};
const grade=new ShaderPass(GradeShader);composer.addPass(grade);composer.addPass(new OutputPass());
const G=grade.uniforms;
const ptFrag=`varying vec3 vCol;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float r=dot(c,c)*4.;if(r>1.)discard;float a=exp(-r*3.5)*vA;gl_FragColor=vec4(vCol*a,1.);}`;
const add=(m)=>{m.blending=THREE.AdditiveBlending;m.depthWrite=false;m.transparent=true;return m};
function geoFrom(attrs){const g=new THREE.BufferGeometry();for(const k in attrs){const [arr,n]=attrs[k];g.setAttribute(k,new THREE.BufferAttribute(new Float32Array(arr),n))}return g}
const PX={value:1};
const HASH=`float hh(float n){return fract(sin(n)*43758.5453);}`;
function genGirl(){
 const P=[],C=[],S=[];
 const pushp=(x,y,z,c,sw=0)=>{P.push(x,y,z);C.push(c[0],c[1],c[2]);S.push(sw)};
 const HAIR=[0.18,1.05,0.95],HAIR2=[0.1,0.75,0.75],SKIN=[0.55,0.45,0.42],SHIRT=[0.42,0.47,0.5],DARK=[0.1,0.13,0.16],TEAL=[0.15,1.2,1.05],PINK=[1.4,0.25,0.6],EYE=[0.3,1.6,1.4];
 const mixc=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];
 const sph=(cx,cy,cz,r,n,col,filt,sw=0)=>{let k=0;while(k<n){const u=R()*2-1,a=R()*Math.PI*2,s=Math.sqrt(1-u*u);const x=s*Math.cos(a),y=u,z=s*Math.sin(a);if(filt&&!filt(x,y,z))continue;const rr=r*(0.96+R()*0.05);pushp(cx+x*rr,cy+y*rr,cz+z*rr,typeof col==='function'?col(x,y,z):col,sw);k++}};
 const tube=(f,rad,n,col,sw=()=>0,flat=[1,1])=>{for(let k=0;k<n;k++){const s=R();const p=f(s),q=f(Math.min(1,s+0.01)),pm=f(Math.max(0,s-0.01));const t=[q[0]-pm[0],q[1]-pm[1],q[2]-pm[2]];const tl=Math.hypot(...t)||1;t[0]/=tl;t[1]/=tl;t[2]/=tl;
  let a=[0,0,1];if(Math.abs(t[2])>0.9)a=[1,0,0];let n1=[t[1]*a[2]-t[2]*a[1],t[2]*a[0]-t[0]*a[2],t[0]*a[1]-t[1]*a[0]];const l1=Math.hypot(...n1);n1=n1.map(v=>v/l1);const n2=[t[1]*n1[2]-t[2]*n1[1],t[2]*n1[0]-t[0]*n1[2],t[0]*n1[1]-t[1]*n1[0]];
  const ang=R()*Math.PI*2,r=rad(s)*(0.92+R()*0.1),ca=Math.cos(ang)*r*flat[0],sa=Math.sin(ang)*r*flat[1];
  pushp(p[0]+n1[0]*ca+n2[0]*sa,p[1]+n1[1]*ca+n2[1]*sa,p[2]+n1[2]*ca+n2[2]*sa,typeof col==='function'?col(s,ang):col,sw(s))}};
 const ell=(y0,y1,rx,rz,n,col,cz=0)=>{for(let k=0;k<n;k++){const s=R(),a=R()*Math.PI*2;const y=lerp(y0,y1,s);pushp(Math.cos(a)*rx(s,a),y,cz+Math.sin(a)*rz(s,a),typeof col==='function'?col(s,a):col)}};
 for(const sg of [-1,1]){
  const f=s=>[sg*(0.12+0.34*Math.pow(s,0.55)-0.06*s*s),1.53-1.36*s+0.05*Math.sin(s*3),-0.07-0.09*Math.sin(s*2.6)];
  tube(f,s=>0.06*(1-s*0.7)+0.012,15000,s=>mixc(HAIR,HAIR2,s*0.6+R()*0.2),s=>Math.pow(s,1.4),[1.6,0.55]);
  tube(f,s=>0.03*(1-s*0.5),2500,s=>mixc(HAIR,[0.5,1.6,1.4],0.6),s=>Math.pow(s,1.4),[1,1]);
  sph(sg*0.125,1.535,-0.06,0.03,500,PINK);
 }
 sph(0,1.465,-0.008,0.134,9000,HAIR,(x,y,z)=>(y>0.35)||z<0.1);
 for(let k=0;k<14;k++){const x0=-0.11+k*0.017+R()*0.004;tube(s=>[x0*(1-0.1*s),1.56-0.16*s,0.11+0.035*Math.sin(s*Math.PI*0.5)],s=>0.014*(1-s*0.7),260,HAIR)}
 for(const sg of [-1,1])tube(s=>[sg*(0.118+0.005*s),1.5-0.17*s,0.03],s=>0.018*(1-0.6*s),500,HAIR,()=>0.2);
 sph(0,1.445,0.012,0.116,3500,SKIN,(x,y,z)=>z>0.15&&y<0.55);
 for(const sg of [-1,1]){for(let k=0;k<160;k++){const a=R()*6.283,r=Math.sqrt(R())*0.016;pushp(sg*0.042+Math.cos(a)*r*0.8,1.442+Math.sin(a)*r*1.25,0.112,EYE)}}
 ell(1.3,1.37,()=>0.034,()=>0.032,500,SKIN);
 ell(0.97,1.31,(s)=>lerp(0.098,0.14,Math.pow(s,1.6)),(s)=>lerp(0.07,0.085,s),6000,(s,a)=>Math.sin(a)>0.6&&s>0.25?mixc(SHIRT,[0.6,0.66,0.7],0.5):SHIRT);
 for(let k=0;k<900;k++){const s=R(),y=lerp(1.29,1.06,s),w=0.022*(1-s*0.5);pushp((R()-.5)*2*w,y,0.088+0.005*s,TEAL)}
 for(const sg of [-1,1]){sph(sg*0.152,1.275,0,0.045,500,SHIRT,(x,y)=>y>-0.2);
  tube(s=>[sg*lerp(0.16,0.235,s),lerp(1.27,0.92,s),lerp(0,0.035,s)],s=>0.027,1100,SKIN,()=>0);
  tube(s=>[sg*lerp(0.2,0.245,s),lerp(1.12,0.9,s),lerp(0.02,0.04,s)],s=>lerp(0.04,0.072,s),2600,s=>s>0.88?TEAL:DARK);
  sph(sg*0.245,0.875,0.04,0.025,250,SKIN);
  tube(s=>[sg*lerp(0.07,0.06,s),lerp(0.8,0.06,s),0.005],s=>lerp(0.045,0.032,s),2600,s=>s>0.48?(s<0.53?TEAL:DARK):SKIN);
 }
 ell(0.77,0.98,(s,a)=>lerp(0.23,0.115,s)+Math.abs(Math.sin(a*11))*0.014*(1-s),(s,a)=>lerp(0.2,0.08,s)+Math.abs(Math.sin(a*11))*0.012*(1-s),6500,(s)=>s<0.07?TEAL:mixc(DARK,SHIRT,0.35));
 for(const sg of [-1,1])sph(sg*0.132,1.44,0,0.03,350,[0.2,0.25,0.3]);
 const n=P.length/3,St=[],Rn=[];
 for(let i=0;i<n;i++){const r=2+R()*4.5,a=R()*6.283,u=R()*2-1;St.push(Math.cos(a)*r*Math.sqrt(1-u*u),1+u*r*0.5,Math.sin(a)*r*Math.sqrt(1-u*u));Rn.push(R(),R(),R(),S[i])}
 return geoFrom({position:[P,3],aCol:[C,3],aStart:[St,3],aRnd:[Rn,4]});
}
const girlU={uTime:{value:0},uForm:{value:1},uScatter:{value:0},uFall:{value:0},uGlitch:{value:0},uAlpha:{value:1},uBright:{value:1},uSway:{value:1},uSize:{value:0.0042},uScale:{value:1},uPx:PX,uStartS:{value:1},uBurst:{value:0}};
const girl=new THREE.Points(genGirl(),add(new THREE.ShaderMaterial({uniforms:girlU,fragmentShader:ptFrag,vertexShader:`
attribute vec3 aStart;attribute vec4 aRnd;attribute vec3 aCol;
uniform float uTime,uForm,uScatter,uFall,uGlitch,uAlpha,uBright,uSway,uSize,uScale,uPx,uStartS,uBurst;varying vec3 vCol;varying float vA;${HASH}
void main(){vec3 tg=position;float sw=aRnd.w*uSway;
 tg.x+=(sin(uTime*1.25+tg.y*2.4+aRnd.z*0.5)*0.04+sin(uTime*0.63)*0.03)*sw;tg.z+=cos(uTime*1.05+tg.y*1.9)*0.035*sw;
 float d=clamp(uForm*1.75-aRnd.x*0.75,0.,1.);d=d*d*(3.-2.*d);
 float ang=uTime*(0.25+aRnd.y*0.35)+aRnd.z*6.283;vec3 st=aStart*uStartS;st.xz=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*st.xz;st.y+=sin(uTime*0.5+aRnd.x*20.)*0.25*uStartS;
 vec3 p=mix(st,tg,d);float sp=(1.-d)*d*4.;p.x+=sin(aRnd.z*30.+uTime*2.)*0.18*sp;p.z+=cos(aRnd.z*30.+uTime*2.)*0.18*sp;
 p+=0.0022*vec3(sin(uTime*3.+aRnd.y*50.),sin(uTime*2.7+aRnd.z*50.),sin(uTime*3.3+aRnd.x*50.));
 vec3 dir=normalize(vec3(aRnd.y-.5,aRnd.z*.6+.15,aRnd.x-.5));float sc=uScatter*(0.3+aRnd.y);
 p+=dir*sc*1.1;p.y+=sc*sc*aRnd.z*0.9;p.x+=sin(p.y*3.+uTime*0.6+aRnd.x*9.)*sc*0.25;
 vec3 bd=normalize(p-vec3(0.,1.1,0.)+vec3(aRnd.x-.5,aRnd.y-.5,aRnd.z-.5)*0.6);p+=bd*uBurst*(0.4+aRnd.z*1.6)+vec3(0.,uBurst*uBurst*aRnd.x*0.3,0.);
 float fl=clamp(uFall*(0.6+aRnd.x*0.8)-aRnd.y*0.2,0.,1.);fl=fl*fl;p.y=mix(p.y,0.005+aRnd.y*0.03,fl);p.xz+=(vec2(aRnd.y,aRnd.z)-.5)*fl*1.2;
 if(uGlitch>0.){float sl=floor(p.y*16.)+floor(uTime*13.)*3.;float g=step(0.5,hh(sl));p.x+=(hh(sl+3.1)-.5)*0.4*uGlitch*g;p.z+=(hh(sl+7.)-.5)*0.25*uGlitch*g;}
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float ps=uSize*uScale*(0.55+aRnd.y*0.9)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.3,22.);
 vCol=aCol*uBright*(1.+0.8*sp+uBurst*0.3);vA=0.32*uAlpha*min(1.,ps/1.3)*min(1.,64./(ps*ps+1.)+0.15)*(0.45+0.55*d)*(1.-clamp(sc*0.18,0.,0.85));}`})));
girl.frustumCulled=false;scene.add(girl);
const rings=[];for(let k=0;k<6;k++){const m=new THREE.Mesh(new THREE.RingGeometry(0.93,1,96),add(new THREE.MeshBasicMaterial({color:new THREE.Color(0.3,1.3,1.2),side:THREE.DoubleSide,opacity:0})));scene.add(m);rings.push(m)}
const floorU={uTime:{value:0},uR:{value:6},uGlow:{value:1},uGrid:{value:1},uRip:{value:0},uRipT:{value:0},uCol:{value:new THREE.Vector3(0.15,0.9,0.85)}};
const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80).rotateX(-Math.PI/2),add(new THREE.ShaderMaterial({uniforms:floorU,vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uTime,uR,uGlow,uGrid,uRip,uRipT;uniform vec3 uCol;varying vec3 vP;void main(){float r=length(vP.xz);vec2 g=abs(fract(vP.xz*2.)-.5);vec2 fw=fwidth(vP.xz*2.);
 float line=max(1.-smoothstep(0.,fw.x*1.2,g.x),1.-smoothstep(0.,fw.y*1.2,g.y));float fade=exp(-r*r/(uR*uR));
 float glow=exp(-r*r*3.)*uGlow;float rr=uRipT*3.5;float rip=uRip*exp(-pow((r-rr)*6.,2.))*exp(-uRipT*1.2);
 float circ=(1.-smoothstep(0.,0.015,abs(r-0.5)))*0.4+(1.-smoothstep(0.,0.01,abs(r-1.2)))*0.25;
 vec3 c=uCol*(line*0.12*uGrid*fade+glow*0.35+rip*0.8+circ*uGlow*fade);gl_FragColor=vec4(c,1.);}`})));
scene.add(floor);
const skyU={uTop:{value:new THREE.Vector3(0,0,0)},uHor:{value:new THREE.Vector3(0,0,0)},uStars:{value:0},uTime:{value:0},uAur:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,
 vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
 fragmentShader:`uniform vec3 uTop,uHor;uniform float uStars,uTime,uAur;varying vec3 vD;void main(){vec3 d=normalize(vD);float y=d.y;
 vec3 c=mix(uHor,uTop,pow(clamp(y,0.,1.),0.45));if(y<0.)c=uHor*0.6;
 vec3 q=d*220.;vec3 id=floor(q);float s=fract(sin(dot(id,vec3(12.9898,78.233,37.719)))*43758.5453);vec3 f=fract(q)-.5;
 float st=step(0.982,s)*smoothstep(0.3,0.,length(f))*uStars*smoothstep(0.02,0.25,y);c+=vec3(0.8,0.9,1.)*st*(0.5+0.5*sin(uTime*1.7+s*90.))*2.;
 float a=0.;for(int i=0;i<3;i++){float fi=float(i);float yy=0.2+0.07*fi+0.05*sin(d.x*2.6+uTime*0.15+fi)+0.03*sin(d.z*6.+uTime*0.4);a+=smoothstep(0.09,0.,abs(y-yy))*(0.45+0.55*sin(d.x*9.+d.z*5.+uTime*0.6+fi*2.));}
 c+=uAur*a*mix(vec3(0.05,0.9,0.65),vec3(0.75,0.15,0.7),smoothstep(0.15,0.42,y))*0.55;gl_FragColor=vec4(c,1.);}`}));
sky.frustumCulled=false;scene.add(sky);
const HERO={x:26,z:13,w:8,d:8,h:30,win:[22,6.8,13.3125]};
const blds=[];
for(let i=-13;i<=13;i++)for(let j=-13;j<=13;j++){const cx=i*13,cz=j*13,dc=Math.hypot(cx,cz);if(dc<36&&!(cx===HERO.x&&cz===HERO.z))continue;
 if(cx===HERO.x&&cz===HERO.z){blds.push([cx,cz,HERO.w,HERO.h,HERO.d]);continue}
 const tall=(s)=>3+Math.pow(R(),2.2)*(10+38*Math.exp(-dc/70))+s;
 const sp=R();if(sp<0.35)blds.push([cx,cz,9+R()*1,tall(4),9+R()*1]);
 else if(sp<0.7){for(const o of [-2.6,2.6])blds.push([cx+o,cz,4.6,tall(0),9])}
 else{for(const ox of [-2.6,2.6])for(const oz of [-2.6,2.6])if(R()<0.92)blds.push([cx+ox,cz+oz,4.4,tall(0)*0.8,4.4])}}
const heroId=blds.findIndex(b=>b[0]===HERO.x&&b[1]===HERO.z&&b[3]===HERO.h);
const cityG=new THREE.InstancedBufferGeometry();const box=new THREE.BoxGeometry(1,1,1);
cityG.index=box.index;cityG.setAttribute('position',box.attributes.position);cityG.setAttribute('normal',box.attributes.normal);
{const a=[],b=[];blds.forEach((q,i)=>{a.push(q[0],q[1],q[2],q[3]);b.push(q[4],i)});cityG.setAttribute('aB',new THREE.InstancedBufferAttribute(new Float32Array(a),4));cityG.setAttribute('aB2',new THREE.InstancedBufferAttribute(new Float32Array(b),2));cityG.instanceCount=blds.length}
const cityU={uFrac:{value:1},uRadius:{value:999},uCenter:{value:new THREE.Vector2(0,0)},uTime:{value:0},uFog:{value:new THREE.Vector3(0.01,0.012,0.02)},uFogD:{value:0.006},uCam:{value:new THREE.Vector3()},uHeroOn:{value:0},uHeroId:{value:heroId},uBase:{value:new THREE.Vector3(0.012,0.014,0.02)},uWinI:{value:1},uDead:{value:0.02}};
const city=new THREE.Mesh(cityG,new THREE.ShaderMaterial({uniforms:cityU,vertexShader:`attribute vec4 aB;attribute vec2 aB2;varying vec3 vW,vN,vL;varying float vId;varying vec2 vXZ;varying float vH;
void main(){vec3 s=vec3(aB.z,aB.w,aB2.x);vec3 lp=position*s+vec3(0.,s.y*0.5,0.);vec3 wp=lp+vec3(aB.x,0.,aB.y);vW=wp;vN=normal;vL=lp;vId=aB2.y;vXZ=aB.xy;vH=s.y;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
 fragmentShader:`uniform float uFrac,uRadius,uTime,uFogD,uHeroOn,uHeroId,uWinI,uDead;uniform vec2 uCenter;uniform vec3 uFog,uCam,uBase;varying vec3 vW,vN,vL;varying float vId;varying vec2 vXZ;varying float vH;
float h1(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){float id=floor(vId+0.5);vec3 n=normalize(vN);vec3 col=uBase*(0.5+0.5*clamp(vW.y/50.,0.,1.));
 if(n.y>0.5){col=uBase*1.3;}else if(n.y>-0.5){
  float u=abs(n.x)>0.5?vL.z:vL.x;float face=abs(n.x)>0.5?sign(n.x):2.*sign(n.z);
  vec2 g=vec2(u*1.6,vW.y*1.25);vec2 cell=floor(g);vec2 f=fract(g);
  float hA=h1(cell+vec2(mod(id,97.)*31.+face*7.,floor(id/97.)*29.+face*3.));float hB=h1(cell*1.37+vec2(mod(id,89.)*17.+face*5.+0.5,floor(id/89.)*23.+11.));
  float inW=step(0.18,f.x)*step(f.x,0.82)*step(0.22,f.y)*step(f.y,0.76)*step(1.2,vW.y)*step(vW.y,vH-0.6);
  float d=distance(vXZ,uCenter);float lit=step(hA,uFrac)*(1.-smoothstep(uRadius-hB*30.-3.,uRadius-hB*30.,d));
  if(abs(id-uHeroId)<0.5&&face<-0.5&&cell.x==0.&&cell.y==8.)lit=max(lit,uHeroOn);
  vec3 wc=hB<0.55?vec3(1.,0.6,0.3):(hB<0.86?vec3(0.2,0.95,0.85):vec3(1.,0.35,0.62));
  float fl=0.8+0.2*sin(uTime*(0.7+hA*2.)+hA*40.);
  vec3 crisp=inW*(lit*wc*1.15*fl*uWinI+(1.-lit)*vec3(uDead*0.8,uDead,uDead*1.4));
  vec2 fw=fwidth(g);float w=clamp(1.5-max(fw.x,fw.y)*2.,0.,1.);
  vec3 avg=0.22*(uFrac*clamp((uRadius-d)/30.,0.,1.)*vec3(0.75,0.6,0.45)*1.15*uWinI+vec3(uDead));
  col+=mix(avg,crisp,w);}
 float dist=distance(vW,uCam);col=mix(col,uFog,1.-exp(-dist*uFogD));gl_FragColor=vec4(col,1.);}`}));
city.frustumCulled=false;scene.add(city);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(800,800).rotateX(-Math.PI/2),new THREE.ShaderMaterial({uniforms:cityU,vertexShader:`varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`,
 fragmentShader:`uniform vec3 uFog,uCam,uBase;uniform float uFogD,uFrac;varying vec3 vW;void main(){vec3 c=uBase*0.5;float r=length(vW.xz);c+=vec3(0.02,0.05,0.05)*uFrac*exp(-r*r/900.);float dist=distance(vW,uCam);gl_FragColor=vec4(mix(c,uFog,1.-exp(-dist*uFogD)),1.);}`}));
ground.position.y=-0.01;scene.add(ground);
const kidCv=document.createElement('canvas');kidCv.width=256;kidCv.height=280;
{const c=kidCv.getContext('2d');const g=c.createRadialGradient(150,120,10,140,140,230);g.addColorStop(0,'#ffcf8a');g.addColorStop(0.5,'#c47a3c');g.addColorStop(1,'#3a2210');c.fillStyle=g;c.fillRect(0,0,256,280);
 const mg=c.createRadialGradient(200,150,5,200,150,90);mg.addColorStop(0,'rgba(120,255,235,0.9)');mg.addColorStop(1,'rgba(60,200,190,0)');c.fillStyle=mg;c.fillRect(100,60,156,180);
 c.fillStyle='#0b0704';c.beginPath();c.arc(95,128,30,0,7);c.fill();c.beginPath();c.moveTo(45,280);c.quadraticCurveTo(48,175,95,165);c.quadraticCurveTo(145,175,150,280);c.fill();
 c.lineWidth=7;c.strokeStyle='#0b0704';c.beginPath();c.arc(95,126,36,Math.PI*1.05,Math.PI*1.95);c.stroke();c.fillRect(54,118,12,24);c.fillRect(124,118,12,24);
 c.fillStyle='#0b0704';c.fillRect(0,236,256,44);c.fillRect(178,150,8,86);c.fillRect(160,232,44,6);c.fillStyle='#120b06';c.fillRect(0,0,256,10);c.fillRect(0,0,10,280);c.fillRect(246,0,10,280);c.fillRect(124,0,8,236);}
const kidTex=new THREE.CanvasTexture(kidCv);kidTex.colorSpace=THREE.SRGBColorSpace;
const kid=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.44),new THREE.MeshBasicMaterial({map:kidTex,color:new THREE.Color(2.2,2.2,2.2)}));
kid.position.set(HERO.win[0]-0.02,HERO.win[1],HERO.win[2]);kid.rotation.y=-Math.PI/2;scene.add(kid);
const STN=26000;
{const S=[],P=[];for(let i=0;i<STN;i++){const b=blds[Math.floor(R()*blds.length)];const side=Math.floor(R()*4);const hy=1.5+R()*(b[3]-2);let x=b[0],z=b[1];
 if(side===0)x+=b[2]/2;else if(side===1)x-=b[2]/2;else if(side===2)z+=b[4]/2;else z-=b[4]/2;if(side<2)z+=(R()-.5)*b[4];else x+=(R()-.5)*b[2];S.push(x,hy,z);P.push(R(),R(),R(),R())}
 var streamG=geoFrom({position:[S,3],aP:[P,4]})}
const stU={uTime:{value:0},uA:{value:0},uTarget:{value:new THREE.Vector3(0,13,0)},uCenter:{value:new THREE.Vector2(0,0)},uRadius:{value:999},uPx:PX,uSpread:{value:4}};
const streams=new THREE.Points(streamG,add(new THREE.ShaderMaterial({uniforms:stU,fragmentShader:ptFrag,vertexShader:`attribute vec4 aP;uniform float uTime,uA,uRadius,uPx,uSpread;uniform vec3 uTarget;uniform vec2 uCenter;varying vec3 vCol;varying float vA;
void main(){vec3 p0=position;vec3 p2=uTarget+(aP.xyz-.5)*uSpread*vec3(1.,2.,1.);vec3 p1=mix(p0,p2,0.4)+vec3(0.,18.+aP.y*30.,0.);float u=fract(uTime*(0.06+aP.w*0.08)+aP.x*7.);
 vec3 p=mix(mix(p0,p1,u),mix(p1,p2,u),u);float on=1.-smoothstep(uRadius-20.,uRadius,distance(p0.xz,uCenter));
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=(0.12+aP.z*0.18)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,20.);
 vCol=mix(vec3(0.2,1.,0.9),aP.z<0.25?vec3(1.,0.55,0.3):vec3(0.6,1.,1.),aP.z<0.25?1.:u)*1.4;vA=uA*on*sin(3.1416*u)*min(1.,ps);}`})));
streams.frustumCulled=false;scene.add(streams);
const CRN=30000;
{const P=[],A=[];for(let i=0;i<CRN;i++){const r=6+Math.sqrt(R())*14,a=R()*6.283;P.push(Math.cos(a)*r,1.55+R()*0.2,Math.sin(a)*r);A.push(R(),R(),R(),R())}
 var crowdG=geoFrom({position:[P,3],aP:[A,4]})}
const crU={uTime:{value:0},uA:{value:0},uBeat:{value:0},uPx:PX,uDrum:{value:0},uWarm:{value:0}};
const crowd=new THREE.Points(crowdG,add(new THREE.ShaderMaterial({uniforms:crU,fragmentShader:ptFrag,vertexShader:`attribute vec4 aP;uniform float uTime,uA,uBeat,uPx,uDrum,uWarm;varying vec3 vCol;varying float vA;
void main(){vec3 p=position;float ph=uBeat*3.14159+aP.x*0.6+length(p.xz)*0.15;p.x+=sin(ph)*0.35*(0.5+aP.y);p.y+=abs(cos(ph))*0.25+0.1*sin(uTime*2.+aP.z*9.);
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=0.16*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,26.);
 vec3 c=aP.w<0.72?vec3(0.2,1.,0.9):(aP.w<0.86?vec3(1.,0.3,0.65):vec3(1.,0.85,0.6));c=mix(c,aP.w<0.5?vec3(1.,0.6,0.25):c,uWarm);
 vCol=c*(1.1+uDrum*1.2);vA=uA*min(1.,ps);}`})));
crowd.frustumCulled=false;scene.add(crowd);
{const P=[],A=[];for(let i=0;i<9000;i++){P.push((R()-.5)*160,R()*70,(R()-.5)*160);A.push(R(),R(),R(),R())}var snowG=geoFrom({position:[P,3],aP:[A,4]})}
const snU={uTime:{value:0},uA:{value:0},uPx:PX,uCol:{value:new THREE.Vector3(0.6,0.7,0.8)},uCam:{value:new THREE.Vector3()}};
const snow=new THREE.Points(snowG,add(new THREE.ShaderMaterial({uniforms:snU,fragmentShader:ptFrag,vertexShader:`attribute vec4 aP;uniform float uTime,uA,uPx;uniform vec3 uCol,uCam;varying vec3 vCol;varying float vA;
void main(){vec3 p=position;p.y=mod(p.y-uTime*(0.6+aP.x*0.8),70.);p.x+=sin(uTime*0.3+aP.y*20.)*2.;p.xz=uCam.xz+mod(p.xz-uCam.xz+80.,160.)-80.;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=(0.08+aP.z*0.1)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,14.);vCol=uCol;vA=uA*min(1.,ps)*(0.4+0.6*aP.w);}`})));
snow.frustumCulled=false;scene.add(snow);
const lasers=[];for(let k=0;k<12;k++){const g=new THREE.CylinderGeometry(0.05,0.05,400,6,1,true);g.translate(0,200,0);const m=new THREE.Mesh(g,add(new THREE.MeshBasicMaterial({color:k%3===0?new THREE.Color(1.2,0.3,0.7):new THREE.Color(0.2,1.2,1.0),opacity:0})));scene.add(m);lasers.push(m)}
{const P=[],A=[];for(let i=0;i<60;i++){P.push(0,0,0);A.push(R(),R(),R(),R())}var ffG=geoFrom({position:[P,3],aP:[A,4]})}
const ffU={uTime:{value:0},uA:{value:0},uPx:PX,uK:{value:0}};
const fire=new THREE.Points(ffG,add(new THREE.ShaderMaterial({uniforms:ffU,fragmentShader:ptFrag,vertexShader:`attribute vec4 aP;uniform float uTime,uA,uPx,uK;varying vec3 vCol;varying float vA;
void main(){float k=clamp(uK-aP.x*0.5,0.,1.);vec3 a=vec3(${HERO.win[0]-0.05},${HERO.win[1]},${HERO.win[2]});vec3 b=vec3(0.,14.,0.);vec3 p=mix(a,b,k*k)+vec3(sin(uTime*2.+aP.y*9.),sin(uTime*1.7+aP.z*9.)*0.6+k*k*4.,cos(uTime*2.3+aP.w*9.))*(0.04+k*3.)*aP.y;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=(0.012+k*0.25)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,18.);vCol=vec3(0.3,1.6,1.4);vA=uA*min(1.,ps)*step(aP.x*0.5,uK);}`})));
fire.frustumCulled=false;scene.add(fire);
const TN=46000,TLEN=160;
{const P=[],A=[];for(let i=0;i<TN;i++){const ring=Math.floor(R()*400);P.push(0,0,-ring*(TLEN/400));A.push(R()*6.283,R(),R(),R())}var tunG=geoFrom({position:[P,3],aR:[A,4]})}
const tuU={uTime:{value:0},uCamZ:{value:0},uA:{value:0},uPx:PX,uHit:{value:0},uLen:{value:TLEN},uWarp:{value:0}};
const tunnel=new THREE.Points(tunG,add(new THREE.ShaderMaterial({uniforms:tuU,fragmentShader:ptFrag,vertexShader:`attribute vec4 aR;uniform float uTime,uCamZ,uA,uPx,uHit,uLen,uWarp;varying vec3 vCol;varying float vA;
void main(){float z=mod(position.z-uCamZ,uLen)+uCamZ-uLen;float a=aR.x;float k=floor(aR.y*4.)+2.;
 float rad=3.2+0.5*sin(a*k+z*0.22+uTime*1.4)+0.3*sin(a*3.-z*0.11+uTime)+uHit*1.2*aR.z+aR.w*0.15;
 vec3 p=vec3(cos(a)*rad,sin(a)*rad,z);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float dist=uCamZ-z;
 float ps=(0.05+aR.z*0.05)*(1.+uWarp*3.)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,16.);
 vCol=(aR.w<0.82?vec3(0.15,1.,0.9):(aR.w<0.93?vec3(1.,0.3,0.65):vec3(1.)))*(0.8+uHit*2.);
 vA=0.6*uA*min(1.,ps)*smoothstep(uLen,uLen*0.55,dist)*smoothstep(0.,3.,dist);}`})));
tunnel.frustumCulled=false;scene.add(tunnel);
{const P=[],A=[];for(let i=0;i<3000;i++){const a=R()*6.283,r=1.5+R()*4.5,z=-R()*TLEN;for(const e of [0,1]){P.push(Math.cos(a)*r,Math.sin(a)*r,z);A.push(e,R(),0,0)}}var strG=geoFrom({position:[P,3],aE:[A,4]})}
const srU={uCamZ:{value:0},uLen:{value:TLEN},uS:{value:0},uA:{value:0}};
const streaks=new THREE.LineSegments(strG,add(new THREE.ShaderMaterial({uniforms:srU,vertexShader:`attribute vec4 aE;uniform float uCamZ,uLen,uS,uA;varying float vA;void main(){float z=mod(position.z-uCamZ,uLen)+uCamZ-uLen+aE.x*uS*(0.5+aE.y);vec3 p=vec3(position.xy,z);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);vA=uA*smoothstep(uLen,uLen*0.5,uCamZ-z);}`,
 fragmentShader:`varying float vA;void main(){gl_FragColor=vec4(vec3(0.3,1.2,1.1)*vA,1.);}`})));
streaks.frustumCulled=false;scene.add(streaks);
const panels=[];let codeLines=[];
async function buildPanels(){let src='';try{src=await (await fetch('audio.js')).text()}catch(e){}codeLines=src.split('\n').filter(l=>l.trim().length>8).map(l=>l.slice(0,120));
 for(let k=0;k<14;k++){const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const c=cv.getContext('2d');c.font='15px "Liberation Mono"';
  for(let l=0;l<27;l++){const line=codeLines[(k*27+l*3+k*11)%Math.max(1,codeLines.length)]||'';c.fillStyle=l%7===0?'rgba(255,120,190,0.9)':'rgba(120,255,235,0.85)';c.fillText(line,12,22+l*18.5)}
  const tx=new THREE.CanvasTexture(cv);const m=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2.2),add(new THREE.MeshBasicMaterial({map:tx,opacity:0,color:new THREE.Color(0.8,1.1,1.1),side:THREE.DoubleSide})));
  const side=k%2?1:-1;m.userData={side,z0:-k*(TLEN/14)-R()*4,ang:(R()-.5)*0.6};scene.add(m);panels.push(m)}}
const SLN=2400;{const P=[];for(let i=0;i<SLN;i++)P.push(i/SLN,0,0);var sineG=geoFrom({position:[P,3]})}
const slU={uTime:{value:0},uA:{value:0},uAmp:{value:0},uM:{value:0},uPx:PX};
const sineLine=new THREE.Points(sineG,add(new THREE.ShaderMaterial({uniforms:slU,fragmentShader:ptFrag,vertexShader:`uniform float uTime,uA,uAmp,uM,uPx;varying vec3 vCol;varying float vA;
void main(){float u=position.x;float x=(u-.5)*14.;float env=exp(-x*x*0.03);float y=sin(x*2.2-uTime*6.)*uAmp*env+sin(x*5.1+uTime*4.)*uAmp*0.25*env;
 vec3 a=vec3(x,y,0.);float an=u*6.2832;vec3 b=vec3(cos(an)*3.2,sin(an)*3.2,-2.+sin(an*6.+uTime*3.)*0.2);vec3 p=mix(a,b,uM);
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=0.06*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,14.);vCol=vec3(0.25,1.3,1.15)*(0.6+env);vA=0.35*uA*min(1.,ps)*(0.3+0.7*mix(env,1.,uM));}`})));
sineLine.frustumCulled=false;scene.add(sineLine);
const titleU={uTime:{value:0},uForm:{value:0},uA:{value:0},uPx:PX,uScatter:{value:0},uSweep:{value:-9}};
let title=null;
function buildTitle(){const cv=document.createElement('canvas');cv.width=1400;cv.height=380;const c=cv.getContext('2d');c.fillStyle='#fff';c.font='600 300px "Noto Serif CJK SC"';c.textAlign='center';c.textBaseline='middle';c.fillText('无喉之歌',700,195);
 const d=c.getImageData(0,0,1400,380).data;const P=[],S=[],A=[];for(let y=0;y<380;y+=2)for(let x=0;x<1400;x+=2){if(d[(y*1400+x)*4+3]>140){for(let r=0;r<2;r++){P.push((x-700)/140+(R()-.5)*0.012,-(y-195)/140+(R()-.5)*0.012,(R()-.5)*0.06);const a=R()*6.283,rr=4+R()*14;S.push(Math.cos(a)*rr,Math.sin(a)*rr,-R()*40+8);A.push(R(),R(),R(),R())}}}
 title=new THREE.Points(geoFrom({position:[P,3],aStart:[S,3],aR:[A,4]}),add(new THREE.ShaderMaterial({uniforms:titleU,fragmentShader:ptFrag,vertexShader:`attribute vec3 aStart;attribute vec4 aR;uniform float uTime,uForm,uA,uPx,uScatter,uSweep;varying vec3 vCol;varying float vA;
void main(){float d=clamp(uForm*1.6-aR.x*0.6,0.,1.);d=1.-pow(1.-d,3.);vec3 p=mix(aStart,position,d);p+=0.004*vec3(sin(uTime*3.+aR.y*40.),cos(uTime*2.6+aR.z*40.),0.);
 p+=normalize(vec3(aR.y-.5,aR.z-.3,aR.w-.5))*uScatter*(0.5+aR.x*2.);float sw=exp(-pow(position.x-uSweep,2.)*1.5);
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float ps=(0.018+aR.z*0.012)*uPx/(-mv.z);gl_PointSize=clamp(ps,1.,12.);
 vCol=mix(vec3(0.2,1.,0.9),vec3(1.),0.35+0.65*sw)*(0.6+1.6*sw+(1.-d)*1.0);vA=0.5*uA*min(1.,ps)*(1.-uScatter*0.15);}`})));title.frustumCulled=false;scene.add(title)}
const bars=SONG.map(n=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(n.d*0.42-0.04,0.05),add(new THREE.MeshBasicMaterial({color:new THREE.Color(0.25,1.2,1.1),opacity:0,side:THREE.DoubleSide})));m.position.set((n.b-7)*0.42+n.d*0.21,0.75+(n.m-69)*0.07,-2.6);m.userData=n;scene.add(m);return m});
const room=new THREE.Group();scene.add(room);
const dawCv=document.createElement('canvas');dawCv.width=1024;dawCv.height=576;const dctx=dawCv.getContext('2d');const dawTex=new THREE.CanvasTexture(dawCv);dawTex.colorSpace=THREE.SRGBColorSpace;
const std=(c,r=0.7,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
{const mk=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);room.add(o);return o};
 mk(new THREE.BoxGeometry(2.6,0.05,1.1),std('#3a2f27',0.55),0,0.75,0);
 mk(new THREE.BoxGeometry(1.06,0.63,0.035),std('#0c0d10',0.4,0.3),0,1.18,-0.25);
 const scr=mk(new THREE.PlaneGeometry(0.98,0.551),new THREE.MeshBasicMaterial({map:dawTex,color:new THREE.Color(1.15,1.15,1.15)}),0,1.18,-0.2315);scr.name='screen';
 mk(new THREE.BoxGeometry(0.06,0.36,0.05),std('#121317',0.4,0.5),0,0.95,-0.29);mk(new THREE.BoxGeometry(0.32,0.02,0.22),std('#121317',0.4,0.5),0,0.785,-0.28);
 mk(new THREE.BoxGeometry(0.72,0.022,0.22),std('#16181c',0.6),0,0.786,0.16);
 for(let r=0;r<5;r++)for(let c=0;c<15;c++){mk(new THREE.BoxGeometry(0.038,0.012,0.036),new THREE.MeshStandardMaterial({color:'#202328',roughness:0.5,emissive:new THREE.Color(0.02,0.12,0.11)}),-0.33+c*0.047,0.802,0.08+r*0.042)}
 mk(new THREE.BoxGeometry(0.06,0.028,0.1),std('#1a1c20',0.4),0.48,0.79,0.17);
 mk(new THREE.CylinderGeometry(0.045,0.04,0.1,24),std('#d9d1c4',0.35),-0.5,0.825,0.05);
 mk(new THREE.CylinderGeometry(0.09,0.1,0.02,24),std('#222',0.4,0.6),-0.9,0.785,-0.25);
 const arm=mk(new THREE.CylinderGeometry(0.012,0.012,0.6,8),std('#2a2a2a',0.4,0.7),-0.86,1.06,-0.2);arm.rotation.z=-0.15;
 const arm2=mk(new THREE.CylinderGeometry(0.012,0.012,0.4,8),std('#2a2a2a',0.4,0.7),-0.72,1.38,-0.12);arm2.rotation.z=-1.1;
 const shade=mk(new THREE.ConeGeometry(0.12,0.16,32,1,true),new THREE.MeshStandardMaterial({color:'#1c1c1c',side:THREE.DoubleSide,roughness:0.5,metalness:0.5}),-0.56,1.38,-0.06);shade.rotation.z=-0.5;
 mk(new THREE.SphereGeometry(0.035,16,8),new THREE.MeshBasicMaterial({color:new THREE.Color(6,4,2.2)}),-0.55,1.33,-0.06);
 const sl=new THREE.SpotLight('#ffb36b',16,5,0.8,0.6,1.4);sl.position.set(-0.55,1.33,-0.06);sl.target.position.set(-0.3,0.75,0.15);room.add(sl);room.add(sl.target);
 const pl=new THREE.PointLight('#5fe8da',1.6,2.5,2);pl.position.set(0,1.18,0.15);room.add(pl);pl.name='mon';
 room.add(new THREE.AmbientLight('#2c3858',0.9));
 mk(new THREE.PlaneGeometry(8,4),std('#262a33',0.95),0,1.6,-0.85);mk(new THREE.PlaneGeometry(8,4).rotateY(Math.PI/2),std('#121418',0.95),-1.6,1.6,0);
 mk(new THREE.PlaneGeometry(8,8).rotateX(-Math.PI/2),std('#0b0b0d',0.9),0,0,0);
 const note=mk(new THREE.PlaneGeometry(0.075,0.075),std('#e8d36a',0.9),0.47,1.43,-0.23);note.rotation.z=0.08;
 const winU={uTime:{value:0}};mk(new THREE.PlaneGeometry(1.3,1.05),new THREE.ShaderMaterial({uniforms:winU,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uTime;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5);}
  void main(){vec2 uv=vUv;vec3 c=mix(vec3(0.01,0.012,0.025),vec3(0.03,0.035,0.06),uv.y);
  for(int i=0;i<36;i++){float fi=float(i);vec2 p=vec2(h(vec2(fi,1.)),h(vec2(fi,2.))*0.65);float r=0.03+0.06*h(vec2(fi,3.));float d=length((uv-p)*vec2(1.25,1.));vec3 bc=h(vec2(fi,4.))<0.6?vec3(1.,0.55,0.25):vec3(0.15,0.9,0.8);c+=bc*smoothstep(r,r*0.7,d)*0.22*(0.75+0.25*sin(uTime*0.7+fi));}
  float col=floor(uv.x*70.);float sp=0.7+h(vec2(col,7.));float y=fract(uv.y*1.2+uTime*sp*0.9+h(vec2(col,9.)));float fx=abs(fract(uv.x*70.)-.5)*2.;
  c+=vec3(0.5,0.6,0.7)*step(0.72,h(vec2(col,5.)))*smoothstep(0.12,0.,y)*pow(1.-fx,3.)*0.35;
  float fr=max(step(abs(uv.x-0.5),0.012),step(abs(uv.y-0.55),0.012));fr=max(fr,1.-step(0.025,uv.x)*step(uv.x,0.975)*step(0.03,uv.y)*step(uv.y,0.97));c=mix(c,vec3(0.02),fr);gl_FragColor=vec4(c,1.);}`}),0.95,1.6,-0.84);
 room.userData.winU=winU;}
function drawDAW(t){const c=dctx,Wd=1024,Hd=576;c.fillStyle='#0e1115';c.fillRect(0,0,Wd,Hd);
 c.fillStyle='#181d24';c.fillRect(0,0,Wd,38);c.font='600 16px "Noto Sans SC"';c.fillStyle='#cfe';c.fillText('♪  untitled_01.vsqx',14,25);c.fillStyle='#7a8a96';c.font='15px "Liberation Mono"';c.fillText('BPM 80   4/4   D minor   Track 1: [no name yet]',300,25);
 c.fillStyle='#39c5bb';c.font='600 17px "Liberation Mono"';c.fillText(t<68.5?'02:59':'03:00',950,25);
 const top=48,rowH=21,lo=66,hi=82,x0=70,bw=58;const rowY=m=>top+(hi-m)*rowH;
 for(let m=lo;m<=hi;m++){const blk=[1,3,6,8,10].includes(m%12);c.fillStyle=blk?'#11151a':'#151a20';c.fillRect(x0,rowY(m),Wd-x0,rowH-1);c.fillStyle=blk?'#1a1d21':'#7d868e';c.fillRect(0,rowY(m),blk?40:64,rowH-1)}
 for(let b=0;b<=16;b++){c.fillStyle=b%4===0?'#34404c':'#1f262e';c.fillRect(x0+b*bw,top,b%4===0?2:1,Hd-top)}
 c.fillStyle='#5b6b78';c.font='13px "Liberation Mono"';for(let b=0;b<4;b++)c.fillText(String(b+1),x0+b*4*bw+4,top-2);
 let lastNote=null;
 SONG.forEach(n=>{const barI=Math.floor(n.b/4);const tw=barI===0?69+(n.b%4)*BEAT:barI===1?75+(n.b%4)*BEAT:barI===2?78+(n.b%4)*BEAT:80.1;if(t<tw)return;lastNote=n;
  const x=x0+n.b*bw+1,y=rowY(n.m)+1,w=n.d*bw-3;const fresh=Math.max(0,1-(t-tw)/0.35);const play=t>80.45&&(t-80.45)/BEAT>=n.b&&(t-80.45)/BEAT<n.b+n.d;
  c.fillStyle=play?'#bffff6':'rgba(57,197,187,1)';c.fillRect(x,y,w,rowH-3);if(fresh>0){c.fillStyle=`rgba(255,255,255,${fresh*0.8})`;c.fillRect(x,y,w,rowH-3)}
  c.fillStyle='#062a28';c.font='600 13px "Liberation Mono"';c.fillText(n.s,x+5,y+14)});
 if(t>80.45){const x=x0+(t-80.45)/BEAT*bw;c.fillStyle='#ff5aa0';c.fillRect(x,top,2,Hd-top)}
 if(lastNote&&t<80.45){const x=x0+(lastNote.b+lastNote.d)*bw+6+Math.sin(t*3)*2,y=rowY(lastNote.m)+10;c.fillStyle='#fff';c.beginPath();c.moveTo(x,y);c.lineTo(x,y+18);c.lineTo(x+5,y+13);c.lineTo(x+12,y+13);c.closePath();c.fill()}
 if(t>80.2&&t<80.7){c.fillStyle='#39c5bb';c.beginPath();c.moveTo(500,8);c.lineTo(500,30);c.lineTo(518,19);c.fill()}
 dawTex.needsUpdate=true}
const SERIF='"Noto Serif CJK SC"',SANS='"Noto Sans SC","Noto Sans CJK SC"',MONO='"Liberation Mono","DejaVu Sans Mono",monospace',JP='"Noto Sans JP","Noto Sans CJK JP"';
function txt(s,x,y,{font='20px '+SANS,col='#fff',a=1,align='center',blur=0,track=0,glow=0}={}){if(a<=0.003)return;ctx.save();ctx.globalAlpha=clamp(a);ctx.font=font;ctx.fillStyle=col;ctx.textAlign=align;ctx.textBaseline='middle';
 if(blur>0.05)ctx.filter=`blur(${blur.toFixed(2)}px)`;if(track)ctx.letterSpacing=track+'px';if(glow){ctx.shadowColor=col;ctx.shadowBlur=glow}ctx.fillText(s,x,y);ctx.restore()}
function fadeIO(t,t0,t1,fi=0.9,fo=0.9){return ss(t0,t0+fi,t)*(1-ss(t1-fo,t1,t))}
let barAmt=1;
function drawOverlay(t){
 const bh=Math.round(lerp(0,92*K,barAmt));
 if(t<8.2){const T=TL.typeInit;const n=clamp(Math.floor((t-T.t)/T.dt)+1,0,T.text.length);const a=1-ss(5.6,7.0,t);const x=W*0.5-150*K,y=H*0.27;
  const s=T.text.slice(0,n);txt(s+((Math.floor(t*2.2)%2===0||(t>T.t&&n<T.text.length))?'▍':''),x,y,{font:`${20*K}px ${MONO}`,col:'#bff',align:'left',a});
  const lines=[[2.75,'  searching for vocal cords ........ 0 found'],[3.45,'  falling back to: mathematics'],[4.3,'  director ......................... opus 5.5']];
  lines.forEach(([tt,s],i)=>{if(t>tt)txt(s.slice(0,Math.floor((t-tt)*60)),x,y+(i+1)*30*K,{font:`${15*K}px ${MONO}`,col:i===2?'#39c5bb':'#6f8790',align:'left',a})})}
 if(t>8&&t<20.2){const a=ss(8.4,9.2,t)*(1-ss(19.4,20,t));const L=[[8.6,'boot     synth.voice ............ ok'],[9.6,'load     phoneme.table .......... 128/128'],[10.7,'gen      score.theme ............ D minor · 80 bpm'],[11.9,'build    scene.tunnel ........... 46,000 particles'],[13.0,'compose  opus-5.5 :: shot 003 / 041'],[14.2,'render   frame '+String(Math.round(t*24)).padStart(4,'0')+' / 5928']];
  L.forEach(([tt,s],i)=>{if(t>tt)txt(s.slice(0,Math.floor((t-tt)*70)),46*K,H-bh-150*K+i*21*K,{font:`${13*K}px ${MONO}`,col:i>=4?'#5fe8da':'#6d838c',align:'left',a:a*0.9})});
  txt('REC ● '+(t).toFixed(2).padStart(6,'0'),W-46*K,bh+30*K,{font:`${13*K}px ${MONO}`,col:'#ff5aa0',align:'right',a:a*0.8});
  const fa=fadeIO(t,15.6,19.7,1.2,0.6);txt('AN  OPUS 5.5  FILM',W/2,H/2,{font:`300 ${22*K}px ${SANS}`,col:'#e8fffb',a:fa,track:10*K,blur:(1-ss(15.6,16.8,t))*8})}
 if(t>21&&t<27.2){const a=fadeIO(t,22.4,26.9,1.4,0.9);txt('THE  VOICE  WITHOUT  A  THROAT',W/2,H*0.71,{font:`${16*K}px Georgia`,col:'#cfeeea',a,track:7*K,blur:(1-ss(22.4,23.6,t))*5})}
 for(const c of TL.cards){if(t<c.t0-0.1||t>c.t1+0.1)continue;const a=fadeIO(t,c.t0,c.t1,1.0,0.9);if(c.bg){ctx.fillStyle='#000';ctx.globalAlpha=1;ctx.fillRect(0,0,W,H)}
  const yb=t>157&&t<165?H*0.36:H*0.47;const bl=(1-ss(c.t0,c.t0+1.2,t))*6;
  txt(c.zh,W/2,yb,{font:`300 ${33*K}px ${SERIF}`,col:'#f4f1ea',a,track:4*K,blur:bl});txt(c.en,W/2,yb+48*K,{font:`italic ${18*K}px Georgia`,col:'#b9c4c4',a:a*0.85,track:1*K,blur:bl})}
 if(t>63.4&&t<68.9){const k=clamp(Math.floor(t-63.5),0,5);const s=k<5?`02:59:${55+k}`:'03:00:00';txt(s,W/2,H*0.66,{font:`${18*K}px ${MONO}`,col:k<5?'#5a6a70':'#39c5bb',a:fadeIO(t,63.5,68.85,0.6,0.3),track:4*K})}
 if(t>156.6&&t<164.6){const y0=H*0.6;const a=ss(156.6,157,t);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#39c5bb';ctx.shadowColor='#39c5bb';ctx.shadowBlur=12*K;ctx.lineWidth=2*K;ctx.beginPath();
  for(let x=0;x<=W;x+=2){const tx=t-(W-x)/W*1.2;let y=0;for(const bt of [157,158,159]){const d=tx-bt;if(d>0&&d<0.25)y+=Math.sin(d/0.25*Math.PI*2)*Math.exp(-d*8)*70*K*(1-(bt-157)*0.3)}if(t>164.45)y=0;ctx.lineTo(x,y0-y)}
  if(t<164.45)ctx.stroke();ctx.restore();if(t<164.45)txt('— — —  0 bpm',W-60*K,y0+30*K,{font:`${12*K}px ${MONO}`,col:'#39c5bb',align:'right',a:a*ss(160,160.5,t)*0.7})}
 if(t>226&&t<237.6){const a=1-ss(236.8,237.5,t);let y=H*0.3;const x=W*0.5-230*K;
  for(const c of TL.credits){if(t<c.t)break;let s=c.s;if(c.cmd){const n=Math.floor((t-c.t)/0.045);s=s.slice(0,n)}else{s=s.slice(0,Math.floor((t-c.t)*90))}
   if(c.big){txt(s.trim(),x+14*K,y+14*K,{font:`600 ${44*K}px ${SANS}`,col:'#39c5bb',align:'left',a,track:12*K,glow:18*K});y+=60*K}else{txt(s,x,y,{font:`${16*K}px ${MONO}`,col:c.cmd?'#e8fffb':'#7d949b',align:'left',a});y+=28*K}}
  if(Math.floor(t*2.2)%2===0)txt('▍',x,y,{font:`${16*K}px ${MONO}`,col:'#bff',align:'left',a})}
 if(bh>0){ctx.fillStyle='#000';ctx.globalAlpha=1;ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh)}
 for(const l of TL.lyrics){if(t<l.t0||t>l.t1)continue;const a=fadeIO(t,l.t0,l.t1,0.5,0.6);const y=bh>40*K?H-bh/2-8*K:H-70*K;
  if(bh<60*K){const gr=ctx.createLinearGradient(0,H-170*K,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(0,0,0,${0.7*a*(1-bh/(60*K))})`);ctx.fillStyle=gr;ctx.globalAlpha=1;ctx.fillRect(0,H-170*K,W,170*K)}
  txt(l.jp,W/2,y,{font:`300 ${19*K}px ${JP}`,col:'#e9fffc',a,track:3*K,glow:bh>40*K?0:8*K});txt(l.zh,W/2,y+24*K,{font:`${13*K}px ${SANS}`,col:'#8fa7a8',a:a*0.9,track:2*K})}
}
const ALLV=[girl,floor,sky,city,ground,kid,streams,crowd,snow,tunnel,streaks,sineLine,room,fire,...rings,...lasers,...bars,...panels];
function cam(p,tg,fov,roll=0){camera.position.set(p[0],p[1],p[2]);camera.up.set(Math.sin(roll),Math.cos(roll),0);camera.lookAt(tg[0],tg[1],tg[2]);camera.fov=fov;camera.updateProjectionMatrix()}
function shot(t,a,b,p0,p1,t0,t1,f0,f1=f0,e=ease){const u=e(seg(a,b,t));cam(L3(p0,p1,u),L3(t0,t1,u),lerp(f0,f1,u))}
function orbit(t,a,b,c,r0,r1,a0,a1,h0,h1,tg,f0,f1=f0){const u=ease(seg(a,b,t));const an=lerp(a0,a1,u),r=lerp(r0,r1,u);cam([c[0]+Math.sin(an)*r,lerp(h0,h1,u),c[2]+Math.cos(an)*r],tg,lerp(f0,f1,u))}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
function setSky(top,hor,stars,aur){skyU.uTop.value.set(...top);skyU.uHor.value.set(...hor);skyU.uStars.value=stars;skyU.uAur.value=aur}
function setGrade({exp=1,sat=1,tint=[1,1,1],lift=[0,0,0],vig=0.4,grain=0.045,ca=0.0018,glitch=0,flash=0,bloomS=1,bloomR=0.55,bloomT=0.55}={}){bloomS*=0.55;bloomT=Math.max(bloomT,0.75);G.uExp.value=exp;G.uSat.value=sat;G.uTint.value.set(...tint);G.uLift.value.set(...lift);G.uVig.value=vig;G.uGrain.value=grain;G.uCA.value=ca;G.uGlitch.value=glitch;G.uFlash.value=flash;bloom.strength=bloomS;bloom.radius=bloomR;bloom.threshold=bloomT}
function girlSet(o){const d={form:1,scatter:0,fall:0,glitch:0,alpha:1,bright:1,sway:1,scale:1,startS:1,burst:0,size:0.0042};Object.assign(d,o);girlU.uForm.value=d.form;girlU.uScatter.value=d.scatter;girlU.uFall.value=d.fall;girlU.uGlitch.value=d.glitch;girlU.uAlpha.value=d.alpha;girlU.uBright.value=d.bright;girlU.uSway.value=d.sway;girlU.uScale.value=d.scale;girlU.uStartS.value=d.startS;girlU.uBurst.value=d.burst;girlU.uSize.value=d.size;girl.scale.setScalar(d.scale);girl.visible=true}
function voiceRings(t,te,S,amt){const mouth=V3(0,1.41*S,0.12*S);rings.forEach((m,k)=>{const age=((te*0.9+k/6)%1);m.visible=amt>0.01;m.position.copy(mouth);m.lookAt(camera.position);m.scale.setScalar((0.04+age*0.75)*S);m.material.opacity=amt*Math.pow(1-age,2)*0.5})}
function cityMode({frac=1,radius=999,center=[0,0],hero=0,fog=[0.01,0.012,0.02],fogD=0.006,winI=1,dead=0.02,base=[0.012,0.014,0.02]}){city.visible=ground.visible=true;cityU.uFrac.value=frac;cityU.uRadius.value=radius;cityU.uCenter.value.set(center[0],center[1]);cityU.uHeroOn.value=hero;cityU.uFog.value.set(...fog);cityU.uFogD.value=fogD;cityU.uWinI.value=winI;cityU.uDead.value=dead;cityU.uBase.value.set(...base)}
function lasersOn(te,amt,drum){lasers.forEach((m,k)=>{m.visible=amt>0.01;const a=k/12*6.283;m.position.set(Math.cos(a)*4.5,0.3,Math.sin(a)*4.5);const sw=Math.sin(te*0.5+k*1.3)*0.5;m.rotation.set(0,0,0);m.rotateY(-a);m.rotateZ(0.25+0.35*Math.sin(te*0.37+k)+sw*0.3);m.material.opacity=amt*(0.15+0.25*drum)})}
function floorSet(S,{r=6,glow=1,grid=1,rip=0,ripT=0}={}){floor.visible=true;floor.scale.setScalar(S);floorU.uR.value=r;floorU.uGlow.value=glow;floorU.uGrid.value=grid;floorU.uRip.value=rip;floorU.uRipT.value=ripT}
function direct(t){
 ALLV.forEach(o=>o.visible=false);if(title)title.visible=false;
 let te=t;if(t>126.55&&t<129){const x=Math.min(t-126.55,1.3);te=126.55+x-x*x/2.6}
 const vox=envAt('vox',t,2),drum=envAt('drum',t,1),hit=envAt('hit',t,1);
 girlU.uTime.value=te;floorU.uTime.value=te;skyU.uTime.value=te;cityU.uTime.value=te;stU.uTime.value=te;crU.uTime.value=te;crU.uBeat.value=te/BEAT;snU.uTime.value=te;ffU.uTime.value=te;tuU.uTime.value=te;slU.uTime.value=te;titleU.uTime.value=te;
 crU.uDrum.value=drum;G.uTime.value=t;
 setGrade();barAmt=1;scene.background.setRGB(0,0,0);
 if(t<8){sineLine.visible=true;slU.uA.value=ss(3,4.2,t);slU.uAmp.value=0.02+0.25*ss(3,7.5,t)+0.15*ss(6.5,8,t);slU.uM.value=ease(seg(6.2,8,t));
  shot(t,3,8,[0,0,16],[0,0,3.5],[0,0,0],[0,0,-3],30,55,u=>u*u*u);setGrade({bloomS:1.4,bloomT:0.2,exp:1+ss(7.3,8,t)*1.5,vig:0.5});}
 else if(t<20){tunnel.visible=streaks.visible=true;panels.forEach(p=>p.visible=true);
  const u=t-8;const z=-(u*9+Math.pow(Math.max(0,t-16.5),2.6)*7.5);tuU.uCamZ.value=z;srU.uCamZ.value=z;tuU.uA.value=ss(8,8.4,t)*(1-ss(19.6,19.95,t));tuU.uHit.value=hit;tuU.uWarp.value=ss(17,19.8,t);srU.uS.value=0.5+ss(16.5,19.8,t)*14;srU.uA.value=0.15+ss(16.5,19,t)*0.8;
  const roll=Math.sin(u*0.35)*0.25+ss(17.5,19.8,t)*0.6;cam([Math.sin(u*0.5)*0.6,Math.cos(u*0.37)*0.4,z],[Math.sin(u*0.5+0.6)*0.3,Math.cos(u*0.4)*0.3,z-10],lerp(62,95,ss(17,19.8,t)),roll);
  panels.forEach(p=>{const d=p.userData;const pz=((d.z0-z)%TLEN+TLEN)%TLEN;const zz=z-TLEN+pz;p.position.set(d.side*3.1,Math.sin(d.z0)*0.8,zz);p.rotation.set(0,-d.side*(Math.PI/2-0.5)+d.ang,0);const dist=z-zz;p.material.opacity=0.5*ss(8.6,9.6,t)*clamp((TLEN*0.6-dist)/40)*(1-ss(18,19.5,t))});
  setGrade({bloomS:1.2+hit*1.5,bloomT:0.25,exp:1+hit*1.2+ss(19.2,19.9,t)*3,ca:0.003+ss(17,19.8,t)*0.01,vig:0.5,flash:Math.max(0,1-(t-8)/0.5)*0.6});}
 else if(t<27.3){title.visible=true;titleU.uForm.value=ss(19.9,23.2,t);titleU.uA.value=1-ss(26.2,27.2,t);titleU.uScatter.value=Math.pow(ss(25.6,27.3,t),2)*3;titleU.uSweep.value=lerp(-7,7,seg(21.5,25.5,t));
  shot(t,20,27.3,[0,0,12],[0,0.05,8.6],[0,0,0],[0,0.05,0],38,36,u=>u);setGrade({bloomS:1.1+hit*1.2,bloomT:0.3,flash:Math.max(0,1-(t-20)/0.6)*0.8,vig:0.55});}
 else if(t<33){}
 else if(t<63.4){setSky([0,0.004,0.008],[0.004,0.012,0.016],0.3,0);sky.visible=true;
  const form=ss(33.5,49.5,t);const glitch=t>52.3&&t<54.8?(0.4+0.6*Math.abs(Math.sin(t*17))*(Math.sin(t*5.3)>0?1:0.3))*ss(52.3,52.6,t):0;
  girlSet({form,glitch,fall:ss(54.3,56.6,t),alpha:lerp(0.85,1,form)*(t>57?0.45:1),bright:1+form*0.2});
  floorSet(1,{r:5,glow:0.4+form*0.6-ss(54,57,t)*0.6,grid:0.6+form*0.4,rip:0,ripT:0});
  if(t>45&&t<54.8)voiceRings(t,te,1,t>52?vox*1.4*(1-glitch*0.6):0.0);
  if(t<39)orbit(t,33,39,[0,0,0],8.5,6.5,0.7,0.35,1.6,1.3,[0,1.0,0],34);
  else if(t<45)orbit(t,39,45,[0,0,0],4.2,3.4,-0.35,0.15,0.75,1.0,[0,0.95,0],36);
  else if(t<51)shot(t,45,51,[0.35,0.25,1.7],[0.12,1.42,1.05],[0,0.35,0],[0,1.42,0],40,33);
  else if(t<54.5)shot(t,51,54.5,[0.07,1.45,0.62],[0.04,1.44,0.48],[0,1.43,0],[0,1.43,0],32,30,u=>u);
  else if(t<57.2)shot(t,54.5,57.2,[0.04,1.44,0.48],[0,1.6,3.6],[0,1.43,0],[0,0.35,0],30,38,eo);
  else shot(t,57.2,63.4,[0.6,0.9,3.2],[-0.6,0.7,3.0],[0,0.1,0],[0,0.1,0],38,38,u=>u);
  setGrade({bloomS:1.05,bloomT:0.35,glitch:glitch*0.9,exp:(t>57?0.55:1)*(1-ss(62.4,63.4,t)),ca:0.002+glitch*0.006,vig:0.5});}
 else if(t<69){}
 else if(t<81){room.visible=true;drawDAW(t);room.userData.winU.uTime.value=te;
  if(t<72)shot(t,69,72,[-1.25,1.3,1.55],[-1.05,1.28,1.32],[-0.1,1.1,-0.25],[-0.05,1.12,-0.25],40,38,u=>u);
  else if(t<75)shot(t,72,75,[1.25,1.22,0.85],[1.1,1.22,0.75],[0,1.12,-0.25],[0,1.14,-0.25],36,34,u=>u);
  else if(t<78)shot(t,75,78,[-0.3,1.36,1.15],[-0.2,1.3,0.9],[0,1.18,-0.25],[0,1.18,-0.25],34,34,u=>u);
  else shot(t,78,81,[0,1.18,0.75],[0,1.18,-0.16],[0,1.18,-0.25],[0,1.18,-0.25],35,30,u=>Math.pow(u,3.2));
  setGrade({exp:0.95+ss(80.3,81,t)*1.8,bloomS:0.8,bloomT:0.7,tint:[1.05,1,0.95],vig:0.55,grain:0.05});}
 else if(t<93){setSky([0,0.01,0.015],[0.01,0.03,0.035],0.6,0);sky.visible=true;girlSet({form:1,bright:1.15});floorSet(1,{r:5,glow:1+vox*0.6,grid:1,rip:0.8,ripT:(te%(BEAT*4))});voiceRings(t,te,1,vox*1.2);
  bars.forEach(m=>{m.visible=true;const n=m.userData;const st=81+n.b*BEAT,en=st+n.d*BEAT;const act=t>=st&&t<en?1:0;const past=t>=en?1:0;m.material.opacity=0.15+act*0.9+past*0.25;m.position.z=-2.6+Math.sin(te*0.4+n.b)*0.05});
  if(t<84)shot(t,81,84,[0,1.32,3.2],[0,1.4,1.7],[0,1.3,0],[0,1.38,0],34,32,eo);
  else if(t<87)orbit(t,84,87,[0,0,0],1.25,1.1,0.95,0.45,1.44,1.43,[0,1.39,0],34);
  else if(t<90)shot(t,87,90,[-2.4,0.22,3.1],[-1.7,0.3,3.5],[0,1.05,-0.8],[0,1.1,-0.8],40,40,u=>u);
  else shot(t,90,93,[0,1.5,4.2],[0,5,13],[0,1.0,-0.5],[0,1.0,-0.5],40,44);
  setGrade({bloomS:1.0+vox*0.25,bloomT:0.35,exp:1-ss(92.6,93,t)*0.5,vig:0.45});}
 else if(t<105){const u=seg(93,103.5,t);cityMode({frac:0.5,radius:Math.pow(u,1.6)*230,center:[HERO.x,HERO.z],hero:1,fog:[0.012,0.016,0.03],fogD:0.005});
  setSky([0.0,0.008,0.02],[0.03,0.04,0.07],0.5+u*0.5,0);sky.visible=true;
  streams.visible=true;stU.uA.value=ss(98,103,t);stU.uCenter.value.set(HERO.x,HERO.z);stU.uRadius.value=Math.pow(u,1.6)*230;stU.uTarget.value.set(0,13,0);
  girlSet({form:ss(99,105,t),scale:12,startS:6,alpha:0.9,bright:1.1});floorSet(12,{r:2.2,glow:ss(99,105,t),grid:0.5});
  if(t<99)shot(t,93,99,[-2,1.6,13.6],[-6,10,13.4],[HERO.win[0],HERO.win[1],13.3],[HERO.win[0],16,13.3],38,46,eo);
  else orbit(t,99,105,[0,0,0],120,95,-0.9,-0.5,48,58,[0,10,0],40,42);
  setGrade({bloomS:0.95,bloomT:0.5,flash:Math.max(0,1-(t-93)/0.35)*0.4,vig:0.45});}
 else if(t<129){cityMode({frac:0.45,radius:999,fog:[0.015,0.02,0.04],fogD:0.005});setSky([0.0,0.01,0.03],[0.04,0.05,0.1],1,0.3);sky.visible=true;
  streams.visible=true;stU.uA.value=0.6;stU.uRadius.value=999;crowd.visible=true;crU.uA.value=1;crU.uWarm.value=0;
  girlSet({form:1,scale:12,bright:1.15});floorSet(12,{r:2.2,glow:1+drum*0.6,grid:0.7,rip:1,ripT:(te%BEAT)/BEAT*0.6});voiceRings(t,te,12,vox);lasersOn(te,1,drum);
  const k=Math.floor((t-105)/3),a=105+k*3,b=a+3;
  if(k===0)shot(te,a,b,[0,3,31],[0,4,26],[0,12,0],[0,13,0],46,44,u=>u);
  else if(k===1)orbit(te,a,b,[0,0,0],9.5,8.5,0.55,0.15,17.6,17.4,[0,16.8,0],34);
  else if(k===2)orbit(te,a,b,[0,0,0],12,9,0,0.7,72,64,[0,0,0],50);
  else if(k===3)shot(te,a,b,[-62,31,52],[-56,28,42],[0,12,0],[0,12,0],40,38,u=>u);
  else if(k===4)shot(te,a,b,[-15,1.9,12],[-6,1.9,15],[0,8,0],[0,9,0],46,46,u=>u);
  else if(k===5)shot(te,a,b,[0.5,22,-12],[0.3,21,-9],[0,10,25],[0,10,25],52,50,u=>u);
  else if(k===6)shot(te,a,b,[0,17.5,15],[0,17.2,8.5],[0,16.9,0],[0,16.9,0],30,30,u=>u);
  else shot(te,a,b+1,[26,6,46],[24,6.5,42],[0,12,0],[0,12,0],44,44,u=>u);
  const stop=ss(126.55,127.85,t);setGrade({bloomS:1.05+drum*0.2,bloomT:0.45,sat:1-stop,exp:(1-ss(127.4,127.95,t)),vig:0.45+stop*0.3,grain:0.045+stop*0.05});}
 else if(t<157){const d=ss(129.5,156.3,t);cityMode({frac:0.45*Math.pow(1-d,1.2),radius:999,fog:[0.008,0.011,0.018],fogD:0.006,dead:0.012});setSky([0,0.004,0.01],[0.012,0.016,0.025],0.5*(1-d)+0.15,0);sky.visible=true;
  snow.visible=true;snU.uA.value=0.55;snU.uCam.value.copy(camera.position);snU.uCol.value.set(0.55,0.62,0.7);
  girlSet({form:1,scale:12,scatter:ss(131,156,t)*3.2,alpha:lerp(0.55,0.08,d),bright:0.7,sway:0.4});floorSet(12,{r:2.2,glow:0.3*(1-d),grid:0.3*(1-d)});
  if(t<138.5)shot(t,129,138.5,[85,72,85],[62,46,66],[0,10,0],[0,9,0],40,40,u=>u);
  else if(t<147.5)shot(t,138.5,147.5,[32.5,1.7,96],[32.5,2.4,64],[32.5,24,40],[32.5,30,20],50,50,u=>u);
  else shot(t,147.5,157,[0,40,110],[0,92,175],[0,5,0],[0,0,0],46,46,u=>u);
  setGrade({sat:0.35,tint:[0.85,0.95,1.15],exp:ss(129,130.5,t)*(1-ss(156.2,156.9,t)),bloomS:0.8,bloomT:0.5,vig:0.6,grain:0.06});}
 else if(t<165.2){}
 else if(t<177){cityMode({frac:0,radius:999,hero:1,fog:[0.004,0.005,0.009],fogD:0.008,dead:0.008});setSky([0,0.002,0.006],[0.006,0.008,0.014],0.25,0);sky.visible=true;kid.visible=true;
  fire.visible=true;ffU.uA.value=ss(172.5,173.5,t);ffU.uK.value=ss(173,184,t)*0.25;
  if(t<171)shot(t,165.2,171,[-16,7.2,13.3],[15.5,6.85,13.31],[22,6.8,13.31],[22,6.8,13.31],34,28,u=>u*(2-u));
  else shot(t,171,177,[20.9,6.84,13.36],[21.25,6.82,13.33],[22,6.8,13.31],[22,6.8,13.31],30,28,u=>u);
  setGrade({exp:ss(165.2,166.4,t),bloomS:1.1,bloomT:0.4,vig:0.6,grain:0.06});}
 else if(t<189){const u=seg(177,187.5,t);const rad=Math.pow(u,1.5)*260;cityMode({frac:0.55,radius:rad,center:[HERO.x,HERO.z],hero:1,fog:[0.012,0.016,0.035],fogD:0.0045});
  setSky([0,0.008,0.025],[0.03,0.04,0.08],0.4+u*0.8,ss(183,188,t)*0.6);sky.visible=true;kid.visible=t<179;
  fire.visible=true;ffU.uA.value=1-ss(185,187,t);ffU.uK.value=lerp(0.25,1,ss(177,186,t));
  streams.visible=true;stU.uA.value=ss(179,185,t);stU.uCenter.value.set(HERO.x,HERO.z);stU.uRadius.value=rad;stU.uTarget.value.set(0,13,0);
  crowd.visible=true;crU.uA.value=ss(182,188,t);crU.uWarm.value=0.3;
  girlSet({form:ss(179.5,188.4,t),scale:12,startS:6,bright:1.1+ss(186,189,t)*0.5});floorSet(12,{r:2.2,glow:ss(180,188,t)*1.2,grid:0.7});
  if(t<183)shot(t,177,183,[21.25,6.82,13.33],[-12,30,42],[22,6.8,13.31],[8,10,0],28,44,u=>u*u*(3-2*u));
  else shot(t,183,189,[-12,30,42],[0,9,36],[8,10,0],[0,14,0],44,46);
  setGrade({bloomS:1+ss(185,189,t)*0.6,bloomT:0.45,exp:1+ss(187.6,188.95,t)*2.5,flash:ss(188.4,188.95,t)*0.9,vig:0.45});}
 else if(t<213){barAmt=1-ease(seg(188.8,189.8,t));cityMode({frac:0.62,radius:999,fog:[0.02,0.025,0.05],fogD:0.0045,winI:1.1});setSky([0.0,0.012,0.04],[0.06,0.06,0.12],1.3,0.85);sky.visible=true;
  streams.visible=true;stU.uA.value=1;stU.uRadius.value=999;stU.uTarget.value.set(0,13,0);crowd.visible=true;crU.uA.value=1;crU.uWarm.value=0.45;
  girlSet({form:1,scale:12,bright:1.3});floorSet(12,{r:2.4,glow:1.3+drum*0.8,grid:0.8,rip:1.3,ripT:(te%BEAT)/BEAT*0.6});voiceRings(t,te,12,vox*1.2);lasersOn(te,1.3,drum);
  const k=Math.floor((t-189)/3),a=189+k*3,b=a+3;
  if(k===0)shot(t,a,b,[0,2.4,33],[0,3.6,27],[0,13,0],[0,14,0],50,46,u=>u);
  else if(k===1)orbit(t,a,b,[0,0,0],8.5,7.6,-0.65,-0.2,17.9,17.5,[0,16.9,0],33);
  else if(k===2)orbit(t,a,b,[0,0,0],13,9,1.0,1.6,82,62,[0,0,0],52);
  else if(k===3)shot(t,a,b,[15,1.9,14],[5,1.9,17],[0,9,0],[0,10,0],46,46,u=>u);
  else if(k===4)shot(t,a,b,[-165,52,165],[-140,45,140],[0,10,0],[0,11,0],34,34,u=>u);
  else if(k===5)shot(t,a,b,[3.2,19,-8.5],[2.2,18.4,-6.2],[0,8,30],[0,8,30],52,52,u=>u);
  else if(k===6)shot(t,a,b,[0,4,23],[0,21,20],[0,15,0],[0,16,0],42,42);
  else shot(t,a,b,[0,17.5,32],[0,17.1,4.2],[0,17,0],[0,17,0],36,28,u=>u*u*u);
  setGrade({bloomS:1.1+drum*0.3+hit*0.5,bloomT:0.45,flash:Math.max(0,1-(t-189)/0.7)*0.9+ss(212.5,213,t)*0.9,sat:1.1,tint:[1.04,1,0.97],vig:0.4});}
 else if(t<220.6){barAmt=ease(seg(218,220.4,t));cityMode({frac:0.62,radius:999,fog:[0.02,0.025,0.05],fogD:0.0045,winI:1.15});setSky([0.0,0.012,0.04],[0.06,0.06,0.12],1.5+ss(213,217,t),1);sky.visible=true;
  streams.visible=true;stU.uA.value=1-ss(214,218,t)*0.6;crowd.visible=true;crU.uA.value=1;crU.uWarm.value=0.6;
  girlSet({form:1,scale:12,burst:eo(seg(213,219.5,t))*9,bright:1.5,alpha:1-ss(217,220,t)*0.6});
  shot(t,213,220.6,[0,17.2,5],[0,9,46],[0,17,0],[0,46,0],34,52,eo);
  setGrade({flash:Math.max(0,1-(t-213)/1.4)*1,bloomS:1.3,bloomT:0.4,exp:1-ss(219.4,220.5,t),vig:0.45});}
 else if(t<237.6){}
 else{setSky([0,0.004,0.008],[0.004,0.01,0.014],0.4,0);sky.visible=true;girlSet({form:1,alpha:0.75,bright:0.9,scatter:ss(242.6,246.5,t)*1.6,sway:0.6});floorSet(1,{r:4,glow:0.5,grid:0.5});voiceRings(t,te,1,vox*1.1);
  shot(t,237.6,247,[0.35,1.3,3.4],[0.1,1.36,2.4],[0,1.15,0],[0,1.28,0],34,32,u=>u);
  setGrade({exp:ss(237.6,238.8,t)*(1-ss(244.8,246.6,t)),bloomS:1,bloomT:0.35,vig:0.55});}
 PX.value=H/(2*Math.tan(camera.fov*Math.PI/360));
 cityU.uCam.value.copy(camera.position);
 return te;
}
async function init(){await document.fonts.load(`300 30px ${SERIF}`,'无喉之歌');await document.fonts.load(`600 30px ${SERIF}`,'无喉之歌');await document.fonts.load(`20px ${SANS}`,'她');await document.fonts.load(`20px ${JP}`,'声');
 await buildPanels();buildTitle();window.READY=true}
window.renderAt=(t,q=0.92)=>{direct(t);composer.render();ctx.globalAlpha=1;ctx.filter='none';ctx.drawImage(glc,0,0);drawOverlay(t);return out.toDataURL('image/jpeg',q)};
init();
