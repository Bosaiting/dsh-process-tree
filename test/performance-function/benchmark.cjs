// Isolated host-shaped DOM and synthetic records. No host profile, model or tool calls.
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.DSH_PLAYWRIGHT_MODULE || 'playwright')
const sourcePath = process.env.DSH_CLIENT_SOURCE || path.join(__dirname, '../../client.js')
let source = fs.readFileSync(sourcePath, 'utf8').replace('DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX,', `DEFAULTS, STYLE_PRESETS, ELBOW_RADIUS, normalize, elbowCurve, dotRadius, railX, CSS, TreeView, createManager,
change: patch => {SETTINGS=normalize({...SETTINGS,...patch});queueLineVars();for(const view of watchedViews.values())view.syncSettings()},`)
const rows = Number(process.env.DPT_ROWS || 1000)
const language = ['python','javascript','c','cpp','java','go'].includes(process.env.DPT_LANGUAGE) ? process.env.DPT_LANGUAGE : 'python'
const switchLanguage = process.env.DPT_SWITCH_LANGUAGE === '1'
const switchTarget = ['python','javascript','c','cpp','java','go'].includes(process.env.DPT_SWITCH_TARGET) ? process.env.DPT_SWITCH_TARGET : (language === 'python' ? 'javascript' : 'python')
const react = path.join(path.dirname(require.resolve('react/package.json')), 'umd/react.development.js')
;(async () => {
  const browser = await chromium.launch({headless:true})
  const page = await browser.newPage({viewport:{width:1100,height:800}})
  await page.setContent('<style>html,body{margin:0;font:14px/24px Arial}body{padding:20px}[data-chat-flow]{width:760px}[data-step-process-content]{display:flex;flex-direction:column;gap:3px}[data-disclosure-row]{display:flex;height:24px}</style><div data-chat-flow><section data-step-process><div data-step-process-body><div data-step-process-content></div></div></section></div>')
  await page.evaluate(() => {window.__ModuleLoader__={load(s){window.spec=s}};window[Symbol.for('dsh.process-tree.test')]=a=>window.api=a;window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true})})
  await page.addScriptTag({path:react})
  await page.addScriptTag({content:source})
  await page.evaluate(() => {window.spec.factory(name=>{if(name==='react')return React;throw Error(name)})})
  const result = await page.evaluate(async ({rows, language, switchLanguage, switchTarget}) => {
    const observable=value=>({value,listeners:new Set(),getSnapshot(){return this.value},subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)},publish(v){this.value=v;for(const f of this.listeners)f()}})
    const content=document.querySelector('[data-step-process-content]'), nodes=new Map()
    const fragment=document.createDocumentFragment()
    for(let i=0;i<rows;i++) {
      const row=document.createElement('div');row.dataset.chatFlowKind='tool-call';row.dataset.chatAnchorKey='call-'+i;row.dataset.chatFlowKey='call-'+i
      row.innerHTML='<div data-chat-call-id="call-'+i+'"><div data-state="ok"><div data-disclosure-row><span>Read file</span></div></div></div>'
      fragment.append(row)
      nodes.set('call-'+i,{kind:'tool-call',data:{root:{callId:'call-'+i,kind:'tool-result',isError:i%71===0,time:1200,callTime:1000,call:{name:'read',argsRaw:JSON.stringify({path:'src/file-'+i+'.js',offset:i,content:'long data '.repeat(10)})},subCalls:[]}}})
    }
    content.append(fragment)
    const chat=observable({nodes}),current=observable({key:'bench',hooks:{chat}})
    api.setCodeSource(api.createCodeSource(current,{list:{getSnapshot:()=>({byId:{bench:{title:'Benchmark'}}})}}))
    api.change({treeStyle:'code',codeLayout:'function',codeLanguage:language,...api.STYLE_PRESETS.code,growthEnabled:false})
    const times=[];const original=api.TreeView.prototype.syncFunctionDecorations
    api.TreeView.prototype.syncFunctionDecorations=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{times.push(performance.now()-t)}}
    const t0=performance.now();window.manager=api.createManager();manager.start()
    let first=null,all=null,frames=0,maxGap=0,last=t0
    while(performance.now()-t0<30000){
      await new Promise(requestAnimationFrame);const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;frames++
      const count=content.querySelectorAll('.dpt-code-expression').length
      if(first===null&&count>0)first=now-t0
      if(count===rows){all=now-t0;break}
    }
    await new Promise(r=>setTimeout(r,100))
    const settled=performance.now(), before=times.length
    const id='call-'+Math.floor(rows/2),block=nodes.get(id).data.root
    nodes.set(id,{kind:'tool-call',data:{root:{...block,isError:true}}});chat.publish({nodes:new Map(nodes)})
    await new Promise(r=>setTimeout(r,500))
    const updateTimes=times.slice(before)
    const updateObserved=content.querySelector('[data-chat-call-id="'+id+'"] [data-dpt-function-failed]')!==null
    let switchResult=null
    if (switchLanguage && all !== null) {
      const target=switchTarget, t=performance.now(); let previous=t, maxSwitchGap=0, switchFrames=0, done=null
      const previousExpressions=[...content.querySelectorAll('.dpt-code-expression')]
      api.change({codeLanguage:target})
      while(performance.now()-t<30000){
        await new Promise(requestAnimationFrame);const now=performance.now();maxSwitchGap=Math.max(maxSwitchGap,now-previous);previous=now;switchFrames++
        const expressions=[...content.querySelectorAll('.dpt-code-expression')]
        if(expressions.length===rows && content.dataset.dptCodeLanguage===target && expressions.every((e,i)=>target===language || e!==previousExpressions[i])){done=now-t;break}
      }
      switchResult={target,done,frames:switchFrames,maxGap:maxSwitchGap}
    }
    return {rows,language,first,all,frames,maxGap,longTasks:longTasks.filter(x=>x>=50),syncCalls:times.length,initialSync:times.slice(0,before),updateSync:updateTimes,updateObserved,settledAt:settled-t0,switchResult}
  },{rows,language,switchLanguage,switchTarget})
  console.log(JSON.stringify(result))
  await browser.close()
})().catch(e=>{console.error(e);process.exitCode=1})
