import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function buildCombinedFounderSignal(rssDir=path.join(ROOT,'public/rss')) {
 const entries=[];
 for(const file of ['feed.xml','tools.xml','ai-attention.xml']) {
  const xml=await fs.readFile(path.join(rssDir,file),'utf8');
  if(!/<rss\b/.test(xml)||!/<\/rss>\s*$/.test(xml))throw new Error(`Invalid RSS input: ${file}`);
  for(const match of xml.matchAll(/<item>[\s\S]*?<\/item>/g)) {
   const block=match[0],guid=block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim(),published=block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
   if(guid&&!entries.some(entry=>entry.guid===guid))entries.push({guid,published,block});
  }
 }
 const archivePath=path.join(rssDir,'signal-archive.json'),xmlPath=path.join(rssDir,'all.xml');
 async function optional(file){try{return await fs.readFile(file,'utf8')}catch(error){if(error.code==='ENOENT')return null;throw error}}
 const [oldArchive,oldXml]=await Promise.all([optional(archivePath),optional(xmlPath)]);
 const previous=oldArchive?JSON.parse(oldArchive):{items:[]};
 if(!Array.isArray(previous.items))throw new Error('Invalid retained archive');
 const archive=new Map(previous.items.map(item=>[item._phoenix?.slug||item.id,item]));
 for(const file of ['feed.json','tools.json','ai-attention.json']) {
  const feed=JSON.parse(await fs.readFile(path.join(rssDir,file),'utf8'));
  if(!Array.isArray(feed.items))throw new Error(`Invalid JSON feed: ${file}`);
  for(const item of feed.items){const key=item._phoenix?.slug||item.id;if(!key||!item.url)throw new Error(`Missing stable article identity: ${file}`);archive.set(key,item)}
 }
 entries.sort((a,b)=>Date.parse(b.published||'')-Date.parse(a.published||''));
 const output=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Phoenix Venture Studios - All Founder Signals</title><description>Market, tools, and AI excerpts. Read the deeper dive on Phoenix Venture Studios.</description><link>https://phoenixventurestudios.com/founder-signal</link><atom:link href="https://phoenixventurestudios.com/rss/all.xml" rel="self" type="application/rss+xml"/><lastBuildDate>${entries[0]?.published||new Date(0).toUTCString()}</lastBuildDate><language>en-us</language>${entries.map(entry=>entry.block).join('\n')}</channel></rss>\n`;
 const archiveOutput=JSON.stringify({version:'https://jsonfeed.org/version/1.1',title:'Phoenix Signal Archive',items:[...archive.values()]},null,2);
 // Parse and validate everything before replacing either public output.
 await fs.writeFile(`${archivePath}.tmp`,archiveOutput);await fs.writeFile(`${xmlPath}.tmp`,output);
 try {await fs.rename(`${archivePath}.tmp`,archivePath);await fs.rename(`${xmlPath}.tmp`,xmlPath)}
 catch(error){if(oldArchive!==null)await fs.writeFile(archivePath,oldArchive);else await fs.rm(archivePath,{force:true});if(oldXml!==null)await fs.writeFile(xmlPath,oldXml);else await fs.rm(xmlPath,{force:true});throw error}
 return {items:entries.length,archived:archive.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await buildCombinedFounderSignal());
