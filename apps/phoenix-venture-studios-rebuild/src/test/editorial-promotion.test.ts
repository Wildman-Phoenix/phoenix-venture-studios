import {describe,it,expect} from 'vitest';
import {hasReviewedSourceBrief,enrichSignalItem,buildFeedJson,enrichItemsWithArticleMetadata} from '../../scripts/rss/generate-static-rss.mjs';
import {extractArticleMetadata} from '../../scripts/rss/article-metadata.mjs';
const source='https://publisher.example/story';
const body=Array.from({length:4},(_,i)=>`Section ${i}. `+'A useful source-grounded original interpretation for founders and operators. '.repeat(12));
const approved={title:'Publisher funding headline',sourceTitle:'Publisher funding headline',publicTitle:'Who owns the handoff?',deck:'Choose one job, name its owner, and measure the handoff.',url:source,editorialSourceUrl:source,editorialReviewStatus:'approved',articleBody:body,sourceLinks:[{label:'Original reporting',url:source}],imageStrategy:'held-for-codex-image',imageApprovalStatus:'approved',imageRightsStatus:'owned-or-licensed',socialImagePath:'/images/signals/generated/fixture.jpg',sourcePublishedAt:'2026-10-13T00:00:00Z',sourceDateStatus:'verified'};
describe('independent editorial promotion gate',()=>{
 it('keeps empty editorial held after image approval',()=>{const result=enrichSignalItem({...approved,articleBody:[],editorialReviewStatus:'pending'});expect(result.editorialReviewNeeded).toBe(true);expect(result.promotionEligible).toBe(false)});
 it('requires approval tied to exact content, not a transferable marker',()=>{expect(hasReviewedSourceBrief(approved)).toBe(false)});
 it('extracts source publication independently of discovery date',()=>{const m=extractArticleMetadata('<meta property="article:published_time" content="2019-02-14T10:00:00Z">',source);expect(m.sourcePublishedAt).toBe('2019-02-14T10:00:00.000Z');expect(m.sourceDateStatus).toBe('verified')});
 it('holds contradictory publication evidence',()=>{const m=extractArticleMetadata('<meta property="article:published_time" content="2019-02-14"><script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-10-13"}</script>',source);expect(m.sourceDateStatus).toBe('conflicting')});
 it('checks publisher date even when RSS already includes an image',async()=>{let calls=0;const [result]=await enrichItemsWithArticleMetadata([{url:source,sourceName:'Hacker News',sourceImageUrl:'https://publisher.example/image.jpg',publishedAt:'2026-10-13'}],{fetchArticleMetadataImpl:async()=>{calls++;return{ok:true,canonicalUrl:source,sourcePublishedAt:'2019-02-14T00:00:00Z',sourceDateStatus:'verified',publisherName:'Publisher'}}});expect(calls).toBe(1);expect(result.sourcePublishedAt).toBe('2019-02-14T00:00:00Z');expect(result.discoveredAt).toBe('2026-10-13');expect(result.publisherName).toBe('Publisher')});
});

import {editorialContentDigest,buildSocialQueueCandidateState,buildStaticRss,buildFeedXml} from '../../scripts/rss/generate-static-rss.mjs';
import {promotionState,sourceDateGate} from '../../scripts/rss/editorial-gates.mjs';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const now=new Date('2026-10-13T18:30:00Z');
const seal=(item:any)=>({...item,editorialContentDigest:editorialContentDigest(item)});
describe('reviewed editorial contracts',()=>{
 it('holds pending body with cleared image and holds source mismatch',()=>{
  expect(buildSocialQueueCandidateState({...approved,articleBody:[]},{now}).queueCandidateState.eligible).toBe(false);
  expect(promotionState(seal({...approved,editorialSourceUrl:'https://other.example/story'}),{now}).editorialReady).toBe(false);
 });
 it('invalidates approval when headline, deck or body changes',()=>{
  const item=seal(approved);expect(hasReviewedSourceBrief(item)).toBe(true);
  for(const change of [{publicTitle:'Changed'},{deck:'Changed'},{whyItMatters:'Changed public advice'},{articleBody:[...body,'Changed final advice']}]) expect(hasReviewedSourceBrief({...item,...change})).toBe(false);
 });
 it('retains approved Phoenix headline, deck and canonical identity through JSON/XML',()=>{
  const item=seal({...approved,slug:'old-identity',internalPath:'/founder-signal/signals/old-identity',socialTeaser:'A meeting summary is useful only when its next action has an owner.'});const result=buildFeedJson([item],{now}).items[0];
  expect(result.title).toBe(item.publicTitle);expect(result._phoenix.deck).toBe(item.deck);expect(result._phoenix.sourceTitle).toBe(approved.sourceTitle);expect(result.id).toBe('https://phoenixventurestudios.com/founder-signal/signals/old-identity/');
  expect(result.content_text.match(/https:\/\/phoenixventurestudios.com/g)).toHaveLength(1);expect(result.content_text).not.toContain(item.publicTitle);expect(result.content_text).not.toContain(source);
  expect(buildFeedXml([item],{now})).toContain('<guid isPermaLink="true">'+result.id+'</guid>');
 });
 it('keeps a 2019 publisher date distinct from 2026 HN discovery and requires reviewed historical path',()=>{
  const item=seal({...approved,sourcePublishedAt:'2019-02-14T10:00:00Z',discoveredAt:'2026-10-13T18:00:00Z',aggregatorName:'Hacker News',publisherName:'The Guardian'});
  expect(sourceDateGate(item,now)).toEqual({eligible:false,reason:'historical-source'});
  expect(promotionState(item,{now}).eligible).toBe(false);
  const lookback=seal({...item,articleKind:'historical-lookback',historicalReviewStatus:'approved'});
  expect(promotionState(lookback,{now}).eligible).toBe(true);
  expect(buildFeedJson([lookback],{now}).items[0].content_text).toContain('Historical lookback · Original source: 2019-02-14.');
  const json=buildFeedJson([item],{now}).items[0]._phoenix;expect(json.sourcePublishedAt).toBe(item.sourcePublishedAt);expect(json.discoveredAt).toBe(item.discoveredAt);expect(json.publisherName).toBe('The Guardian');expect(json.aggregatorName).toBe('Hacker News');
 });
 it.each(['unknown','conflicting'])('holds %s source date',status=>expect(promotionState(seal({...approved,sourceDateStatus:status}),{now}).eligible).toBe(false));
 it('holds uncleared publisher art independently of content approval',()=>{
  const item=seal({...approved,sourceImageUrl:'https://publisher.example/art.png',sourceImagePolicy:'reference-only',imageStrategy:'source-allowlisted',imageRightsStatus:'manual-review'});expect(promotionState(item,{now}).eligible).toBe(false);
  expect(promotionState(enrichSignalItem({...item,imageApprovalStatus:undefined,imageRightsStatus:undefined}),{now}).eligible).toBe(false);
 });
 it('zero eligible writes a deliberately empty social queue without rotating an old pending item or alias GUID',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pvs-zero-'));try {
   const registry=path.join(dir,'sources.json');await fs.writeFile(registry,JSON.stringify({targets:{ai_operator_impact:10},maxPerSource:10,sources:[{id:'fixture',name:'Hacker News',url:'https://example.com/feed',type:'rss',enabled:true,score:90,buckets:['ai_operator_impact']}]}));
   await fs.writeFile(path.join(dir,'social.xml'),'<?xml version="1.0"?><rss><channel><item><guid>old-pending</guid></item></channel></rss>');await fs.writeFile(path.join(dir,'social.json'),JSON.stringify({items:[{id:'old-pending'}]}));await fs.writeFile(path.join(dir,'autonomous-history.json'),'fixture-history');
   const result=await buildStaticRss({now,feedId:'founder-market-social',registryPath:registry,outputDir:dir,generateSocialImages:false,enableArticleMetadata:false,fetchTextImpl:async()=>'<rss><channel><item><title>Useful AI workflow tool</title><link>https://publisher.example/new</link><description>AI business workflow</description><pubDate>Tue, 13 Oct 2026 18:00:00 GMT</pubDate></item></channel></rss>',outputFiles:{xml:'social.xml',json:'social.json',items:'social-items.json',reportMd:'social-report.md',reportJson:'social-report.json',aliases:[{from:'social.xml',to:'alias.xml'}]}});
   expect(result.report.feedValid).toBe(true);expect(result.report.noEligibleStories).toBe(true);expect(result.report.preservedPreviousFeed).toBe(false);expect(result.report.queue.queuePublishedAt).toBe('');expect(result.report.queue.historyUpdated).toBe(false);expect(result.items).toEqual([]);expect(JSON.parse(await fs.readFile(path.join(dir,'social.json'),'utf8')).items).toEqual([]);expect(await fs.readFile(path.join(dir,'alias.xml'),'utf8')).toBe(await fs.readFile(path.join(dir,'social.xml'),'utf8'));expect(await fs.readFile(path.join(dir,'autonomous-history.json'),'utf8')).toBe('fixture-history');
  } finally {await fs.rm(dir,{recursive:true,force:true})}
 });
});

describe('metadata conflict retention',()=>{
 it('never clears a source-date conflict during final cached-image metadata backfill',async()=>{
 const [item]=await enrichItemsWithArticleMetadata([{url:source,sourceDateStatus:'conflicting',sourceImageUrl:'https://publisher.example/image.jpg',articleMetadata:{ok:true,sourcePublishedAt:'2019-02-14T10:00:00Z',sourceDateStatus:'verified'}}]);expect(item.sourceDateStatus).toBe('conflicting');expect(sourceDateGate(item,now).eligible).toBe(false);
 });
});

import {holdIneligibleInactiveQueues} from '../../scripts/rss/supervised-static-rss.mjs';
describe('inactive social lanes',()=>{it('clears a legacy pending inactive queue without changing history or promoting its old identity',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pvs-inactive-'));try{
 const old={items:[{id:'pending-guid',title:'Pending',external_url:source,_phoenix:{articleBody:[],imageApprovalStatus:'approved'}}]};await fs.writeFile(path.join(dir,'social.json'),JSON.stringify(old));await fs.writeFile(path.join(dir,'social-run-report.json'),JSON.stringify({items:{selected:1},queue:{isSocialQueue:true,queuePublishedAt:'2026-10-12T00:00:00Z',historyUpdated:true}}));await fs.writeFile(path.join(dir,'autonomous-history.json'),'unchanged-history');
 expect(await holdIneligibleInactiveQueues(dir,['founder-market'],now)).toEqual(['founder-market-social']);const report=JSON.parse(await fs.readFile(path.join(dir,'social-run-report.json'),'utf8'));expect(report.queue.historyUpdated).toBe(false);expect(report.queue.queuePublishedAt).toBe('');expect(report.noEligibleStories).toBe(true);expect(await fs.readFile(path.join(dir,'social.xml'),'utf8')).not.toContain('pending-guid');expect(await fs.readFile(path.join(dir,'autonomous-history.json'),'utf8')).toBe('unchanged-history');
 }finally{await fs.rm(dir,{recursive:true,force:true})}
})});
