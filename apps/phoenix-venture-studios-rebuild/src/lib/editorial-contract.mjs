export function editorialApprovalPayload(item) {
 return JSON.stringify({source:item.editorialSourceUrl||'',title:item.publicTitle||item.title||'',deck:item.deck||item.simpleSummary||'',body:item.articleBody||[],sources:item.sourceLinks||[],cta:item.phoenixCta||null,teaser:item.socialTeaser||'',commentary:{whyItMatters:item.whyItMatters||'',whyShared:item.whyShared||'',founderTakeaway:item.founderTakeaway||'',businessTakeaway:item.businessTakeaway||'',trendContext:item.trendContext||'',engagementPrompt:item.engagementPrompt||''},kind:item.articleKind||'current-news',historicalReview:item.historicalReviewStatus||''});
}
export function sourceBoundDepth(item) {
 const url=item.originalUrl||item.url||'',body=item.articleBody||[];
 return Boolean(url&&item.editorialSourceUrl===url&&item.editorialReviewStatus==='approved'&&Array.isArray(body)&&body.length>=4&&body.every(p=>typeof p==='string'&&p.trim())&&body.join(' ').split(/\s+/).filter(Boolean).length>=300&&Array.isArray(item.sourceLinks)&&item.sourceLinks.some(link=>link?.url===url));
}
export function sourceDateGate(item,now=new Date()) {
 if(item.sourceDateStatus!=='verified'||!item.sourcePublishedAt)return {eligible:false,reason:item.sourceDateStatus==='conflicting'?'source-date-conflicting':'source-date-unknown'};
 const date=Date.parse(item.sourcePublishedAt),age=now.getTime()-date;
 if(!Number.isFinite(date)||age < 0)return {eligible:false,reason:'source-date-conflicting'};
 if(item.articleKind==='historical-lookback')return {eligible:item.historicalReviewStatus==='approved',reason:item.historicalReviewStatus==='approved'?'reviewed-historical-lookback':'historical-review-required'};
 return {eligible:age<=7*24*60*60*1000,reason:age<=7*24*60*60*1000?'current-source':'historical-source'};
}
