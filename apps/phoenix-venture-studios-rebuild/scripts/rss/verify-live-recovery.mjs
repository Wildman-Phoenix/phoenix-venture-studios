import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {promotionState} from './editorial-gates.mjs';
export async function verifyLiveRecovery({baseUrl,expectedManifest,now=new Date(),fetchImpl=fetch}={}) {
 const failures=[],lanes=[];const get=async p=>{const r=await fetchImpl(`${baseUrl}${p}`,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`${p}: HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer())};
 let manifest;try{manifest=JSON.parse((await get('/rss/bundle-manifest.json')).toString());}catch(e){return{ok:false,failures:[e.message],lanes}};
 if(expectedManifest&&JSON.stringify(manifest.files)!==JSON.stringify(expectedManifest.files))failures.push('Live manifest does not match release candidate');
 for(const name of ['feed','tools','ai-attention']){try{
 const bytes=await get(`/rss/${name}.json`),hash=manifest.files?.[`${name}.json`];
 if(!hash||createHash(hash.length===40?'sha1':'sha256').update(bytes).digest('hex')!==hash)throw Error(`${name}: manifest hash mismatch`);
 const feed=JSON.parse(bytes.toString()),items=Array.isArray(feed.items)?feed.items:[];
 const eligible=items.filter(i=>i&&i._phoenix?.articleKind!=='historical-lookback'&&promotionState({...i._phoenix,originalUrl:i._phoenix?.originalUrl||i.external_url},{now}).eligible);
 lanes.push({name,total:items.length,currentReviewed:eligible.length});
 if(!eligible.length)failures.push(`${name}: no current reviewed story live`);
 for(const i of eligible){const p=i._phoenix?.socialImagePath||i._phoenix?.imagePath;if(!/^\/images\/signals\/(generated|source-art)\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(p||''))throw Error(`${name}: unsafe image path`);const image=await get(p);if(image.length<100||!(image.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff]))||image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||(image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP')))throw Error(`${name}: empty or invalid image`);await sharp(image,{failOn:'error'}).raw().toBuffer()}
 }catch(e){failures.push(e.message)}}
 return{ok:failures.length===0,checkedAt:now.toISOString(),baseUrl,lanes,failures};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const expectedManifest=process.argv[3]?JSON.parse(await fs.readFile(process.argv[3],'utf8')):undefined;const result=await verifyLiveRecovery({baseUrl:process.argv[2]||'https://phoenixventurestudios.com',expectedManifest});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1}
