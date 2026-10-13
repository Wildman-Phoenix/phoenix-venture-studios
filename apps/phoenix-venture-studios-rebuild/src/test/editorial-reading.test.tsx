import {render,screen,cleanup} from '@testing-library/react';import {describe,it,expect,vi,afterEach} from 'vitest';import {webcrypto} from 'node:crypto';
import {loadStaticRssFeed} from '@/lib/static-rss-feed';import PhoenixArticleReading from '@/components/PhoenixArticleReading';
import {buildFeedJson,editorialContentDigest} from '../../scripts/rss/generate-static-rss.mjs';
const url='https://publisher.example/article';
const fixture:any={title:'Source headline',sourceTitle:'Source headline',publicTitle:'Who owns the next step?',deck:'Give the handoff an owner.',url,editorialSourceUrl:url,editorialReviewStatus:'approved',sourcePublishedAt:new Date().toISOString(),sourceDateStatus:'verified',articleBody:Array.from({length:4},(_,i)=>`Section ${i}. `+'Illustrative fixture interpretation gives the owner a concrete next action. '.repeat(13)),sourceLinks:[{label:'Source',url}],phoenixCta:{label:'Talk it through with Phoenix',href:'https://phoenixventurestudios.com/contact?intent=studio'},socialImagePath:'/images/signals/generated/fixture.jpg',imageStrategy:'held-for-codex-image',imageApprovalStatus:'approved',imageRightsStatus:'owned-or-licensed',imageCredit:'Phoenix Venture Studios original artwork.'};
const seal=(item:any)=>({...item,editorialContentDigest:editorialContentDigest(item)});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
async function load(item:any){vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>buildFeedJson([item])})));return(await loadStaticRssFeed()).articles[0]}
describe('reviewed Phoenix reading',()=>{
 it('preserves approved Phoenix headline/deck in generation and browser mapping, with continuous body, credit and one CTA',async()=>{
  const article=await load(seal(fixture));expect(article.headline).toBe(fixture.publicTitle);expect(article.deck).toBe(fixture.deck);expect(article.promotionEligible).toBe(true);render(<PhoenixArticleReading article={article}/>);expect(screen.getByRole('heading',{level:1}).textContent).toBe(fixture.publicTitle);expect(screen.getAllByRole('link',{name:'Talk it through with Phoenix'})).toHaveLength(1);expect(screen.getByText('Phoenix Venture Studios original artwork.')).toBeTruthy();expect(screen.queryByText('What changed')).toBeNull();expect(screen.queryByText('More context, only if you want it.')).toBeNull();
 });
 it('holds changed public commentary even with the old approval digest',async()=>{
  const approved=buildFeedJson([seal(fixture)]);approved.items[0]._phoenix.whyItMatters='Different advice';vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>approved})));const article=(await loadStaticRssFeed()).articles[0];expect(article.articleBody).toEqual([]);expect(article.promotionEligible).toBe(false);
 });
 it('does not label a conflicting timestamp as a verified original publication date',async()=>{
  const article=await load(seal({...fixture,sourceDateStatus:'conflicting'}));expect(article.promotionEligible).toBe(false);render(<PhoenixArticleReading article={article}/>);expect(screen.queryByText(/Original source published/)).toBeNull();expect(screen.getByText(/Source publication date needs review/)).toBeTruthy();
 });
 it('does not promote or render uncleared source imagery',async()=>{
  const article=await load(seal({...fixture,imageStrategy:'source-allowlisted',sourceImagePolicy:'reference-only',imageRightsStatus:'manual-review'}));expect(article.promotionEligible).toBe(false);const {container}=render(<PhoenixArticleReading article={article}/>);expect(container.querySelector('img')).toBeNull();
 });
});
