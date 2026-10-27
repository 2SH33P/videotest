// usage: node render.js <startFrame> <endFrame>   (env: PORT=8123 CHROME_PATH=optional QUALITY=0.93)
const {chromium}=require('playwright');const fs=require('fs');
const [a,b]=process.argv.slice(2).map(Number);const w=1280;const PORT=process.env.PORT||8123;
const opt={args:process.env.GPU?['--ignore-gpu-blocklist','--enable-gpu-rasterization']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-gpu-vsync']};
if(process.env.CHROME_PATH)opt.executablePath=process.env.CHROME_PATH;
(async()=>{const br=await chromium.launch(opt);
const p=await br.newPage({viewport:{width:w,height:720}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(`http://localhost:${PORT}/index.html?w=${w}`);await p.waitForFunction('window.READY',null,{timeout:120000});
fs.mkdirSync('frames',{recursive:true});const t0=Date.now();const q=+(process.env.QUALITY||0.93);
for(let f=a;f<b;f++){const fn=`frames/f${String(f).padStart(5,'0')}.jpg`;if(fs.existsSync(fn))continue;const d=await p.evaluate(([t,q])=>renderAt(t,q),[f/24,q]);fs.writeFileSync(fn,Buffer.from(d.split(',')[1],'base64'));
 if(f%100===0)console.log(`[${a}-${b}] frame ${f}  ${((Date.now()-t0)/1000).toFixed(0)}s`)}
console.log('DONE',a,b,((Date.now()-t0)/1000).toFixed(0)+'s');await br.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
