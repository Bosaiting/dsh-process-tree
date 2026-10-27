// Regenerate the static card artwork from the real renderer with synthetic rows.
const { chromium }=require('playwright');
const path=require('path');
const root=path.resolve(__dirname,'..');
const fs=require('fs');
const source=fs.readFileSync(path.join(root,'client.js'),'utf8').replace('DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX,','DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX, CSS, TreeView, applyLineVars,');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.DSH_CHROMIUM_EXECUTABLE ? {executablePath:process.env.DSH_CHROMIUM_EXECUTABLE} : {})});const out={};
for(const style of ['classic','botanical','quiet']){const page=await browser.newPage({viewport:{width:400,height:400}});await page.setContent(`<html><head><style>*{box-sizing:border-box}body{margin:0;background:white;font:12px/22px sans-serif} #sample{width:200px;margin:0} [data-step-process-content]{display:flex;flex-direction:column;gap:0px} [data-disclosure-row]{height:22px;display:flex;align-items:center} [data-chat-call-id]{padding-left:0} </style></head><body><div id="sample" data-step-process><div data-step-process-content><div data-chat-flow-kind="reasoning" data-chat-anchor-key="think"><div data-variant="think"><div data-disclosure-row>思考</div></div></div><div data-chat-flow-kind="tool-call" data-chat-anchor-key="code"><div data-chat-call-id="code"><div data-state="completed"><div data-disclosure-row>代码</div></div><div data-subcalls><div data-chat-call-id="check"><div data-state="completed"><div data-disclosure-row>检查</div></div></div></div></div></div></div></div></body></html>`);await page.addScriptTag({path:path.join(root,'node_modules/react/umd/react.development.js')});await page.evaluate(()=>{window.__ModuleLoader__={load(s){window.spec=s}};window[Symbol.for('dsh.process-tree.test')]=a=>window.api=a});await page.addScriptTag({content:source});await page.evaluate(style=>{spec.factory(n=>React);api.setSettings(api.normalize({...api.DEFAULTS,...api.STYLE_PRESETS[style],treeStyle:style,indent:24,growthEnabled:false,stateMotion:false}));api.applyLineVars();const css=document.createElement('style');css.textContent=api.CSS;document.head.append(css);window.view=new api.TreeView(document.querySelector('[data-step-process-content]'))},style);await page.evaluate(async()=>{for(let i=0;i<20;i++)await new Promise(requestAnimationFrame)});
out[style]=await page.evaluate(()=>({height:document.querySelector('[data-step-process-content]').getBoundingClientRect().height,crownSpace:view.crownSpace,svg:view.svg.outerHTML,crown:view.crownSvg?.outerHTML,markup:view.crownLibrary?.svg.outerHTML,labels:[...document.querySelectorAll('[data-disclosure-row]')].map(x=>{let a=x.getBoundingClientRect(), b=document.querySelector('[data-step-process-content]').getBoundingClientRect();return {text:x.textContent,x:a.left-b.left,y:a.top-b.top}})}));await page.close()};await browser.close();
const snapshots={};
const inner=svg=>svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>')).replace(/dpt-(root-wood|halo|clip|neck|crown)-(\d+)/g,'dpt-card-$1-$2');
for(const [mode,v] of Object.entries(out)){
  let tree='<g class="dpt-mini-ink" data-dot-style="ring" data-state-motion="off" data-leaf-tint="muted">'+inner(v.svg)+'</g>';
  const labels=v.labels.map(i=>'<text x="'+Number((i.x+3).toFixed(2))+'" y="'+Number((i.y+16).toFixed(2))+'">'+i.text+'</text>').join('');
  if(mode==='botanical'){
    tree=inner(v.crown)+'<g transform="translate(0 '+v.crownSpace+')" style="--dpt-root-wood:url(#dpt-card-root-wood-1)">'+tree+'</g>'+labels;
    snapshots[mode]='<g transform="translate(9 7) scale(.65)">'+tree+'</g>';
  }else snapshots[mode]='<g transform="translate(14 23) scale(.9)">'+tree+labels+'</g>';
}
const clientPath=path.join(root,'client.js'),client=fs.readFileSync(clientPath,'utf8');
const pattern=/      const STYLE_THUMBNAILS = Object\.freeze\([^\n]+\)/;
if(!pattern.test(client))throw new Error('Style thumbnail marker missing');
fs.writeFileSync(clientPath,client.replace(pattern,'      const STYLE_THUMBNAILS = Object.freeze('+JSON.stringify(snapshots)+')'));
console.log('Updated renderer-generated style thumbnails');})().catch(e=>{console.error(e);process.exit(1)});
