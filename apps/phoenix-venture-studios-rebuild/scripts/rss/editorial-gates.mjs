import {createHash} from 'node:crypto';
import {editorialApprovalPayload,sourceBoundDepth,sourceDateGate} from '../../src/lib/editorial-contract.mjs';
export {sourceDateGate};
export function editorialContentDigest(item){return createHash('sha256').update(editorialApprovalPayload(item)).digest('hex')}
export function hasReviewedSourceBrief(item){return sourceBoundDepth(item)&&item.editorialContentDigest===editorialContentDigest(item)}
export function promotionState(item,{now=new Date()}={}){
 const editorialReady=hasReviewedSourceBrief(item),date=sourceDateGate(item,now);
 const owned=/^\/images\/signals\/(generated|source-art)\//.test(item.socialImagePath||item.imagePath||'');
 const rights=['owned-or-licensed','allowed','allowlisted','licensed','phoenix-owned'].includes(item.imageRightsStatus);
 const imageReady=owned&&rights&&item.imageApprovalStatus==='approved'&&['held-for-codex-image','source-allowlisted'].includes(item.imageStrategy)&&!item.imageBrief?.manualReviewNeeded&&(!item.sourceImageUrl||item.imageStrategy!=='source-allowlisted'||item.sourceImagePolicy==='allowed');
 return {editorialReady,imageReady,dateReady:date.eligible,eligible:editorialReady&&imageReady&&date.eligible,reasons:[...(!editorialReady?['editorial-review-required']:[]),...(!imageReady?['image-provenance-review-required']:[]),...(!date.eligible?[date.reason]:[])]};
}
