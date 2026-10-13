import type { StaticFeedArticle } from '@/lib/static-rss-feed';

function inlineText(text: string) {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g);
  return parts.map((part,index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    return match ? <a key={index} href={match[2]} target="_blank" rel="noreferrer" className="underline decoration-[#f36c21]/50 underline-offset-4">{match[1]}</a> : part;
  });
}

export default function PhoenixArticleReading({article, draft=false, referenceImage}: {article:StaticFeedArticle;draft?:boolean;referenceImage?:string}) {
 const cta = article.phoenixCta || {label:'Talk it through with Phoenix',href:'/contact?intent=studio'};
 const body = article.articleBody || [];
 const sourceNote = body.find(paragraph => paragraph.startsWith("Original reporting behind"));
 return <article className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8" aria-label="Phoenix article">
   {import.meta.env.DEV && draft && <p className="mb-6 text-sm font-semibold text-[#a34919]">Editorial draft for review · Not approved for publication</p>}
   <header className="mb-10">
     <p className="text-sm text-[#58728b]">Phoenix Venture Studios · {article.date}{article.articleKind==='historical-lookback' ? ' · Historical lookback' : ''}</p>
     <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-[#123c69] sm:text-5xl">{article.headline}</h1>
     <p className="mt-5 text-xl leading-8 text-[#335d81]">{article.deck || article.summary}</p>
   </header>
   <div className="space-y-6 text-[1.0625rem] leading-8 text-[#335d81]">
     {body.filter(p=>!p.includes(cta.href) && p!==sourceNote).map((paragraph,index)=>{
       if(paragraph.startsWith('## ')) return <h2 key={index} className="pt-5 font-heading text-2xl font-bold leading-snug text-[#123c69]">{paragraph.slice(3)}</h2>;
       if(paragraph==='[private-pluto-image]') return import.meta.env.DEV && draft && referenceImage ? <figure key={index} className="my-8"><img src={referenceImage} alt="Pluto Security launch graphic with its name, an astronaut-monkey illustration and $42 million funding announcement" className="h-auto w-full rounded-xl"/><figcaption className="mt-3 text-sm leading-6 text-[#58728b]">Pluto Security’s October 13 launch artwork, from its <a className="underline" href="https://pluto.security/blog/welcome-to-planet-pluto/">official announcement</a>. Private review reference. Public-reuse permission is not established.</figcaption></figure> : null;
       return <p key={index}>{inlineText(paragraph)}</p>;
     })}
   </div>
   {!draft && article.imageUrl && article.imageApprovalStatus === "approved" && ["owned-or-licensed","allowed","allowlisted","licensed","phoenix-owned"].includes(article.imageRightsStatus || "") && (article.imageStrategy !== "source-allowlisted" || article.sourceImagePolicy === "allowed") && <figure className="mt-10"><img src={article.imageUrl} alt={article.headline} className="h-auto w-full rounded-xl"/><figcaption className="mt-2 text-sm text-[#58728b]">{article.imageCredit || (article.imageSourceType==='phoenix-owned' ? 'Phoenix Venture Studios artwork.' : 'Image credit pending — publication held.')}</figcaption></figure>}
   <aside className="mt-10 border-t border-[#123c69]/15 pt-6 text-sm leading-6 text-[#58728b]" aria-label="Sources">
     <p>{article.publisherName || article.source}{article.sourceDateStatus === "verified" && article.sourcePublishedAt ? ` · Original source published ${article.sourcePublishedAt.slice(0,10)}` : draft && article.sourcePublishedAt ? ` · Provisional source date: ${article.sourcePublishedAt.slice(0,10)}` : ' · Source publication date needs review'}</p>
     {sourceNote && <p className="mt-2">{inlineText(sourceNote)}</p>}
     {!sourceNote && <p className="mt-2">{article.sourceLinks?.map((source,index)=><span key={source.url}>{index>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.label}</a></span>)}</p>}
   </aside>
   <div className="mt-10 rounded-2xl bg-[#123c69] p-6 text-white"><p className="mb-4 leading-7">Choose and test one useful workflow.</p><a href={cta.href} className="inline-flex min-h-12 items-center rounded-xl bg-[#f36c21] px-5 py-3 font-semibold text-white">{cta.label}</a></div>
 </article>;
}
