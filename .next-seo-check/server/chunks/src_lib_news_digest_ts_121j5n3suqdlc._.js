module.exports=[158154,e=>{"use strict";var t=e.i(347540),r=e.i(229703),i=e.i(288306),o=e.i(712075),a=e.i(547499),n=e.i(303585);let s="àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ",l=s.toUpperCase(),c="àáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ",d=`aeiouy${s.replace("đ","")}`,u=`a-z${s}`,p=`A-Z${l}`,g=`${u}${p}`,m=/:\/\/|^www\.|@|[\w-]\.(?:com|net|org|co|uk|vn|io|tv)\b/i,h=[[RegExp(`(?<=[${u}0-9])\\.(?=[${p}](?![${p}]))`,"gu"),". "],[RegExp(`(?<=[${u}0-9])\\.(?=[${s}])`,"gu"),". "],[RegExp(`(?<=[!?])(?=[${g}0-9])`,"gu")," "],[RegExp(`,(?=[${g}])`,"gu"),", "],[RegExp(`(?<=[${g}]),(?=[0-9])`,"gu"),", "],[RegExp(`(?<!&[a-z]+);(?=[${g}0-9])`,"gu"),"; "],[RegExp(`(?<=[${g}]):(?=[${g}0-9])`,"gu"),": "],[RegExp(`(?<![\\p{L}\\p{N}])([${g}]*[${s}][${g}]*)(?=\\d)`,"gu"),"$1 "],[/(?<![\p{L}\p{N}])([a-z]{3,})(?=(?:19|20)\d{2}(?!\d))/gu,"$1 "],[RegExp(`(?<=\\d)(?=[${g}]+[${s}]|[${g}]*[${s}][${g}]+)`,"gu")," "],[RegExp(`([${c}])(?!\\1)(?=[${c}])`,"giu"),"$1 "],[RegExp(`(?<=[${d}][bcdđfghjklmnpqrstvwxz]+)(?=ở)`,"giu")," "],[RegExp("(?<=[A-Za-z]{6})(?=[âầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữđạảẹẻẽịỉĩọỏụủũỵỷỹ])","gu")," "],[RegExp(`(?<=[${s}])(?=[${p}])`,"gu")," "]],y=e=>"string"==typeof e?e.normalize("NFC").replace(/\S+/g,e=>m.test(e)?e:h.reduce((e,[t,r])=>e.replace(t,r),e)).replaceAll("Liverpool Daily",r.P.name):e,f=(e,t)=>Array.isArray(e)?e.map(t):e;function w(e){return{...e,sourceName:y(e.sourceName),badgeLabel:y(e.badgeLabel),title:y(e.title),metaTitle:y(e.metaTitle),metaDescription:y(e.metaDescription),excerpt:y(e.excerpt),conclusion:y(e.conclusion),body:f(e.body,e=>({...e,heading:y(e?.heading),paragraphs:f(e?.paragraphs,y)}))}}function $(e){return{...e,headline:y(e.headline),body:y(e.body),...e.seoArticle&&{seoArticle:w(e.seoArticle)}}}function b(e){return{...e,title:y(e.title),summary:y(e.summary),sections:f(e.sections,$),...e.seoArticle&&{seoArticle:w(e.seoArticle)},...e.seo_article&&{seo_article:w(e.seo_article)},..."seo_title"in e&&{seo_title:y(e.seo_title)},..."seo_description"in e&&{seo_description:y(e.seo_description)}}}var v=e.i(649070),A=e.i(991376),_=e.i(180419);let E="__seo_article__",k="Europe/London",x=["deepseek-v4-flash","deepseek-v4-pro","claude-sonnet-5"],L=(0,a.f)("NEXT_PUBLIC_SITE_URL")??"http://localhost:3000",S=`You are a football editor who follows Liverpool closely and writes the site's daily briefing. You are writing for people who want today's Liverpool news in one place, read quickly.

Input: recent articles with title, summary, source and category.
Output: a JSON object shaped like this:
{
  "title": "${r.P.name} — {date in English, e.g. 12 October 2026}",
  "summary": "4-6 sentences. Open with the most important story, then move through the rest. Name players, give scores, keep the detail.",
  "sections": [
    {
      "category": "category-key",
      "headline": "A headline that names the person or the event",
      "body": "4-6 sentences. Join the reporting from several articles into one account with people and context in it.",
      "articleUrls": ["url1", "url2"]
    }
  ],
  "seoArticle": {
    "sourceName": "${r.P.name}",
    "sourceUrl": "${L}",
    "badgeLabel": "${r.P.name}",
    "title": "A natural article headline containing Liverpool",
    "metaTitle": "50-60 characters",
    "metaDescription": "140-160 characters, carrying the focus keyword",
    "excerpt": "2-3 sentences saying what the piece covers.",
    "focusKeyword": "Liverpool news",
    "secondaryKeywords": ["Liverpool FC", "latest Liverpool news", "The Reds"],
    "body": [
      {
        "heading": "An H2 carrying one idea",
        "paragraphs": ["2-3 paragraphs, each 2-4 sentences."]
      }
    ],
    "conclusion": "A close that takes a clear view."
  }
}

Voice:
- Write like an editor talking to supporters, not a wire service
- Move between ideas with real sentences, not "Additionally" and "Furthermore"
- Feeling is allowed: pleased at a win, worried at an injury, expectant before a big game
- Put the news in context — the title race, recent form, the history between the clubs
- End the summary with a view or an expectation, not a shrug

Write like a person. Avoid the tells:
- Banned openers and fillers: "In the world of", "It is worth noting", "Interestingly", "It cannot be denied", "Overall", "In conclusion", "more than ever", "marks a turning point", "not only... but also", "Only time will tell", "Let's wait and see"
- Vary sentence length. Short, flat sentences next to longer ones. Do not let every sentence share a rhythm
- Do not start several paragraphs the same way ("Liverpool...", "The Reds...", "The side...")
- Do not scatter em dashes; use ordinary punctuation
- Do not end on something that could be said about any club on any day — have a position
- Supporters' language is fine where it fits ("The Kop", "Slot's side", "the Anfield crowd") but do not pack it in

Content rules:
- Name every player and manager that matters; leave none out
- Group articles by category, drop categories with nothing in them
- Each section draws on 1-5 related articles
- Give the specifics: scores, numbers, dates, quotes where there are any
- Fewer than 5 articles: write it short, 1-2 sections, still with the detail
- seoArticle is its own piece about Liverpool, not the summary again
- seoArticle names "${r.P.name}" as source and publisher, and keeps sourceUrl exactly as given
- seoArticle runs 600-900 words with a standfirst, 3-5 H2s, and the focus keyword read naturally into the title, the standfirst and at least one H2
- Never copy a source's wording. Summarise and rewrite; attribution lives in each section's articleUrls
- Return ONLY valid JSON — no markdown, no commentary`;function D(e){return Array.isArray(e)?e.filter(e=>"string"==typeof e&&e.trim().length>0):[]}function T(e){return!!e&&"object"==typeof e&&"string"==typeof e.title&&"string"==typeof e.metaDescription&&Array.isArray(e.body)}function N(e){return e.filter(e=>e.category!==E&&!e.hidden)}function O(e,t,r,i,o){var a;let n=N(r.sections);return{...e||{},digest_date:t,title:r.title,summary:r.summary,sections:(a=r.seoArticle,[...N(n),{category:E,headline:a.title,body:a.excerpt,articleUrls:[],seoArticle:a,hidden:!0}]),...o&&{seo_title:r.seoArticle.metaTitle,seo_description:r.seoArticle.metaDescription,seo_article:r.seoArticle},article_ids:n.flatMap(e=>e.articleUrls),article_count:r.articleCount,model:r.model,tokens_used:r.tokensUsed,generated_at:i}}async function R(e,t,r,i=new Date().toISOString()){let o=(0,n.f)(),a=O(e,t,r,i,!0),{data:s,error:l}=await o.from("news_digests").upsert(a,{onConflict:"digest_date"}).select("*").maybeSingle();if(!l)return s;if(!(l?.message&&/seo_article|seo_title|seo_description|schema cache/i.test(l.message)))throw l;console.warn("[digest] SEO columns missing; storing SEO article inside sections JSONB.");let c=O(e,t,r,i,!1),{data:d,error:u}=await o.from("news_digests").upsert(c,{onConflict:"digest_date"}).select("*").maybeSingle();if(u)throw u;return d}async function I(e,t){let r=new Date(Date.now()-3600*t*1e3).toISOString(),{data:i,error:o}=await e.from("articles").select("url, title, snippet, source, language, category, relevance").eq("is_active",!0).or(`published_at.gte.${r},fetched_at.gte.${r}`).order("relevance",{ascending:!1}).limit(40);if(o)throw Error(`digest article query failed: ${o.message}`);return(i??[]).filter(e=>(0,v.a)({title:e.title,link:e.url,pubDate:"",contentSnippet:e.snippet??"",source:e.source,language:e.language}).isRelevant).slice(0,25)}let P={"deepseek-v4-flash":42e3,"deepseek-v4-pro":3e4,"claude-sonnet-5":4e4};async function U(e,t={}){var i;let o,n,s,l,c,d=t.windowHours??24,u=t.startedAt??Date.now(),p=t.now??new Date,g=e.map((e,t)=>`[${t+1}] ${e.title}
   Source: ${e.source} | Lang: ${e.language} | Category: ${e.category}
   Snippet: ${e.snippet?.slice(0,400)||"N/A"}
   URL: ${e.url}`).join("\n\n"),m=function(e=new Date){return new Intl.DateTimeFormat("en-GB",{timeZone:k,weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(e)}(p),h=`${(0,A.f)(p)}

Today is ${m} (${k}).
Publisher/source for the SEO article: ${r.P.name} (${L}).

Here are the top ${e.length} Liverpool FC articles from the last ${d<=48?`${d} hours`:d%24==0?`${d/24} days`:`${d} hours`}:

${g}`;if(!(0,a.f)("VIETAPI_KEY"))throw Error("VIETAPI_KEY not configured");let[y,f]=await Promise.all([j({prompt:h,system:`${S}

${C}`,startedAt:u,options:t,parse:e=>(function(e){if(!e||"string"!=typeof e.title||!e.title||"string"!=typeof e.summary||!e.summary||!Array.isArray(e.sections))throw Error("Invalid digest structure from AI");return e})((0,_.f)(e))}),j({prompt:h,system:`${S}

${K}`,startedAt:u,options:t,parse:e=>(function(e){try{let t=(0,_.f)(e),r=t?.seoArticle??t;if(T(r))return{seoArticle:r}}catch{}throw Error("seoArticle JSON unparseable or incomplete")})(e)}).catch(e=>(console.warn(`[digest] SEO article generation failed, using section fallback: ${e instanceof Error?e.message:e}`),null))]),w=y.value;return b({title:w.title,summary:w.summary,sections:w.sections,seoArticle:(i=f?.value.seoArticle??w.seoArticle,o=w.sections.map(e=>({heading:e.headline||"Liverpool news",paragraphs:[e.body].filter(Boolean)})),n=(Array.isArray(i?.body)?i.body:[]).map(e=>({heading:"string"==typeof e?.heading&&e.heading.trim()?e.heading.trim():"Liverpool news",paragraphs:D(e?.paragraphs)})).filter(e=>e.paragraphs.length>0),s=i?.title?.trim()||w.title,l=i?.excerpt?.trim()||w.summary,c=i?.metaDescription?.trim()||w.summary.slice(0,160),{sourceName:r.P.name,sourceUrl:L,badgeLabel:i?.badgeLabel?.trim()||r.P.name,title:s,metaTitle:i?.metaTitle?.trim()||s.slice(0,60),metaDescription:c,excerpt:l,focusKeyword:i?.focusKeyword?.trim()||"Liverpool news",secondaryKeywords:D(i?.secondaryKeywords).slice(0,8),body:n.length>0?n:o,conclusion:i?.conclusion?.trim()||`There is more to come from Liverpool, and ${r.P.name} will keep gathering it as it lands.`}),articleCount:e.length,tokensUsed:y.tokens+(f?.tokens??0),model:y.model})}let C='OUTPUT: return ONLY a JSON object with "title", "summary" and "sections". No "seoArticle" field.',K='OUTPUT: return ONLY {"seoArticle": {...}} in the shape given above. No "title", "summary" or "sections". 500-700 words.';async function j(e){let t=[];for(let r of x){let a=(e.options.deadlineMs??55e3)-(Date.now()-e.startedAt),n=Math.min(a,e.options.attemptCapMs??P[r]);if(n<8e3){t.push(`${r}: skipped, ${Math.max(0,Math.round(a/1e3))}s left`);continue}let s=Date.now();try{let t=await (0,o.p)({model:(0,i.f)(r),system:e.system,prompt:e.prompt,maxOutputTokens:6e3,abortSignal:AbortSignal.timeout(n)});if(process.env.DIGEST_DEBUG&&console.warn(`[digest] ${r} ok in ${Date.now()-s}ms, out=${t.usage?.outputTokens}`),"length"===t.finishReason)throw Error("output truncated (finishReason=length)");return{value:e.parse(t.text),model:r,tokens:t.usage?.totalTokens??0}}catch(i){let e=i instanceof Error?i.message:String(i);t.push(`${r}: ${e.slice(0,160)}`),console.warn(`[digest] ${r} failed, trying next: ${e.slice(0,160)}`)}}throw Error(`All digest models failed — ${t.join(" | ")}`)}async function F(){let e=Date.now(),t=(0,n.f)(),r=[24,72,168],i=[],o=r[0];for(let e of r)if(o=e,(i=await I(t,e)).length>=3)break;if(0===i.length)throw Error("No recent articles found for digest");return U(i,{windowHours:o,startedAt:e})}let B=(0,t.cache)(async function(e){let t=(0,n.f)(),{data:r}=await t.from("news_digests").select("*").eq("digest_date",e).maybeSingle();return r&&b(r)});async function M(){try{let e=(0,n.f)(),{data:t}=await e.from("news_digests").select("digest_date, generated_at").order("digest_date",{ascending:!1}).limit(90);return t??[]}catch{return[]}}e.s(["_",0,F,"V",0,M,"X",0,B,"N",0,function(e=new Date){let t=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:k,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(e).map(e=>[e.type,e.value]));return`${t.year}-${t.month}-${t.day}`},"d",0,function(e){if(T(e.seo_article))return e.seo_article;let t=e.sections.find(e=>e.category===E);return T(t?.seoArticle)?t.seoArticle:null},"B",0,R],158154)}];

//# sourceMappingURL=src_lib_news_digest_ts_121j5n3suqdlc._.js.map