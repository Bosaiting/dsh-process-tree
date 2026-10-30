const fs=require('fs');
(async()=>{
const file=process.argv[2],out=process.argv[3],counts={},samples={},reasons={},nodes={},stacks={},selectors={},hasSamples=[];let depth=0,start=-1,quoted=false,escape=false, carry='',total=0;
for await(const chunk of fs.createReadStream(file,{encoding:'utf8',highWaterMark:1048576})){
 let input=chunk;start=depth===0?-1:0;
 for(let i=0;i<input.length;i++){
  const c=input[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}
  if(c==='{'){if(depth===0)start=i;depth++}else if(c==='}'){
   depth--;if(depth===0&&start>=0){const text=carry+input.slice(start,i+1);carry='';total++;
    if(text.includes('Invalidation')){const e=JSON.parse(text),name=e.name||'',data=e.args?.data||{};counts[name]=(counts[name]||0)+1;if((samples[name]||[]).length<4)(samples[name]||=[]).push(data);if(data.reason==='Affected by :has()'||data.changedPseudo==='has'){const stack=(data.stackTrace||[]).map(x=>x.functionName).slice(0,4).join(' > ');if(stack)stacks[stack]=(stacks[stack]||0)+1;if(hasSamples.length<8)hasSamples.push({event:name,nodeName:data.nodeName,reason:data.reason,changedPseudo:data.changedPseudo,stack})} for(const item of data.selectors||[]){selectors[item.selector]=(selectors[item.selector]||0)+1}for(const field of ['reason','invalidationSet','nodeName','changedClass','changedId','selectorPart','changedAttribute']){if(data[field]!=null){const k=field+':'+JSON.stringify(data[field]);reasons[k]=(reasons[k]||0)+1}}}
   start=-1}
  }
 }
 if(depth>0&&start>=0)carry+=input.slice(start)
}
const result={file:require('path').basename(file),total,counts,samples,selectors,stacks,hasSamples,reasons:Object.fromEntries(Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,50))};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({total,counts,top:result.reasons}));
})().catch(e=>{console.error(e);process.exitCode=1});
