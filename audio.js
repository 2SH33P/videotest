const fs=require('fs');const TL=require('./tl.js');
const SR=44100,DUR=TL.DUR,N=Math.ceil(SR*DUR),B=TL.BEAT,FPS=TL.FPS;
let seed=39;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const rr=(a,b)=>a+(b-a)*rand();const mtof=m=>440*Math.pow(2,(m-69)/12);const TAU=Math.PI*2;
const Bus=()=>[new Float32Array(N),new Float32Array(N)];
const M=Bus(),MS=Bus(),S=Bus(),SS=Bus();
const NF=Math.ceil(DUR*FPS)+2;const voxE=new Float64Array(NF),drumE=new Float64Array(NF),hitE=new Float64Array(NF);
function placeST(L,R,t0,{gain=1,send=0,bus='M',track=null}={}){
 const s0=Math.round(t0*SR),D=bus==='M'?M:S,Sd=bus==='M'?MS:SS;
 for(let i=0;i<L.length;i++){const n=s0+i;if(n<0||n>=N)continue;const l=L[i]*gain,r=R[i]*gain;D[0][n]+=l;D[1][n]+=r;if(send){Sd[0][n]+=l*send;Sd[1][n]+=r*send}
  if(track){track[Math.floor(n/SR*FPS)]+=(l*l+r*r)*0.5}}
}
function place(buf,t0,{gain=1,pan=0,send=0,bus='M',track=null}={}){
 const a=(Math.max(-1,Math.min(1,pan))+1)*Math.PI/4,gl=Math.cos(a)*1.4142,gr=Math.sin(a)*1.4142;
 const L=new Float32Array(buf.length),R=new Float32Array(buf.length);for(let i=0;i<buf.length;i++){L[i]=buf[i]*gl;R[i]=buf[i]*gr}
 placeST(L,R,t0,{gain,send,bus,track});
}
function polyblep(t,dt){if(t<dt){t/=dt;return t+t-t*t-1}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1}return 0}
class SVF{constructor(){this.ic1=0;this.ic2=0;this.set(1000,0)}
 set(fc,res){const g=Math.tan(Math.PI*Math.min(Math.max(fc,10),SR*0.45)/SR);this.k=2-2*Math.min(res,0.98);this.a1=1/(1+g*(g+this.k));this.a2=g*this.a1;this.a3=g*this.a2}
 run(x){const v3=x-this.ic2,v1=this.a1*this.ic1+this.a2*v3,v2=this.ic2+this.a2*this.ic1+this.a3*v3;this.ic1=2*v1-this.ic1;this.ic2=2*v2-this.ic2;this.bp=v1;this.hp=x-this.k*v1-v2;return v2}}
class Reso{constructor(){this.y1=0;this.y2=0}set(f,bw){const r=Math.exp(-Math.PI*bw/SR),th=TAU*Math.min(f,SR*0.45)/SR;this.a1=2*r*Math.cos(th);this.a2=-r*r;this.b0=(1-r)*Math.sqrt(1-2*r*Math.cos(2*th)+r*r)}
 run(x){const y=this.b0*x+this.a1*this.y1+this.a2*this.y2;this.y2=this.y1;this.y1=y;return y}}
const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
function envAR(t,att,dur,rel){if(t<0)return 0;if(t<att)return sm(t/att);if(t<dur)return 1;return Math.max(0,1-(t-dur)/rel)**2}
function pad(t0,dur,notes,{vol=0.1,fc=1200,fc1=null,att=1.2,rel=2,det=14,voices=4,res=0.1,send=0.5,bus='M',vib=0,spread=0.8}={}){
 const len=Math.round((dur+rel)*SR),L=new Float32Array(len),R=new Float32Array(len);
 for(const m of notes)for(let v=0;v<voices;v++){
  const f=mtof(m)*Math.pow(2,rr(-det,det)/1200);let ph=rand();const pan=rr(-spread,spread),gl=Math.cos((pan+1)*Math.PI/4),gr=Math.sin((pan+1)*Math.PI/4);
  const flt=new SVF(),vp=rand()*TAU,vr=rr(4.6,5.6),g=vol/Math.sqrt(voices*notes.length)*1.6;
  for(let i=0;i<len;i++){const tt=i/SR;if((i&31)===0){const fcc=(fc1!=null?fc+(fc1-fc)*Math.min(1,tt/dur):fc)*(1+0.12*Math.sin(tt*0.6+v*1.7));flt.set(fcc,res)}
   const dt=f*(1+vib*Math.sin(TAU*vr*tt+vp))/SR;ph+=dt;if(ph>=1)ph-=1;const x=2*ph-1-polyblep(ph,dt);
   const o=flt.run(x)*envAR(tt,att,dur,rel)*g;L[i]+=o*gl;R[i]+=o*gr}}
 placeST(L,R,t0,{send,bus});
}
function piano(t0,m,{vel=0.6,dur=3,pan=null,send=0.35,bus='M',gain=0.22}={}){
 const f=mtof(m),len=Math.round((dur+1.8)*SR),buf=new Float32Array(len);
 for(let k=1;k<=12;k++){const fk=f*k*Math.sqrt(1+0.00035*k*k);if(fk>SR/2.3)break;const amp=Math.pow(k,-1.25)*(k<4?1:vel+0.2);const dec=0.5+k*0.45+f/700;
  for(const dd of [1,1.0007]){const w=TAU*fk*dd/SR;let s=0,c=1;const cw=Math.cos(w),sw=Math.sin(w);
   for(let i=0;i<len;i++){const tt=i/SR;const e=Math.exp(-tt*dec*(tt<dur?1:5))*Math.min(1,tt*400);buf[i]+=s*amp*e*0.5;const ns=s*cw+c*sw;c=c*cw-s*sw;s=ns}}}
 const lp=new SVF();lp.set(2500,0);for(let i=0;i<0.012*SR;i++){buf[i]+=lp.run(rr(-1,1))*0.15*Math.exp(-i/SR*300)}
 place(buf,t0,{gain:gain*vel,pan:pan??(m-64)/36,send,bus});
}
function bell(t0,m,{vol=0.08,dur=2.5,pan=0,send=0.6,bus='M'}={}){const f=mtof(m),len=Math.round(dur*SR),b=new Float32Array(len);
 for(let i=0;i<len;i++){const t=i/SR;const I=2.2*Math.exp(-t*6);b[i]=Math.sin(TAU*f*t+I*Math.sin(TAU*f*4*t))*Math.exp(-t*2.4)*Math.min(1,t*800)+0.3*Math.sin(TAU*f*2*t)*Math.exp(-t*4)}
 place(b,t0,{gain:vol,pan,send,bus})}
function pluck(t0,m,{vol=0.07,dur=0.5,pan=0,send=0.3,cut=3500,bus='M'}={}){const f=mtof(m),len=Math.round((dur+0.3)*SR),b=new Float32Array(len),fl=new SVF();let p1=0,p2=0.25;
 for(let i=0;i<len;i++){const t=i/SR;if((i&15)===0)fl.set(250+cut*Math.exp(-t*14),0.35);const dt=f/SR;p1=(p1+dt)%1;p2=(p2+dt*1.004)%1;const x=(2*p1-1-polyblep(p1,dt))+(2*p2-1-polyblep(p2,dt*1.004));b[i]=fl.run(x)*envAR(t,0.003,dur,0.25)}
 place(b,t0,{gain:vol,pan,send,bus})}
function bass(t0,m,dur,{vol=0.22,send=0.05}={}){const f=mtof(m),len=Math.round((dur+0.2)*SR),b=new Float32Array(len),fl=new SVF();fl.set(260,0.2);let p=0;
 for(let i=0;i<len;i++){const t=i/SR;const dt=f/SR;p=(p+dt)%1;const x=Math.sin(TAU*p)+0.5*fl.run(2*p-1-polyblep(p,dt));b[i]=Math.tanh(x*1.4)*envAR(t,0.01,dur,0.15)}
 place(b,t0,{gain:vol,send})}
function kick(t0,{vol=0.6,send=0.1}={}){const len=0.6*SR,b=new Float32Array(len);let ph=0;for(let i=0;i<len;i++){const t=i/SR;const f=45+110*Math.exp(-t*28);ph+=f/SR;b[i]=Math.tanh(2*Math.sin(TAU*ph))*Math.exp(-t*6)+(i<200?rr(-0.5,0.5)*Math.exp(-i/40):0)}
 place(b,t0,{gain:vol,send,track:drumE});}
function snare(t0,{vol=0.35,send=0.3}={}){const len=0.5*SR,b=new Float32Array(len),hp=new SVF();hp.set(1500,0.1);let ph=0;for(let i=0;i<len;i++){const t=i/SR;ph+=190/SR;hp.run(rr(-1,1));b[i]=0.5*Math.sin(TAU*ph)*Math.exp(-t*25)+hp.hp*Math.exp(-t*13)*0.8}
 place(b,t0,{gain:vol,send,track:drumE})}
function hat(t0,{vol=0.06,open=0,pan=0.3}={}){const len=0.3*SR,b=new Float32Array(len),hp=new SVF();hp.set(8000,0.2);for(let i=0;i<len;i++){const t=i/SR;hp.run(rr(-1,1));b[i]=hp.hp*Math.exp(-t*(open?9:45))}
 place(b,t0,{gain:vol,pan,send:0.15})}
function taiko(t0,{vol=0.5,f=70,send=0.45,pan=0}={}){const len=2*SR,b=new Float32Array(len),lp=new SVF();lp.set(600,0.1);let ph=0;for(let i=0;i<len;i++){const t=i/SR;ph+=(f*0.75+f*0.5*Math.exp(-t*12))/SR;b[i]=Math.tanh(1.6*Math.sin(TAU*ph))*Math.exp(-t*3.2)+lp.run(rr(-1,1))*Math.exp(-t*18)*0.8}
 place(b,t0,{gain:vol,pan,send,track:drumE})}
function boom(t0,{vol=0.7,dur=4,f0=120,f1=26,send=0.5,bus='S'}={}){const len=dur*SR,b=new Float32Array(len),lp=new SVF();lp.set(300,0.1);let ph=0;for(let i=0;i<len;i++){const t=i/SR;ph+=(f1+(f0-f1)*Math.exp(-t*3))/SR;b[i]=Math.tanh(1.5*Math.sin(TAU*ph))*Math.exp(-t*1.3)+lp.run(rr(-1,1))*Math.exp(-t*5)*1.2}
 place(b,t0,{gain:vol,send,bus,track:hitE})}
function braaam(t0,root,{vol=0.5,dur=5.5,major=0,bus='S'}={}){const notes=[root-12,root,root+7,root+12,root+(major?16:15)],len=Math.round(dur*SR),L=new Float32Array(len),R=new Float32Array(len);
 notes.forEach((m,k)=>{for(let v=0;v<3;v++){const f=mtof(m)*Math.pow(2,rr(-18,18)/1200);let ph=rand();const fl=new SVF(),pan=rr(-0.7,0.7),gl=Math.cos((pan+1)*Math.PI/4),gr=Math.sin((pan+1)*Math.PI/4);
  for(let i=0;i<len;i++){const t=i/SR;if((i&31)===0)fl.set(120+2600*Math.min(1,t/0.12)*Math.exp(-t*0.9)+150,0.25);const dt=f/SR;ph+=dt;if(ph>=1)ph-=1;const x=fl.run(2*ph-1-polyblep(ph,dt));const e=Math.min(1,t/0.04)*Math.exp(-t*0.75)*(1-Math.max(0,(t-dur+0.6)/0.6));const o=Math.tanh(x*3)*e*0.16*(k<2?1.3:0.8);L[i]+=o*gl;R[i]+=o*gr}}});
 let ph=0;for(let i=0;i<len;i++){const t=i/SR;ph+=(mtof(root-24)*(1+0.5*Math.exp(-t*4)))/SR;const s=Math.sin(TAU*ph)*Math.exp(-t*0.6)*0.5*Math.min(1,(len-i)/(0.3*SR));L[i]+=s;R[i]+=s}
 placeST(L,R,t0,{gain:vol,send:0.45,bus,track:hitE})}
function riser(t0,t1,{vol=0.25,f0=200,f1=7000,bus='S',send=0.4}={}){const len=Math.round((t1-t0)*SR),L=new Float32Array(len),R=new Float32Array(len),fa=new SVF(),fb=new SVF();let ph=0;
 for(let i=0;i<len;i++){const u=i/len;if((i&31)===0){const fc=f0*Math.pow(f1/f0,u*u);fa.set(fc,0.7);fb.set(fc*1.07,0.7)}fa.run(rr(-1,1));fb.run(rr(-1,1));ph+=(110*Math.pow(8,u*u))/SR;const e=Math.pow(u,2.2)*Math.min(1,(len-i)/400);const s=0.25*Math.sin(TAU*ph);L[i]=(fa.bp+s)*e;R[i]=(fb.bp+s)*e}
 placeST(L,R,t0,{gain:vol,send,bus})}
function revcym(t0,t1,{vol=0.2}={}){const len=Math.round((t1-t0)*SR),L=new Float32Array(len),R=new Float32Array(len),a=new SVF(),b=new SVF();a.set(5000,0.1);b.set(5200,0.1);
 for(let i=0;i<len;i++){const u=i/len;a.run(rr(-1,1));b.run(rr(-1,1));const e=Math.pow(u,3.5)*Math.min(1,(len-i)/300);L[i]=a.hp*e;R[i]=b.hp*e}placeST(L,R,t0,{gain:vol,send:0.3,bus:'S'})}
function whoosh(t0,dur,{vol=0.18,p0=-1,p1=1}={}){const len=Math.round(dur*SR),b=new Float32Array(len),fl=new SVF();
 for(let i=0;i<len;i++){const u=i/len;if((i&31)===0)fl.set(300+2600*Math.sin(Math.PI*u)**2,0.55);fl.run(rr(-1,1));b[i]=fl.bp*Math.sin(Math.PI*u)**2}
 const L=new Float32Array(len),R=new Float32Array(len);for(let i=0;i<len;i++){const p=p0+(p1-p0)*i/len,a=(p+1)*Math.PI/4;L[i]=b[i]*Math.cos(a);R[i]=b[i]*Math.sin(a)}placeST(L,R,t0,{gain:vol,send:0.25,bus:'S'})}
function click(t0,{vol=0.12,pan=0,big=0}={}){const len=0.08*SR,b=new Float32Array(len),fl=new SVF();fl.set(rr(1800,4200),0.6);let ph=0;
 for(let i=0;i<len;i++){const t=i/SR;fl.run(rr(-1,1));ph+=(big?140:200)/SR;b[i]=fl.bp*Math.exp(-t*(big?220:380))*2+Math.sin(TAU*ph)*Math.exp(-t*70)*0.5}place(b,t0,{gain:vol*(big?1.6:1),pan,send:0.08,bus:'S'})}
function tick(t0,{vol=0.1,hi=1}={}){const len=0.1*SR,b=new Float32Array(len),fl=new SVF();fl.set(hi?3600:2700,0.85);let ph=0;
 for(let i=0;i<len;i++){const t=i/SR;fl.run(i<60?rr(-1,1):0);ph+=1250/SR;b[i]=fl.bp*Math.exp(-t*90)*3+Math.sin(TAU*ph)*Math.exp(-t*160)*0.3}place(b,t0,{gain:vol,pan:hi?0.15:-0.15,send:0.3,bus:'S'})}
function noiseBed(t0,t1,{vol=0.05,kind='rain',envf=null}={}){const len=Math.round((t1-t0)*SR),L=new Float32Array(len),R=new Float32Array(len);const fa=[new SVF(),new SVF()],fb=[new SVF(),new SVF()];
 fa[0].set(kind==='rain'?4500:600,0.1);fa[1].set(kind==='rain'?4700:650,0.1);fb[0].set(500,0);fb[1].set(520,0);
 for(let i=0;i<len;i++){const t=i/SR,u=i/len;if(kind==='wind'&&(i&63)===0){const c1=380+300*Math.sin(t*0.37)+200*Math.sin(t*0.91+1),c2=420+300*Math.sin(t*0.29+2)+200*Math.sin(t*0.83);fa[0].set(c1,0.75);fa[1].set(c2,0.75)}
  const e=(envf?envf(t,u):1)*Math.min(1,t/1.5,(t1-t0-t)/1.5);
  for(let c=0;c<2;c++){let x=rr(-1,1);if(kind==='rain'&&rand()<0.0009)x*=14;const y=fa[c].run(x);const o=kind==='rain'?(y-fb[c].run(y)):fa[c].bp*(1+0.6*Math.sin(t*(0.5+c*0.13)));(c?R:L)[i]=o*e}}
 placeST(L,R,t0,{gain:vol,send:kind==='wind'?0.3:0.1,bus:'S'})}
function sine(t0,dur,f,{vol=0.1,att=0.02,rel=0.05,pan=0,send=0.1,bus='S',wob=null}={}){const len=Math.round((dur+rel)*SR),b=new Float32Array(len);let ph=0;
 for(let i=0;i<len;i++){const t=i/SR;ph+=f*(wob?1+wob(t):1)/SR;b[i]=Math.sin(TAU*ph)*envAR(t,att,dur,rel)}place(b,t0,{gain:vol,pan,send,bus})}
function sparkle(t0,t1,dens,scale,{vol=0.035}={}){for(let t=t0;t<t1;){const u=(t-t0)/(t1-t0);t+=rr(0.02,0.25)/(dens*(0.3+u));const m=scale[Math.floor(rand()*scale.length)]+12*Math.floor(rr(0,2));bell(t,m,{vol:vol*rr(0.4,1),dur:1.4,pan:rr(-0.9,0.9),send:0.7})}}
function hum(t0,t1,{vol=0.02}={}){const len=Math.round((t1-t0)*SR),b=new Float32Array(len);for(let i=0;i<len;i++){const t=i/SR;b[i]=(Math.sin(TAU*50*t)+0.5*Math.sin(TAU*100*t)+0.25*Math.sin(TAU*150*t)+0.1*rr(-1,1))*Math.min(1,t/0.5,(t1-t0-t)/0.5)}place(b,t0,{gain:vol,bus:'S'})}
function crowd(t0,t1,envf,{vol=0.12}={}){const len=Math.round((t1-t0)*SR),L=new Float32Array(len),R=new Float32Array(len);const bands=[350,700,1300,2400,3600];
 for(let c=0;c<2;c++){const fs=bands.map(f=>{const s=new SVF();s.set(f*rr(0.9,1.1),0.35);return s});const am=bands.map(()=>[rand()*9,rr(1.5,5)]);const out=c?R:L;
  for(let i=0;i<len;i++){const t=i/SR;const e=envf(t);if(e<=0.0001)continue;let o=0;for(let k=0;k<fs.length;k++){fs[k].run(rr(-1,1));o+=fs[k].bp*(0.6+0.4*Math.sin(t*am[k][1]+am[k][0]))*(k<3?1:0.6)}out[i]=o*e}}
 for(let t=0;t<t1-t0;t+=rr(0.05,0.4)){const e=envf(t);if(e<0.5||rand()>e)continue;const f=rr(500,1100),d=rr(0.4,1.1);sine(t0+t,d,f,{vol:0.012*e,att:0.1,rel:0.2,pan:rr(-1,1),send:0.6,wob:x=>0.25*Math.min(1,x/0.3)+0.02*Math.sin(x*30)})}
 placeST(L,R,t0,{gain:vol,send:0.5,bus:'S'})}
const VOW={a:[[800,1220,2800,3600,4600],[1,.6,.36,.2,.1]],i:[[300,2450,3150,3800,4700],[1,.32,.32,.2,.1]],u:[[340,1350,2500,3600,4600],[1,.38,.22,.12,.07]],
 e:[[480,2050,2800,3700,4700],[1,.52,.34,.2,.1]],o:[[500,880,2700,3600,4600],[1,.62,.22,.12,.07]],M:[[270,1000,2300,3400,4400],[1,.1,.04,.02,.01]],N:[[280,1700,2600,3500,4500],[1,.14,.06,.03,.02]]};
const BW=[75,95,140,190,250];
const CONS={k:{p:1,fc:2300,cd:0.045,nz:0.5},g:{p:1,fc:2000,cd:0.035,nz:0.25,vz:0.2},t:{p:1,fc:4300,cd:0.04,nz:0.45},tt:{p:1,fc:4300,cd:0.13,nz:0.45},d:{p:1,fc:3800,cd:0.03,nz:0.22,vz:0.2},
 s:{f:1,fc:7200,cd:0.09,nz:0.32},sh:{f:1,fc:3300,cd:0.1,nz:0.34},z:{f:1,fc:6800,cd:0.07,nz:0.2,vz:0.3},
 n:{nas:'N',cd:0.06},m:{nas:'M',cd:0.06},r:{tap:1,cd:0.03},w:{gl:[[320,720,2500,3500,4500],[1,.4,.15,.08,.05]],cd:0.0},y:{gl:[[290,2300,3000,3700,4600],[1,.3,.25,.15,.08]],cd:0}};
function split(s){if(s==='M'||s==='N')return['',s];const v=s.slice(-1);return[s.slice(0,-1),v]}
function mkTrack(pts){pts.sort((a,b)=>a[0]-b[0]);let i=0;return t=>{while(i<pts.length-1&&pts[i+1][0]<=t)i++;const a=pts[i],b=pts[i+1];if(!b||t<=a[0])return a[1];const u=(t-a[0])/(b[0]-a[0]||1);return typeof a[1]==='number'?a[1]+(b[1]-a[1])*u:a[1].map((x,k)=>x+(b[1][k]-x)*u)}}
function voice(notes,{fs=1.07,breath=0.035,vib=0.32,vibRate=5.7,glide=0.04,att=0.04,rel=0.1,jitter=0,tilt=0.55,detune=0,dyn=1}={}){
 const T0=notes[0].t-0.3,last=notes[notes.length-1],T1=last.t+last.d+rel+0.3,len=Math.round((T1-T0)*SR),buf=new Float32Array(len);
 const A=[[0,0]],P=[],F=[],NZ=[[0,0]],NFc=[[0,3000]],VB=[[0,0]];
 const fv=v=>[VOW[v][0].map(x=>x*fs),VOW[v][1]].flat();
 notes.forEach((n,idx)=>{const t=n.t-T0,e=t+n.d,[c,v]=split(n.s),V=fv(v),C=CONS[c]||{cd:0},prev=notes[idx-1],next=notes[idx+1];
  const fromL=prev&&(n.t-(prev.t+prev.d))<0.03,toL=next&&(next.t-(n.t+n.d))<0.03;const cd=C.cd||0;const voicedC=C.nas||C.tap||C.gl;const tp=voicedC?t-cd:t;
  const lv=(n.v||1)*dyn;
  if(fromL){P.push([tp-0.002,prev.m]);P.push([tp+glide,n.m])}else{P.push([tp-0.06,n.m-0.6]);P.push([tp+0.06,n.m])}
  P.push([e-0.003,n.m]);
  if(n.d>0.45){VB.push([t,0]);VB.push([t+0.22,0]);VB.push([t+Math.min(0.7,n.d*0.7),vib]);VB.push([e-0.01,vib*1.1]);VB.push([e+0.02,0])}
  const prevV=prev?fv(split(prev.s)[1]):V;
  if(C.nas){const Nf=fv(C.nas);F.push([t-cd-0.012,fromL?prevV:Nf]);F.push([t-cd,Nf]);F.push([t-0.004,Nf]);}
  else if(C.tap){F.push([t-cd-0.01,fromL?prevV:V]);const tf=[350*fs,1550*fs,2500*fs,3500*fs,4500*fs,...V.slice(5)];F.push([t-0.015,tf]);}
  else if(C.gl){const gf=[C.gl[0].map(x=>x*fs),C.gl[1]].flat();F.push([t-0.01,fromL?prevV:gf]);F.push([t,gf]);}
  else{F.push([t-0.002,fromL?prevV:V])}
  F.push([t+0.06,V]);F.push([e-0.004,V]);
  if(C.p){if(fromL){A.push([t-cd-0.006,lv]);A.push([t-cd,C.vz||0])}else A.push([t-cd,0]);A.push([t-0.002,C.vz||0]);A.push([t+0.014,lv]);
   NZ.push([t-0.012,0]);NZ.push([t-0.008,C.nz]);NZ.push([t+0.012,C.nz*0.35]);NZ.push([t+0.035,0]);NFc.push([t-0.013,C.fc]);NFc.push([t+0.036,C.fc]);}
  else if(C.f){if(fromL){A.push([t-cd-0.01,lv]);A.push([t-cd+0.01,C.vz||0])}else A.push([t-cd,0]);A.push([t-0.006,C.vz||0]);A.push([t+0.025,lv]);
   NZ.push([t-cd,0]);NZ.push([t-cd+0.02,C.nz]);NZ.push([t-0.01,C.nz]);NZ.push([t+0.008,0]);NFc.push([t-cd-0.001,C.fc]);NFc.push([t+0.01,C.fc]);}
  else if(C.nas){if(!fromL)A.push([t-cd-att,0]);else A.push([t-cd-0.01,lv]);A.push([t-cd,0.5*lv]);A.push([t,0.55*lv]);A.push([t+0.03,lv])}
  else if(C.tap){A.push([t-cd,lv*(fromL?1:0)]);A.push([t-0.015,0.55*lv]);A.push([t+0.015,lv])}
  else{if(!fromL){A.push([t-att,0]);A.push([t,lv])}else{A.push([t-0.01,lv*0.97]);A.push([t+0.02,lv])}}
  if(n.d>1)A.push([t+n.d*0.6,lv*1.08]);
  if(!toL){A.push([e-0.005,lv]);A.push([e+rel,0])}else A.push([e-0.012,lv]);
 });
 const fA=mkTrack(A),fP=mkTrack(P),fF=mkTrack(F),fN=mkTrack(NZ),fNF=mkTrack(NFc),fV=mkTrack(VB);
 const R=[0,1,2,3,4].map(()=>new Reso()),nr=new Reso();let ph=0,vph=0,lp=0,jit=0,jt=0,aPrev=0;const BL=16;let aCur=0,f0=440,G=[1,1,1,1,1],nzA=0;
 for(let i=0;i<len;i++){const t=i/SR;
  if(i%BL===0){aPrev=aCur;aCur=fA(t);const fm=fF(t);for(let k=0;k<5;k++){R[k].set(fm[k],BW[k]*(fm[k]/1000*0.15+0.85));G[k]=fm[5+k]}
   if(jitter){jt+=(rr(-1,1)-jt*0.02)*0.05;jit=jt*jitter}
   const vd=fV(t);vph+=TAU*vibRate*BL/SR*(1+0.1*Math.sin(t*1.3));f0=mtof(fP(t)+detune+jit+vd*Math.sin(vph));nzA=fN(t);nr.set(fNF(t),2500)}
  const a=aPrev+(aCur-aPrev)*(i%BL)/BL;const dt=f0/SR;ph+=dt;if(ph>=1)ph-=1;
  let s=-(2*ph-1-polyblep(ph,dt));lp+=tilt*(s-lp);let src=lp*0.85+s*0.15;src+=rr(-1,1)*breath*(ph<0.5?1.6:0.4);
  let o=0;for(let k=0;k<5;k++)o+=R[k].run(src)*G[k];
  const nz=nr.run(rr(-1,1))*nzA*2.5;
  buf[i]=o*a*4+nz+rr(-1,1)*a*breath*0.15;
 }
 let pk=0;for(let i=0;i<len;i++)pk=Math.max(pk,Math.abs(buf[i]));for(let i=0;i<len;i++)buf[i]/=pk||1;
 return {t0:T0,buf};
}
function sing(notes,{gain=0.32,send=0.3,echo=0.16,track=true,vopt={}}={}){const {t0,buf}=voice(notes,vopt);const len=buf.length+Math.round(1.8*SR);
 const L=new Float32Array(len),R=new Float32Array(len);const d1=Math.round(B*0.75*SR),d2=Math.round(B*1.5*SR);
 for(let i=0;i<buf.length;i++){L[i]+=buf[i];R[i]+=buf[i]}
 if(echo)for(let i=0;i<len;i++){const x1=i-d1>=0&&i-d1<buf.length?buf[i-d1]:0,x2=i-d2>=0&&i-d2<buf.length?buf[i-d2]:0;L[i]+=x1*echo;R[i]+=x2*echo}
 placeST(L,R,t0,{gain,send,track:track?voxE:null});return {t0,buf}}
const THEME=[[[69,1,'ko'],[74,.5,'e'],[76,.5,'wo'],[77,1,'ka'],[76,.5,'shi'],[74,.5,'te']],[[74,1.5,'a'],[72,.5,'na'],[74,1,'ta'],[77,1,'no']],
 [[72,1,'u'],[69,.5,'ta'],[72,.5,'ni'],[77,1.5,'na'],[76,.5,'ru']],[[76,3,'yo'],[null,1]],[[69,1,'wa'],[74,.5,'su'],[76,.5,'re'],[77,1,'na'],[79,.5,'i'],[81,.5,'de']],
 [[81,1.5,'me'],[79,.5,'ro'],[77,1,'di'],[74,1,'i']],[[76,1,'zu'],[79,1,'tto'],[77,.5,'ko'],[76,.5,'ko'],[72,1,'ni']],[[76,1,'i'],[74,3,'ru']]];
function themeNotes(t0,bars,{tr=0,beat=B,syl=null}={}){const out=[];bars.forEach((bi,k)=>{let t=t0+k*4*beat;for(const [m,d,s] of THEME[bi]){if(m!=null)out.push({t,d:d*beat,m:m+tr,s:syl||s});t+=d*beat}});return out}
const CH={Dm:[38,[50,53,57,62]],Bb:[34,[46,50,53,58]],F:[41,[48,53,57,60]],C:[36,[48,52,55,60]],Gm:[43,[50,55,58,62]],A:[45,[49,52,57,61]],
 Em:[40,[52,55,59,64]],G:[43,[50,55,59,62]],D:[38,[50,54,57,62]],B:[35,[47,51,54,59]],Bsus:[35,[47,52,54,59]],E:[40,[52,56,59,64]]};
const prog=(t0,names,fn)=>names.forEach((n,k)=>fn(t0+k*TL.BAR,CH[n],n,k));
function choir(t0,dur,midis,{vol=0.05,vowel='a',att=0.6,rel=1.2,send=0.75}={}){for(const m of midis)for(let v=0;v<3;v++){const r=voice([{t:t0+rr(0,0.08),d:dur,m,s:vowel}],{vib:rr(0.12,0.25),vibRate:rr(4.6,5.8),detune:rr(-0.1,0.1),att,rel,breath:0.06,fs:m<60?0.92:1.02});
 place(r.buf,r.t0,{gain:vol/Math.sqrt(midis.length),pan:rr(-0.85,0.85),send})}}
noiseBed(0,8,{vol:0.012,kind:'wind'});
{const T=TL.typeInit;for(let i=0;i<T.text.length;i++)click(T.t+i*T.dt,{vol:0.09,pan:rr(-0.2,0.2)});click(T.t+T.text.length*T.dt+0.25,{big:1,vol:0.12})}
sine(3,5,440,{vol:0.07,att:0.4,rel:0.02,send:0.2,wob:t=>0.004*Math.sin(t*TAU*3)*Math.min(1,t/4)+0.02*Math.max(0,t-3.5)**2*Math.sin(t*TAU*7)});
sine(3,5,880,{vol:0.012,att:1,rel:0.02,send:0.3});hum(3,20,{vol:0.012});
riser(5,8,{vol:0.22});revcym(6.2,8,{vol:0.25});
braaam(8,38,{vol:0.55,dur:6});boom(8,{vol:0.65});
prog(8,['Dm','Dm','Bb'],(t,c)=>pad(t,3.4,c[1].map(x=>x-12),{vol:0.08,fc:500,att:1,rel:2,send:0.4}));
for(let t=9.5,k=0;t<17.9;t+=B/2,k++)pluck(t,38+(k%4===3?7:0),{vol:0.06,cut:900,dur:0.25,send:0.15});
for(let t=10;t<18;t+=B){if(rand()<0.6)click(t+rr(0,0.3),{vol:0.025,pan:rr(-1,1)})}
[10,12.5,15,17.4].forEach((t,k)=>whoosh(t-0.6,1.3,{vol:0.13,p0:k%2?1:-1,p1:k%2?-1:1}));
riser(16.5,19.85,{vol:0.3,f0:300,f1:10000});revcym(18.2,19.85,{vol:0.3});whoosh(18,1.85,{vol:0.22,p0:0,p1:0});
braaam(20,38,{vol:0.7,dur:7});boom(20,{vol:0.8,dur:5});taiko(20,{vol:0.5,f:55});
pad(20.05,6,[62,69,74,77,81],{vol:0.05,fc:3000,att:0.8,rel:3,send:0.8,vib:0.003});
sparkle(20.5,25,3,[74,77,81,84,86],{vol:0.025});
piano(27.6,62,{vel:0.5,dur:4,send:0.6});piano(29.4,57,{vel:0.35,dur:4,send:0.6});sine(27.5,5,1174.7,{vol:0.006,att:2,rel:1,send:0.6});
prog(33,['Dm','Bb','F','C','Dm','Bb'],(t,c,n,k)=>{pad(t,3.05,c[1],{vol:0.075,fc:900+k*150,att:1.4,rel:2.2,send:0.6,vib:0.002});
 const ar=[c[1][0]+24,c[1][2]+12,c[1][1]+24,c[1][3]+12];for(let b=0;b<4;b++)if(k>0||b>1)bell(t+b*B,ar[b],{vol:0.04+k*0.006,pan:(b-1.5)*0.4,send:0.7});
 if(k>=2)pad(t,3.05,[c[0]],{vol:0.06,fc:350,att:1,rel:1.5,send:0.3})});
sparkle(36,49.5,1.2,[74,77,79,81,84],{vol:0.03});riser(44,50,{vol:0.08,f0:2000,f1:12000});
{const r=voice([{t:52,d:2.2,m:74,s:'a'}],{vib:0.2});const b=r.buf;let held=0;const ch=Math.round(0.06*SR);
 for(let i=0;i<b.length;i++){const tt=r.t0+i/SR-52;if(tt>0.35){if(i%ch===0)held=rand();const g=held<Math.min(0.85,0.2+tt*0.35)?0:1;b[i]*=g;const q=Math.max(2,16-tt*7);b[i]=Math.round(b[i]*q)/q;if(i%Math.round(1+tt*6)!==0)b[i]=b[i-1]||0}if(tt>1.7)b[i]*=Math.max(0,1-(tt-1.7)/0.4)}
 place(b,r.t0,{gain:0.22,send:0.5,track:voxE})}
pad(54.5,9,[26,38,45],{vol:0.07,fc:300,att:2.5,rel:3,send:0.5});pad(56,7,[57,62],{vol:0.035,fc:700,att:3,rel:3,send:0.7,vib:0.004});
for(let t=63.5,k=0;t<69;t+=1,k++)tick(t,{vol:0.09,hi:k%2});noiseBed(66,94,{vol:0.05,kind:'rain',envf:(t)=>t<15?1:Math.max(0.3,1-(t-15)/12)});
{const P=(t,m,d,v=0.5)=>piano(t,m,{vel:v,dur:d,send:0.4});
 themeNotes(69,[0],{tr:-12}).forEach(n=>P(n.t,n.m,n.d*1.4,0.42));
 themeNotes(72,[0],{tr:-12}).forEach(n=>P(n.t,n.m,n.d*1.4,0.5));[38,50,53,57].forEach((m,i)=>P(72+i*0.06,m,2.8,0.35));
 themeNotes(75,[1],{tr:-12}).forEach(n=>P(n.t,n.m,n.d*1.4,0.5));[34,46,50,53].forEach((m,i)=>P(75+i*0.06,m,2.8,0.35));
 themeNotes(78,[2],{tr:-12}).forEach(n=>P(n.t,n.m,n.d*1.4,0.52));[41,48,53,57].forEach((m,i)=>P(78+i*0.06,m,2.6,0.35));
 for(let t=69.3;t<80;t+=rr(0.08,0.5)){if(((t-69)%3)<1.8)continue;click(t,{vol:0.05,pan:rr(-0.3,0.3)})}
 click(80.45,{big:1,vol:0.14});sine(80.5,0.12,1318.5,{vol:0.03,send:0.4});}
sing(themeNotes(81,[0,1,2,3]),{gain:0.3,send:0.38});
prog(81,['Dm','Bb','F','C'],(t,c,n,k)=>{for(let b=0;b<8;b++){const m=[c[0]+12,c[1][1],c[1][2],c[1][3],c[1][2]+12,c[1][3],c[1][2],c[1][1]][b];piano(t+b*B/2,m,{vel:0.32,dur:1.2,send:0.4})}
 pad(t,3.05,c[1],{vol:0.04,fc:1200,att:1.5,rel:2,send:0.6})});
sparkle(84,93,0.6,[74,77,81,84],{vol:0.02});
boom(93,{vol:0.55,dur:4});taiko(93,{vol:0.55,f:60});
prog(93,['Dm','Bb','F','C'],(t,c,n,k)=>{pad(t,3.05,c[1],{vol:0.09,fc:1400+k*400,att:0.6,rel:1.5,send:0.5,vib:0.003,voices:5});bass(t,c[0],1.4);bass(t+1.5,c[0],1.4);
 kick(t);if(k>=1)kick(t+1.75*B);snare(t+2*B,{vol:0.28});for(let s=0;s<8;s++)hat(t+s*B/2,{vol:0.035+(s%2?0:0.015)});
 const ar=[c[1][0]+12,c[1][2]+12,c[1][1]+12,c[1][3]+12];if(k>=1)for(let s=0;s<16;s++)pluck(t+s*B/4,ar[s%4]+(s>=8?12:0),{vol:0.035+k*0.006,pan:((s%4)-1.5)*0.35,cut:1500+k*900});
 if(k>=2)pad(t,3.05,c[1].map(x=>x+12),{vol:0.035,fc:2500,att:1,rel:1,send:0.7,vib:0.004})});
themeNotes(93,[0,1,2,3],{tr:-12}).forEach(n=>pad(n.t,n.d,[n.m],{vol:0.07,fc:2200,att:0.12,rel:0.5,voices:4,send:0.55,vib:0.005}));
choir(99,6,[62,65,69],{vol:0.035,att:2});
riser(101.5,105,{vol:0.22});revcym(103.4,105,{vol:0.22});for(let k=0;k<8;k++)taiko(103.5+k*B/4,{vol:0.2+k*0.04,f:90,pan:rr(-0.5,0.5)});
sing(themeNotes(105,[0,1,2,3,4,5,6,7]),{gain:0.34,send:0.32});
prog(105,['Dm','Bb','F','C','Dm','Bb','C','Dm'],(t,c,n,k)=>{if(k===7)return;
 pad(t,3.05,c[1],{vol:0.09,fc:2200,att:0.3,rel:1,send:0.5,vib:0.003,voices:5});choir(t,2.9,c[1].slice(1).map(x=>x+12),{vol:0.05});
 for(let b=0;b<4;b++)bass(t+b*B,c[0]+(b===3?12:0),B*0.9,{vol:0.2});
 kick(t);kick(t+1.5*B);kick(t+2.5*B);snare(t+B);snare(t+3*B);for(let s=0;s<16;s++)hat(t+s*B/4,{vol:s%4===2?0.05:0.025,pan:0.3});
 if(k%2===0)taiko(t,{vol:0.3,f:65});
 const ar=[c[1][0]+12,c[1][2]+12,c[1][1]+12,c[1][3]+12,c[1][1]+24,c[1][3]+12,c[1][2]+12,c[1][1]+12];for(let s=0;s<16;s++)pluck(t+s*B/4,ar[s%8],{vol:0.04,pan:Math.sin(s)*0.5,cut:3500})});
for(let k=0;k<6;k++)taiko(124.5+k*B/3,{vol:0.25+k*0.04,f:80+k*4,pan:rr(-0.6,0.6)});
pad(126,3,CH.Dm[1],{vol:0.09,fc:2200,att:0.1,rel:1,voices:5,send:0.5});kick(126);bass(126,38,1.5);choir(126,2.5,[62,65,69,74],{vol:0.05,att:0.1});
sine(128.2,4.5,6400,{vol:0.006,att:0.5,rel:2,send:0.2});
noiseBed(129,158,{vol:0.07,kind:'wind',envf:t=>0.5+0.5*Math.sin(t*0.2)});
for(let t=131,k=0;t<156;t+=1.5,k++)tick(t,{vol:0.045,hi:k%2});
pad(134,22,[26,38,45],{vol:0.06,fc:280,att:5,rel:4,send:0.5});
{const r=voice(themeNotes(139,[4,5]),{});const b=r.buf.reverse();const lp=new SVF();lp.set(1800,0);for(let i=0;i<b.length;i++)b[i]=lp.run(b[i]);place(b,139,{gain:0.12,send:0.95,bus:'S'})}
[[144,69],[146.2,65],[148.4,62],[151,64],[153.2,57]].forEach(([t,m])=>piano(t,m,{vel:0.35,dur:3,send:0.7,bus:'S'}));
[157,158,159].forEach(t=>sine(t,0.16,1000,{vol:0.035,att:0.005,rel:0.01,send:0.2}));sine(160,4.45,1000,{vol:0.03,att:0.005,rel:0.01,send:0.15});
sing(themeNotes(165.2,[0,1,2,3],{syl:'M'}),{gain:0.2,send:0.5,echo:0.08,vopt:{fs:1.22,breath:0.09,vib:0.15,jitter:0.25,att:0.08,glide:0.07}});
noiseBed(165,178,{vol:0.02,kind:'wind'});
pad(171,3.05,CH.F[1],{vol:0.035,fc:700,att:2,rel:2,send:0.7});pad(174,3.05,CH.C[1],{vol:0.045,fc:900,att:1.5,rel:2,send:0.7});
crowd(175,222,t=>{const T=175+t;if(T<189)return 0.15+0.5*Math.max(0,(T-177)/12)**2;if(T<190)return 0.65+0.35*(T-189);if(T<213)return 0.45;if(T<214)return 0.45+0.55*(T-213);return Math.max(0,1-(T-214)/7)},{vol:0.1});
prog(177,['Bb','C','D','Bsus'],(t,c,n,k)=>{pad(t,3.05,c[1],{vol:0.07+k*0.015,fc:900+k*600,att:1,rel:1,send:0.6,vib:0.004,voices:5});pad(t,3.05,[c[0]],{vol:0.07,fc:400,att:0.5,rel:1,send:0.3});
 choir(t,2.95,c[1].slice(1).map(x=>x+12),{vol:0.035+k*0.015,vowel:'o',att:1});
 const div=k<2?1:k<3?2:4;for(let s=0;s<4*div;s++)taiko(t+s*B/div,{vol:0.2+0.25*(s/(4*div))+k*0.05,f:70,pan:rr(-0.4,0.4)})});
pad(186,3,CH.B[1],{vol:0.05,fc:3000,att:2,rel:0.2,send:0.6});
riser(183,188.6,{vol:0.3,f0:200,f1:12000});revcym(186.5,188.6,{vol:0.32});
braaam(189,40,{vol:0.55,dur:6});boom(189,{vol:0.7});
sing(themeNotes(189,[0,1,2,3,4,5,6,7],{tr:2}),{gain:0.36,send:0.34});
prog(189,['Em','C','G','D','Em','C','D','Em'],(t,c,n,k)=>{const last=k===7;
 pad(t,last?4:3.05,c[1],{vol:0.1,fc:2600,att:0.25,rel:1,send:0.5,vib:0.003,voices:5});choir(t,last?3.8:2.9,[...c[1].slice(1).map(x=>x+12),c[1][0]+24],{vol:0.065});
 for(let b=0;b<4;b++)bass(t+b*B,c[0]+(b===3?12:0),B*0.9,{vol:0.22});
 kick(t);kick(t+1.5*B);kick(t+2.5*B);snare(t+B);snare(t+3*B);for(let s=0;s<16;s++)hat(t+s*B/4,{vol:s%4===2?0.055:0.028,pan:0.3});
 taiko(t,{vol:0.35,f:60});taiko(t+2*B,{vol:0.25,f:70});
 const ar=[c[1][0]+12,c[1][2]+12,c[1][1]+12,c[1][3]+12,c[1][1]+24,c[1][3]+12,c[1][2]+12,c[1][1]+12];for(let s=0;s<16;s++)pluck(t+s*B/4,ar[s%8],{vol:0.042,pan:Math.sin(s)*0.5,cut:4200});
 themeNotes(t,[k],{tr:2-12}).forEach(x=>pad(x.t,x.d,[x.m],{vol:0.045,fc:2500,att:0.08,rel:0.4,voices:4,send:0.6,vib:0.004}))});
riser(209,212.9,{vol:0.25});for(let k=0;k<12;k++)taiko(210+k*B/4,{vol:0.2+k*0.03,f:75,pan:rr(-0.6,0.6)});
braaam(213,40,{vol:0.6,dur:7.5,major:1});boom(213,{vol:0.8,dur:5});taiko(213,{vol:0.5,f:55});
pad(213,5,[...CH.E[1],CH.E[1][1]+12,CH.E[1][2]+12],{vol:0.12,fc:3200,att:0.05,rel:3,send:0.7,voices:5,vib:0.003});choir(213,5,[64,68,71,76,80],{vol:0.08,att:0.2,rel:2.5});
sparkle(213.5,219,4,[76,80,83,88],{vol:0.03});
themeNotes(221,[0,1,2,3],{tr:2,beat:1.05}).forEach(n=>piano(n.t,n.m-12,{vel:0.38,dur:n.d*1.3,send:0.55}));
[[221,'E'],[225.2,'C'],[229.4,'G'],[233.6,'D']].forEach(([t,n])=>CH[n][1].forEach((m,i)=>piano(t+i*0.05,m-12,{vel:0.22,dur:3.8,send:0.55})));
TL.credits.forEach(c=>{if(c.cmd){const n=c.s.length;for(let i=0;i<n;i++)click(c.t+i*0.045,{vol:0.05,pan:rr(-0.2,0.2)});click(c.t+n*0.045+0.15,{vol:0.07,big:1})}else tick(c.t,{vol:0.02,hi:1})});
sing([{t:238,d:0.5,m:71,s:'a'},{t:238.5,d:0.5,m:76,s:'ri'},{t:239,d:0.6,m:78,s:'ga'},{t:239.6,d:0.7,m:80,s:'to'},{t:240.3,d:2.1,m:76,s:'u'}],{gain:0.3,send:0.55,echo:0.12});
[52,56,59,64].forEach((m,i)=>piano(237.9+i*0.08,m,{vel:0.25,dur:5,send:0.7}));pad(238,4.5,[52,59,64,68],{vol:0.03,fc:1500,att:1,rel:3,send:0.8});
{const ts=126.55,td=1.3,s0=Math.round(ts*SR),s1=Math.round((ts+td)*SR);for(const bb of [M,MS])for(const ch of bb){const src=ch.slice(s0,s0+Math.round(td*SR)+10);
 for(let n=s0;n<s1;n++){const x=(n-s0)/SR,p=(x-x*x/(2*td))*SR,i=Math.floor(p),f=p-i;const v=(src[i]||0)*(1-f)+(src[i+1]||0)*f;ch[n]=v*Math.min(1,(s1-n)/(0.1*SR))}
 for(let n=s1;n<Math.round(131*SR);n++)ch[n]=0}
 for(let f=Math.floor(ts*FPS);f<Math.ceil(131*FPS);f++){const u=(f/FPS-ts)/td;voxE[f]*=u<1?Math.max(0,1-u):0}}
function freeverb(inL,inR,{room=0.88,damp=0.3,pre=0.03}){const cT=[1116,1188,1277,1356,1422,1491,1557,1617],aT=[556,441,341,225],out=[new Float32Array(N),new Float32Array(N)],pd=Math.round(pre*SR);
 for(let ch=0;ch<2;ch++){const cs=cT.map(t=>({b:new Float32Array(t+ch*23),i:0,f:0})),as=aT.map(t=>({b:new Float32Array(t+ch*23),i:0}));const o=out[ch];
  for(let n=0;n<N;n++){const x=n>=pd?(inL[n-pd]+inR[n-pd])*0.015:0;let s=0;for(const c of cs){const y=c.b[c.i];c.f=y*(1-damp)+c.f*damp;c.b[c.i]=x+c.f*room;if(++c.i>=c.b.length)c.i=0;s+=y}
   for(const a of as){const bo=a.b[a.i];a.b[a.i]=s+bo*0.5;s=bo-s;if(++a.i>=a.b.length)a.i=0}o[n]=s}}return out}
const wM=freeverb(MS[0],MS[1],{room:0.92,damp:0.28,pre:0.04}),wS=freeverb(SS[0],SS[1],{room:0.86,damp:0.4,pre:0.02});
const L=new Float32Array(N),Rr=new Float32Array(N);for(let n=0;n<N;n++){L[n]=M[0][n]+S[0][n]+(wM[0][n]*0.9+wM[1][n]*0.1)*3+(wS[0][n]*0.9+wS[1][n]*0.1)*3;Rr[n]=M[1][n]+S[1][n]+(wM[1][n]*0.9+wM[0][n]*0.1)*3+(wS[1][n]*0.9+wS[0][n]*0.1)*3}
let env=0;const sorted=[];for(let n=0;n<N;n+=97)sorted.push(Math.max(Math.abs(L[n]),Math.abs(Rr[n])));sorted.sort((a,b)=>a-b);const ref=sorted[Math.floor(sorted.length*0.998)];const pre=0.75/ref;
for(let n=0;n<N;n++){const l=L[n]*pre,r=Rr[n]*pre,a=Math.max(Math.abs(l),Math.abs(r));env=a>env?env+(a-env)*0.01:env+(a-env)*0.00005;const g=env>0.6?0.6/env:1;L[n]=Math.tanh(l*g*1.1)*0.92;Rr[n]=Math.tanh(r*g*1.1)*0.92}
const fade=Math.round(0.8*SR);for(let i=0;i<fade;i++){const g=i/fade;L[N-1-i]*=g;Rr[N-1-i]*=g}
const buf=Buffer.alloc(44+N*4);buf.write('RIFF',0);buf.writeUInt32LE(36+N*4,4);buf.write('WAVE',8);buf.write('fmt ',12);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(SR,24);buf.writeUInt32LE(SR*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(N*4,40);
for(let n=0;n<N;n++){buf.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(L[n]*32767))),44+n*4);buf.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(Rr[n]*32767))),46+n*4)}
fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/audio.wav',buf);
const spf=SR/FPS,mast=new Float32Array(NF);for(let f=0;f<NF;f++){let s=0;const a=Math.floor(f*spf),b=Math.min(N,Math.floor((f+1)*spf));for(let n=a;n<b;n++)s+=L[n]*L[n];mast[f]=Math.sqrt(s/Math.max(1,b-a))}
const norm=(arr,sq)=>{const v=Array.from(arr,x=>sq?Math.sqrt(x/spf):x);let m=0;for(const x of v)m=Math.max(m,x);m=m||1;return v.map(x=>+(x/m).toFixed(3))};
fs.writeFileSync('out/env.js','window.ENV='+JSON.stringify({vox:norm(voxE,1),drum:norm(drumE,1),hit:norm(hitE,1),master:norm(mast,0)})+';');
console.log('done',ref);
