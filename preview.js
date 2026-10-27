// usage: node preview.js 10,30.5,90 [width]  -> prev/*.jpg
const {chromium}=require('playwright');const fs=require('fs');
const times=process.argv[2].split(',').map(Number);const w=+(process.argv[3]||640);const PORT=process.env.PORT||8123;
const opt={args:process.env.GPU?['--ignore-gpu-blocklist','--enable-gpu-rasterization']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
if(process.env.CHROME_PATH)opt.executablePath=process.env.CHROME_PATH;
(async()=>{const b=await chromium.launch(opt);
const p=await b.newPage({viewport:{width:w,height:Math.round(w*9/16)}});p.on('console',m=>{if(m.type()==='error')console.log('PAGE',m.text().slice(0,300))});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(`http://localhost:${PORT}/index.html?w=${w}`);await p.waitForFunction('window.READY',null,{timeout:120000});
fs.mkdirSync('prev',{recursive:true});
for(const t of times){const d=await p.evaluate(t=>renderAt(t),t);fs.writeFileSync(`prev/t${t.toFixed(2).padStart(7,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64'))}
await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
