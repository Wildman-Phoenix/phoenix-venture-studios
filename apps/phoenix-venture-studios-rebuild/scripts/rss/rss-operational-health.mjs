import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promotionState} from './editorial-gates.mjs';
export const ARCHIVE_LANES=[['founder-market','feed.json','run-report.json'],['founder-tools','tools.json','tools-run-report.json'],['ai-attention','ai-attention.json','ai-attention-run-report.json']];
const hours=3600000;
export function assessOperationalHealth({summary,reports={},feeds={},now=new Date(),notBefore=null,jobStatus='success'}={}){
 const issues=[];const issue=(severity,code,detail)=>issues.push({severity,code,detail});
 const stamp=Date.parse(summary?.generatedAt),age=now.getTime()-stamp;
 if(!summary||!Array.isArray(summary.feeds))issue('red','run-report-missing','The current run did not produce a usable report.');
 else if(!Number.isFinite(stamp)||age< -60000||age>30*hours||(notBefore&&stamp<Date.parse(notBefore)))issue('red','run-report-stale','Run evidence is missing, stale, or predates this job.');
 if(jobStatus!=='success')issue('red','workflow-failed',`Workflow status: ${jobStatus}. Inspect failed steps before retrying.`);
 if(summary?.allValid===false||summary?.restoredPreviousOutput)issue('red','generation-failed','Generation failed or previous output was restored.');
 const lanes=ARCHIVE_LANES.map(([id,file,reportFile])=>{
  const report=reports[reportFile],feed=feeds[file],run=Array.isArray(summary?.feeds)?summary.feeds.find(f=>f?.feedId===id):undefined;
  if(!report||!run)issue('red','lane-report-missing',`${id}: current lane report is missing.`);
  if(report&&(!Number.isFinite(Date.parse(report.generatedAt))||Date.parse(report.generatedAt)<stamp-60000))issue('red','lane-report-stale',`${id}: lane evidence predates this run.`);
  const count=Array.isArray(feed?.items)?feed.items.length:null;
  if(count===null)issue('red','feed-unreadable',`${id}: output feed is missing or malformed.`);
  else if(count===0)issue('yellow','empty-feed',`${id}: zero published items. Do not count a successful fetch as restored coverage.`);
  const eligibleItems=(Array.isArray(feed?.items)?feed.items:[]).filter(item=>item&&typeof item==='object'&&promotionState({...item._phoenix,originalUrl:item._phoenix?.originalUrl||item.external_url},{now}).eligible).length;
  if(count>0&&eligibleItems<count)issue('yellow','output-needs-review',`${id}: ${count-eligibleItems} output items lack current source/editorial/image eligibility; retained output is not restored current coverage.`);
  if(run&&(run.sourceErrors||run.socialCardErrors||run.editorialErrors||run.feedValid===false))issue('red','lane-failed',`${id}: source, validation, image or editorial errors occurred.`);
  const reasons={};for(const held of (Array.isArray(report?.heldItems)?report.heldItems:[]))for(const reason of Array.isArray(held?.promotionReasons)&&held.promotionReasons.length?held.promotionReasons:[held?.holdReason||'review-required'])reasons[reason]=(reasons[reason]||0)+1;
  const held=report?.items?.held||0;
  if(held>0&&Number(run?.selected||0)===0)issue('yellow','review-blocked',`${id}: ${held} candidates held; editorial, source-date and image review must be completed, not bypassed.`);
  if(run&&Number(run.selected||0)===0&&count>0)issue('yellow','no-new-selection',`${id}: no new selection; retained items are not proof of a new publication.`);
  return {feedId:id,outputItems:count,eligibleItems,selected:run?.selected??null,held,reasons};
 });
 const level=issues.some(i=>i.severity==='red')?'red':issues.length?'yellow':'green';
 return {schemaVersion:1,checkedAt:now.toISOString(),runGeneratedAt:summary?.generatedAt||null,level,needsAttention:level!=='green',contentRestored:level==='green',lanes,issues,
  nextAction:level==='green'?'Verify deployed output and keep social publishing paused.':'Phoenix must inspect the run evidence, finish source-bound editorial/image review, and immediately request any specific release or access approval that blocks recovery. Never weaken gates, backdate stories, or resume paused social publishing.',
  alertDelivery:'GitHub annotations and summary only. A separate root watchdog must deliver the warning to Nathan; this file does not claim message delivery.'};
}
const annotation=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
async function readJson(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}}
export async function writeOperationalHealth({rssDir,now=new Date(),notBefore=null,jobStatus='success',emit=true}={}){
 const summary=await readJson(path.join(rssDir,'autonomous-run-report.json')),reports={},feeds={};
 for(const [,file,report]of ARCHIVE_LANES){feeds[file]=await readJson(path.join(rssDir,file));reports[report]=await readJson(path.join(rssDir,report));}
 const health=assessOperationalHealth({summary,reports,feeds,now,notBefore,jobStatus});
 await fs.mkdir(rssDir,{recursive:true});await fs.writeFile(path.join(rssDir,'operational-health.json'),JSON.stringify(health,null,2)+'\n');
 const markdown=`## RSS operational status: ${health.level.toUpperCase()}\n\n${health.lanes.map(l=>`- ${l.feedId}: ${l.outputItems??'unknown'} output items; ${l.selected??'unknown'} selected; ${l.held} held.`).join('\n')}\n\n${health.issues.map(i=>`- ${i.severity.toUpperCase()}: ${i.detail}`).join('\n')}\n\n${health.nextAction}\n\n${health.alertDelivery}\n`;
 await fs.writeFile(path.join(rssDir,'operational-health.md'),markdown);
 if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,markdown);
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`health=${health.level}\nneeds_attention=${health.needsAttention}\n`);
 if(emit){for(const i of health.issues)console.log(`::${i.severity==='red'?'error':'warning'} title=RSS ${i.code}::${annotation(i.detail)}`);console.log(`RSS operational health: ${health.level}; content restored: ${health.contentRestored}`);}
 return health;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const rssDir=process.env.PHOENIX_RSS_HEALTH_DIR||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/rss');
 writeOperationalHealth({rssDir,notBefore:process.env.PHOENIX_RSS_JOB_STARTED_AT||null,jobStatus:process.env.PHOENIX_RSS_JOB_STATUS||'success'}).then(h=>{if(h.level==='red')process.exitCode=1;}).catch(e=>{console.error('RSS health assessment failed:',e.message);process.exitCode=1;});
}
