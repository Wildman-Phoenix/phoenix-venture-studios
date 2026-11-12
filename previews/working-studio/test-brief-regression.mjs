import { readFileSync } from "node:fs";

function makeHarness(html){
 const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
 const marker='\ndocument.querySelectorAll("[data-step]").forEach(button=>button.onclick=';
 const boundary=script.indexOf(marker);
 if(boundary<0)throw new Error("Cannot locate app bootstrap");
 const elements=new Map();
 function element(id){
  if(!elements.has(id))elements.set(id,{value:"",textContent:"",innerHTML:"",hidden:false,checked:false,disabled:false,attrs:{},listeners:{},setAttribute(key,value){this.attrs[key]=value;},focus(){this.focused=true;},addEventListener(event,callback){this.listeners[event]=callback;}});
  return elements.get(id);
 }
 const radios=["meeting","research","planning","custom"].map(value=>Object.assign(element("task:"+value),{value}));
 const document={getElementById:element,querySelectorAll:selector=>selector==='input[name="task"]'?radios:[],querySelector:()=>element("selectedTask")};
 const suffix=[
 "const messages=[];",
 "// Isolate navigation/rendering and announcements. State and input/submit handlers are the actual source.",
 "go=index=>{if(canVisit(index))state.step=index;};",
 "render=()=>{};",
 "notify=message=>messages.push(message);",
 "return {state,TASKS,buildBrief,submitBrief,bind,canVisit,exportBrief,renderHistory:typeof renderHistory==='function'?renderHistory:null,updateChrome,messages};"
 ].join("\n");
 const app=new Function("document",script.slice(0,boundary)+suffix)(document);
 function fill(){for(const key of ["goal","input","output","tool"])element(key).value=app.state[key];}
 function completed(){
  Object.assign(app.state,{task:"meeting",tool:"A dot",goal:app.TASKS.meeting.goal,input:app.TASKS.meeting.input,output:app.TASKS.meeting.output,step:0,history:[],prepared:true,result:"Reviewed output with accurate owners and explicit missing dates.",checks:[true,true,true],passed:true,notes:"Keep the recap shorter.",routine:"Use after Monday's meeting; verify owners before sharing."});
  app.state.brief=app.buildBrief(app.state);fill();
 }
 const evidence=()=>JSON.stringify({brief:app.state.brief,prepared:app.state.prepared,result:app.state.result,checks:app.state.checks,passed:app.state.passed,notes:app.state.notes,routine:app.state.routine});
 return {...app,element,radios,fill,completed,evidence};
}
function runRegressionTests(html){
 const passed=[];
 function check(name,test){test();passed.push(name);}
 function assert(ok,message){if(!ok)throw new Error(message);}
 check("unchanged submit preserves all reviewed evidence and milestones",()=>{
  const h=makeHarness(html);h.completed();const before=h.evidence();h.submitBrief();
  assert(h.evidence()===before,"Unchanged submit erased or changed downstream evidence");
  assert(h.state.history.length===0,"Unchanged submit created duplicate history");
  assert(h.state.step===1,"Unchanged submit did not navigate to instructions");
 });
 check("whitespace-only changes preserve reviewed evidence",()=>{
  const h=makeHarness(html);h.completed();const before=h.evidence();
  h.element("goal").value="  "+h.element("goal").value+" \n";h.submitBrief();
  assert(h.evidence()===before,"Trim-equivalent brief changed evidence");
 });
 check("typing an edit preserves evidence and shows a persistent warning",()=>{
  const h=makeHarness(html);h.completed();h.bind();const before=h.evidence();
  h.element("goal").value="Draft a different kind of meeting follow-up.";h.element("goal").listeners.input();
  assert(h.evidence()===before,"Typing destroyed saved evidence");
  assert(!h.element("draftWarning").hidden && h.element("draftWarning").textContent.includes("Earlier briefs"),"Draft warning missing");
  assert(!h.canVisit(2),"Changed draft could reuse old test progress");
 });
 check("reverting a draft restores navigation without losing progress",()=>{
  const h=makeHarness(html);h.completed();h.bind();const original=h.state.goal;const before=h.evidence();
  h.element("goal").value="A changed meeting task.";h.element("goal").listeners.input();
  h.element("goal").value=original;h.element("goal").listeners.input();h.submitBrief();
  assert(h.evidence()===before,"Reverting draft lost evidence");
  assert(h.canVisit(3),"Reverted draft did not restore passed navigation");
 });
 check("material submit archives old evidence and resets only the new version",()=>{
  const h=makeHarness(html);h.completed();const old=JSON.parse(h.evidence());
  h.element("output").value="A two-sentence summary and a list of unresolved questions.";h.submitBrief();
  assert(h.state.history.length===1,"No prior version archived");
  assert(JSON.stringify(h.state.history[0])===JSON.stringify(old),"Archive differs from reviewed version");
  assert(h.state.brief!==old.brief && !h.state.prepared && !h.state.passed && h.state.result==="" && h.state.notes==="" && h.state.routine==="","New version kept stale review state");
  assert(h.messages.at(-1).includes("Earlier evidence is preserved"),"No revision notice");
 });
 check("task selection retains evidence until changed brief is submitted",()=>{
  const h=makeHarness(html);h.completed();h.bind();const before=h.evidence();
  h.radios.find(r=>r.value==="research").listeners.change();
  assert(h.evidence()===before,"Task selection destroyed evidence");
  assert(h.state.task==="research","Task selection failed");
  h.fill();h.submitBrief();assert(h.state.history.length===1,"Task change not archived");
  assert(h.state.brief.includes("fabricate citations"),"Research brief not generated");
 });
 check("invalid edits cannot erase or archive saved evidence",()=>{
  const h=makeHarness(html);h.completed();const before=h.evidence();
  h.element("goal").value="";h.submitBrief();
  assert(h.evidence()===before && h.state.history.length===0,"Invalid input modified evidence");
  assert(h.element("goal").attrs["aria-invalid"]==="true","Invalid field not identified");
 });
 check("tool changes archive prior test without inheriting its passed state",()=>{
  const h=makeHarness(html);h.completed();h.element("tool").value="Grok bot";h.submitBrief();
  assert(h.state.history.length===1 && h.state.history[0].brief.includes("A dot"),"Old tool evidence missing");
  assert(!h.state.passed && h.state.brief.includes("Grok bot"),"Changed tool inherited passed state");
 });
 check("archive checks are immutable snapshots",()=>{
  const h=makeHarness(html);h.completed();const oldChecks=h.state.checks;
  h.element("goal").value="Make a more concise meeting follow-up.";h.submitBrief();
  oldChecks[0]=false;h.state.checks[1]=true;
  assert(h.state.history[0].checks.every(Boolean),"Archive shares mutable check state");
 });
 check("repeated unchanged submit does not grow revision history",()=>{
  const h=makeHarness(html);h.completed();h.element("output").value="A concise decisions-only recap.";h.submitBrief();
  h.state.step=0;h.fill();h.submitBrief();h.state.step=0;h.fill();h.submitBrief();
  assert(h.state.history.length===1,"Duplicate archives created");
 });
 check("saved-work export includes earlier result, notes, and use plan",()=>{
  const h=makeHarness(html);h.completed();const old=JSON.parse(h.evidence());
  h.element("goal").value="Help me prepare a different team recap.";h.submitBrief();
  const exported=h.exportBrief(h.state);
  for(const value of [old.result,old.notes,old.routine,"EARLIER BRIEF 1"])assert(exported.includes(value),"Export omitted "+value);
 });
 check("history panel escapes text and provides copy/download controls",()=>{
  const h=makeHarness(html);h.completed();h.state.notes='<script>alert("old")</script>';
  h.element("goal").value="Help me prepare a different recap.";h.submitBrief();h.renderHistory();
  const panel=h.element("historyPanel").innerHTML;
  assert(panel.includes("&lt;script&gt;") && !panel.includes('<script>alert'),"Archive not escaped");
  assert(typeof h.element("copySaved").onclick==="function" && typeof h.element("downloadSaved").onclick==="function","Saved actions missing");
 });
 return {passed:passed.length,cases:passed};
}

const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const result=runRegressionTests(html);
console.log(JSON.stringify(result,null,2));
