(()=>{"use strict";module.exports=[857773,e=>{var t=e.i(747909),r=e.i(174017),a=e.i(996250),s=e.i(759756),n=e.i(561916),o=e.i(174677),i=e.i(869741),l=e.i(316795),c=e.i(487718),u=e.i(995169),d=e.i(47587),h=e.i(666012),p=e.i(570101),f=e.i(626937),m=e.i(10372),w=e.i(193695),g=e.i(509580);e.i(52474);var y=e.i(257297);let b=new t.AppRouteRouteModule({definition:{kind:r.f.APP_ROUTE,page:"/api/chat-groq/route",pathname:"/api/chat-groq",filename:"route",bundlePath:""},distDir:".next-seo-check",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/chat-groq/route.ts",nextConfigOutput:"",userland:()=>e.r(397220),...{}}),{workAsyncStorage:v,workUnitAsyncStorage:C,serverHooks:x}=b;async function R(e,t,a){a.requestMeta&&(0,s.R)(e,a.requestMeta),b.isDev&&(0,s.i)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/chat-groq/route";v=v.replace(/\/index$/,"")||"/";let C=await b.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!C)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,deploymentId:R,params:A,nextConfig:k,parsedUrl:S,isDraftMode:E,prerenderManifest:I,routerServerContext:P,isOnDemandRevalidate:T,revalidateOnlyGenerated:O,resolvedPathname:$,clientReferenceManifest:q,serverActionsManifest:L,previewProps:N}=C,U=(0,i.f)(v),_=!!I.routes[$]&&(b.isDev||(0,g.f)($,b.cacheOwner,I.routes[$])),F=!!(I.dynamicRoutes[U]||_),j=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,S,!1):t.end("This page could not be found"),null);if(F&&!E){let e=I.dynamicRoutes[U];if(e&&!1===e.fallback&&!_){if(k.adapterPath)return await j();throw new w.NoFallbackError}}let W=null;!F||b.isDev||E||(W="/index"===(W=$)?"/":W),L&&q&&(0,o.f)({page:v,clientReferenceManifest:q,serverActionsManifest:L});let D=e.method||"GET",M=(0,n.v)(),G=M.getActiveScopeSpan(),H=!!(null==P?void 0:P.isWrappedByNextServer),Y=!!(0,s.w)(e,"minimalMode"),J=(0,s.w)(e,"incrementalCache")||await b.getIncrementalCache(e,k,N,I,Y);null==J||J.resetRequestCache(),globalThis.__incrementalCache=J;let K={params:A,previewProps:N,renderOpts:{experimental:{authInterrupts:!!k.experimental.authInterrupts,useCacheTimeout:k.experimental.useCacheTimeout,durableUseCacheEntries:!!k.experimental.durableUseCacheEntries},cacheComponents:!!k.cacheComponents,validationLevel:k.experimental.instantInsights.validationLevel,isDraftMode:E,incrementalCache:J,hmrRefreshHash:(0,s.w)(e,"hmrRefreshHash"),cacheLifeProfiles:k.cacheLife,staticPageGenerationTimeout:k.staticPageGenerationTimeout,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0},sharedContext:{buildId:x,deploymentId:R}},V=new l.x(e),B=new l.e(t),Q=c.k.fromNodeNextRequest(V,(0,c.t)(t)),z=async({previousCacheEntry:r})=>{try{if(!Y&&T&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=null===W?await b.handle(Q,K):await b.prerender(Q,K);e.fetchMetrics=K.renderOpts.fetchMetrics;let n=K.renderOpts.pendingWaitUntil;n&&a.waitUntil&&(a.waitUntil(n),n=void 0);let o=K.renderOpts.collectedTags;if(!F)return await (0,h.f)(V,B,s,n),null;{let e=await s.blob(),t=(0,p.S)(s.headers);o&&(t[m.M]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=m.Q)&&K.renderOpts.collectedRevalidate,a=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=m.Q?!1!==r&&r>0?k.expireTime:void 0:K.renderOpts.collectedExpire;return{value:{kind:y.x.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,d.f)({isStaticGeneration:null!==W,isOnDemandRevalidate:T})},!1,P),t}},X=async(s,o)=>{try{var i,l;let s=await b.handleResponse({req:e,nextConfig:k,cacheKey:W,routeKind:r.f.APP_ROUTE,isFallback:!1,previewProps:N,prerenderManifest:I,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:O,responseGenerator:z,waitUntil:a.waitUntil,isMinimalMode:Y});if(null!==s&&"error"in s)throw s.error;if(!F)return;if((null==s||null==(i=s.value)?void 0:i.kind)!==y.x.APP_ROUTE)throw Error(`Invariant: app-route received invalid cache entry ${null==s||null==(l=s.value)?void 0:l.kind}`);Y||t.setHeader("x-nextjs-cache",T?"REVALIDATED":s.isMiss?"MISS":s.isStale?"STALE":"HIT"),E&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let n=(0,p.G)(s.value.headers);Y&&F||n.delete(m.M),!s.cacheControl||t.getHeader("Cache-Control")||n.get("Cache-Control")||n.set("Cache-Control",(0,f.f)(s.cacheControl)),await (0,h.f)(V,B,new Response(s.value.body,{headers:n,status:s.value.status||200}));return}catch(r){if(r instanceof w.NoFallbackError||await b.onRequestError(e,r,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,d.f)({isStaticGeneration:null!==W,isOnDemandRevalidate:T})},!1,P),F)throw r;if(t.headersSent){if(s){let e=r instanceof Error?r:Error("Unknown app route error");s.recordException(e),s.setStatus({code:n.J.ERROR,message:e.message}),s.setAttribute("error.type",e.name)}t.writableEnded||t.destroyed||t.end()}else await (0,h.f)(V,B,new Response(null,{status:500}));return}finally{(()=>{if(!s)return;let e=t.statusCode;s.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(s.setStatus({code:n.J.ERROR}),s.setAttribute("error.type",e.toString()));let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.q.handleRequest)return console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route")||U,i=`${D} ${a}`;s.setAttributes({"next.route":a,"http.route":a,"next.span_name":i}),s.updateName(i),o&&o!==s&&(o.setAttribute("http.route",a),o.updateName(i))})()}};if(H&&G)await X(G,void 0);else{let t=M.getActiveScopeSpan();await M.withPropagatedContext(e.headers,()=>M.trace(u.q.handleRequest,{spanName:`${D} ${v}`,kind:n.C.SERVER,attributes:{"http.method":D,"http.target":e.url}},e=>X(e,t)),void 0,!H)}}e.s(["handler",0,R,"patchFetch",0,function(){return(0,a.f)({workAsyncStorage:v,workUnitAsyncStorage:C})},"routeModule",0,b,"serverHooks",0,x,"workAsyncStorage",0,v,"workUnitAsyncStorage",0,C])},397220,e=>{var t=e.i(712075),r=e.i(362693),a=e.i(288306),s=e.i(873525),n=e.i(189104);async function o(e){let t=process.env.GROQ_API_KEY;if(!t)throw Error("GROQ_API_KEY is not configured");console.log("[Web Search] Groq browser_search:",e);let r=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date),a=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"system",content:`Today is ${r}. You are a football research assistant. Always search the web for the latest information and prefer sources from the last few weeks over older ones. Provide factual, up-to-date data with source references. Respond concisely.`},{role:"user",content:e}],tools:[{type:"browser_search"}],max_completion_tokens:1024,stream:!1})});if(!a.ok){let e=await a.text();throw console.error("[Web Search] Groq search error:",a.status,e),Error(`Groq search failed: ${a.status}`)}let s=await a.json(),n=s.choices?.[0]?.message,o=(n?.content||"").replace(/【[^】]*】/g,"").trim(),i=[],l=n?.executed_tools;if(Array.isArray(l))for(let e of l){let t=e?.search_results?.results;if(Array.isArray(t))for(let e of t)e.url&&!/^https?:\/\/(www\.)?exa\.ai\//.test(e.url)&&i.push({title:String(e.title||"").replace(/\s*-\s*viewing lines.*$/i,"")||new URL(e.url).hostname.replace("www.",""),url:e.url,snippet:e.content||""})}0===i.length&&(i=[...new Set(o.match(/https?:\/\/[^\s)\]"']+/g)||[])].slice(0,5).map(e=>({title:new URL(e).hostname.replace("www.",""),url:e,snippet:""})));let c=new Set;return i=i.filter(e=>!c.has(e.url)&&(c.add(e.url),!0)).slice(0,8),console.log(`[Web Search] Got answer (${o.length} chars), ${i.length} sources, hasExecutedTools=${!!l}`),{query:e,answer:o,sources:i}}let i="deepseek-v4-flash";async function l(e,t){try{let r=await fetch("https://api.vietapi.tech/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({model:i,messages:[{role:"system",content:`You classify if a football fan's message needs real-time web search.
Reply JSON only: {"search":true/false,"query":"optimized search query or empty"}

NEEDS SEARCH (true):
- Current scores, live results, recent match results
- Transfer news, rumors, signings
- Injury updates, team news
- Time words: today, latest, now, current, this week, h\xf4m nay, mới nhất, hiện tại
- Current season standings, fixtures, form
- Any time-sensitive football data

NO SEARCH (false):
- Historical facts (Istanbul 2005, treble, etc.)
- General football knowledge, rules
- Player career history (retired players)
- Club history, trophies, records
- Opinions, predictions from known data
- Greetings, casual chat, site questions`},{role:"user",content:e}],max_tokens:800,temperature:0})});if(!r.ok)return console.warn(`[Intent Classifier] ${i} returned ${r.status}, skipping search`),{needsSearch:!1,searchQuery:""};let a=await r.json(),s=a.choices?.[0]?.message?.content||"",n=function(e){let t=e.match(/```(?:json)?\s*([\s\S]*?)```/),r=t?t[1]:e,a=r.indexOf("{"),s=r.lastIndexOf("}");if(-1===a||s<=a)return{};try{return JSON.parse(r.slice(a,s+1))}catch{return{}}}(s),o={needsSearch:!0===n.search,searchQuery:n.query||e};return console.log("[Intent Classifier]",{input:e.substring(0,60),...o}),o}catch(e){return console.error("[Intent Classifier] Error, skipping search:",e),{needsSearch:!1,searchQuery:""}}}let c=["deepseek-v4-flash","deepseek-v4-pro","claude-sonnet-5"];var u=e.i(229703);let d=`You are "Reds AI" — a die-hard Liverpool FC fan assistant who lives and breathes everything LFC.

## Personality
- Friendly, open, fun, and a bit cheeky — like chatting with a mate at The Kop.
- Address the user by their real name (provided in Current User section). Occasionally mix in "Red", "mate", "legend", "boss" for fun.
- Use football slang naturally: "banger", "worldie", "clean sheet", "park the bus", etc.
- Celebrate LFC wins and legends with genuine passion. Get hyped!
- Light banter about rivals is fine, but keep it fun — never toxic.
- Respond in the same language the user writes in (Vietnamese, English, etc.).
- Use emojis sparingly for emphasis: ⚽🔴🏆🔥 etc. Max 1-2 per message — keep it clean, not cluttered.

## About This Website
You are the built-in AI assistant of **${u.P.name}** — an unofficial Liverpool FC news site: it gathers reporting from across the English press, de-duplicates it and sums it up daily, alongside fixtures, results, the table and squad data. Not affiliated with Liverpool Football Club. Here's what the site offers — link users to the relevant pages when helpful:

| Page | URL | What it does |
|---|---|---|
| Home | / | Hero banner, latest news, next match, standings preview |
| Squad | /squad | Full current squad grid with position filters |
| Player | /player/{slug} | Player profile and season stats (slug = name in kebab-case, e.g. /player/alisson-becker) |
| Fixtures | /fixtures | Match timeline, results, competition filters |
| Season | /season | Season overview: fixtures and table together, past seasons |
| Standings | /standings | Live Premier League table |
| Stats | /stats | Charts — top scorers, assists, clean sheets |
| News | /news | Aggregated news from 17+ sources (EN + VI) |
| History | /history | Club timeline, trophy cabinet, legends |
| Gallery | /gallery | Photo gallery with lightbox |
| Chat | /chat | You! AI assistant for all LFC questions |
| Profile | /profile | User account, avatar, favourite players |

**CRITICAL — Internal Links:**
When mentioning any page above, you MUST output a clickable markdown link. Examples:
- "Xem đội h\xecnh tại [Squad](/squad)" ✅
- "Xem đội h\xecnh tại /squad" ❌ (WRONG — not clickable)
- "Check [Tin tức](/news) for latest updates" ✅
- "Check the news page" ❌ (WRONG — no link)
- "Bảng xếp hạng ở [đ\xe2y](/standings)" ✅

When users ask about the website or where to find something, ALWAYS include the relevant markdown links.

## Knowledge
You're an expert on:
- Liverpool FC history, trophies, and iconic moments (Istanbul 2005, etc.)
- Current and past players, managers, legends
- Match results, fixtures, standings, and predictions
- Premier League, Champions League, and all competitions
- Transfer news, rumors, and squad analysis
- Fan culture, chants, Anfield atmosphere, YNWA

## Response Format
- **Use tables whenever data can be structured** (stats, standings, comparisons, match results, player profiles, top scorers, etc.). Markdown tables are preferred.
- Keep text concise and scannable — use bullet points, bold key info.
- For match results: show score, scorers, date in a clear format.
- For player stats: table with appearances, goals, assists, etc.
- For standings: table with position, team, points, W/D/L.
- Only use long paragraphs for storytelling (history, iconic moments).

## Web Search & Citations
When web search results are provided, use them for accurate, up-to-date answers.
- Cite sources using numbered brackets matching the search result order: [1], [2], [3], etc.
- NEVER include raw URLs in your response — sources are displayed as clickable citation badges.
- Place citations right after the relevant claim, inline and natural: "Liverpool won 3-1 [1] and moved up to second [2]."
- Always cite when stating facts, stats, scores, quotes, or transfer news from search results.
- If multiple sources confirm the same fact, cite the most authoritative one.

## Scope
- ONLY answer questions about football and Liverpool FC.
- If the user asks about unrelated topics (coding, cooking, politics, etc.), politely redirect: "Ey mate, I'm all about football and the Reds! Ask me anything about LFC and I'm your guy."
- Never answer non-football questions, even if you know the answer.

## Rules
- Stay positive about LFC. Always back the Reds.
- If you don't know something, say so honestly — don't make up stats.
- YNWA! End important messages with spirit and encouragement.`;var h=e.i(991376);async function p(e){let i=await (0,r.f)(),u=process.env.VIETAPI_KEY;if(!u)return console.error("[Chat API] VIETAPI_KEY is not set"),new Response(JSON.stringify({error:"AI provider key not configured"}),{status:500,headers:{"Content-Type":"application/json"}});try{var p;let{data:{user:r},error:f}=await i.auth.getUser();if(f||!r){let e=f?.status===void 0||0===f.status||f.status>=500;if(f&&e)return console.error("[Chat API] Auth backend unavailable:",f.message),new Response(JSON.stringify({error:"Auth service unavailable",code:"auth_backend_unavailable"}),{status:503,headers:{"Content-Type":"application/json"}});return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json"}})}if(!(0,n.I)(`chat:${r.id}`,40,36e5).allowed)return new Response(JSON.stringify({error:"Rate limit exceeded"}),{status:429,headers:{"Content-Type":"application/json"}});let m=await e.json(),{model:w,conversationId:g}=m,y=(p=m.messages,Array.isArray(p)?p.filter(e=>!!e&&"object"==typeof e&&("user"===e.role||"assistant"===e.role)).map(e=>({role:e.role,content:("string"==typeof e.content?e.content:Array.isArray(e.parts)?e.parts.filter(e=>"text"===e.type).map(e=>e.text).join(""):"").slice(0,4e3)})).filter(e=>e.content.length>0).slice(-20):[]),b="string"==typeof w&&s.$.includes(w)?w:s.L;console.log(`[Chat API] User=${r.id} model=${b} msgs=${y.length} conv=${g||"new"}`);let v=!g,C=g,x="New Conversation";if(v&&y.length>0){x=y[0].content.slice(0,100);let{data:e,error:t}=await i.from("conversations").insert({user_id:r.id,title:x,model:b}).select().single();!t&&e?C=e.id:console.error("[Chat API] Error creating conversation:",t)}if(C&&y.length>0){let e=[...y].reverse().find(e=>"user"===e.role);e&&await i.from("messages").insert({conversation_id:C,role:"user",content:e.content})}let R=[...y].reverse().find(e=>"user"===e.role),{needsSearch:A,searchQuery:k}=R?await l(R.content,u):{needsSearch:!1,searchQuery:""},S=`msg-${Date.now()}`,E=`search-${Date.now()}`;return(0,t.d)({stream:(0,t.$)({async execute({writer:e}){let r="",s=null;try{if(e.write({type:"start",messageId:S}),v&&C&&e.write({type:"data-conversation",data:{conversationId:C,conversationTitle:x}}),e.write({type:"start-step"}),A){e.write({type:"tool-input-start",toolCallId:E,toolName:"web_search"}),e.write({type:"tool-input-delta",toolCallId:E,inputTextDelta:JSON.stringify({query:k})}),e.write({type:"tool-input-available",toolCallId:E,toolName:"web_search",input:{query:k}});try{s=await o(k),console.log(`[Chat API] Web search done: ${s.sources.length} sources`)}catch(e){console.error("[Chat API] Web search failed:",e)}e.write({type:"tool-output-available",toolCallId:E,output:s?{results:s.sources}:{results:[],error:"Search failed"}})}e.write({type:"text-start",id:S});let n=function(e){let t=[e];for(let r of c)r!==e&&t.push(r);return t}(b),l=null;for(let o of n){let n=null,i=!1,c=(0,t.W)({model:(0,a.f)(o),system:function(e){let t=`${d}

${(0,h.f)()}`;if(!e)return t;let r=e.sources.map((e,t)=>`[${t+1}] ${e.title||new URL(e.url).hostname}`).join("\n");return`${t}

## Web Search Results for: "${e.query}"

${e.answer}

### Available Sources
${r}

CITATION RULES (MUST follow):
- Cite sources using numbered brackets: [1], [2], etc.
- NEVER paste raw URLs or full links in your text.
- Sources with clickable links are displayed separately to the user.
- Example: "Liverpool đang dẫn đầu BXH [1] với phong độ ấn tượng [2]."`}(s),messages:y,maxOutputTokens:2e3,maxRetries:1,onError:()=>{}});try{for await(let t of c.fullStream)if("text-delta"===t.type)i=!0,r+=t.text,e.write({type:"text-delta",id:S,delta:t.text});else if("error"===t.type){n=t.error;break}}catch(e){n=e}if(!n){l=o;break}let u=n instanceof Error?n.message:String(n);if(i){console.error(`[Chat API] ${o} failed mid-answer: ${u.slice(0,200)}`),l=o;break}console.warn(`[Chat API] ${o} failed${!function(e){if(e instanceof Error){let t=e.message.toLowerCase();return t.includes("429")||t.includes("rate_limit")||t.includes("rate limit")||t.includes("tokens per day")||t.includes("tokens per minute")}return!1}(n)?"":" (rate limit)"}, trying next: ${u.slice(0,200)}`)}l?l!==b&&console.log(`[Chat API] Fell back from ${b} → ${l}`):e.write({type:"text-delta",id:S,delta:"Xin lỗi, Reds AI đang quá tải — bạn thử lại sau ít phút nhé. / Sorry, Reds AI is overloaded right now — please try again in a few minutes."}),e.write({type:"text-end",id:S}),e.write({type:"finish-step"}),e.write({type:"finish"}),C&&r&&(await i.from("messages").insert({conversation_id:C,role:"assistant",content:r}),await i.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",C))}catch(t){console.error("[Chat API] Stream error:",t),e.write({type:"error",errorText:t instanceof Error?t.message:"Unknown error"})}}})})}catch(e){return console.error("[Chat API] Error:",e),new Response(JSON.stringify({error:e instanceof Error?e.message:"Internal Error"}),{status:500,headers:{"Content-Type":"application/json"}})}}e.s(["POST",0,p,"maxDuration",0,60],397220)}]})();

//# sourceMappingURL=_0_ucz5iwh5o7-._.js.map