(()=>{"use strict";module.exports=[69569,e=>{var t=e.i(747909),a=e.i(174017),r=e.i(996250),n=e.i(759756),i=e.i(561916),s=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),c=e.i(47587),h=e.i(666012),p=e.i(570101),f=e.i(626937),m=e.i(10372),w=e.i(193695),v=e.i(509580);e.i(52474);var g=e.i(257297);let x=new t.AppRouteRouteModule({definition:{kind:a.f.APP_ROUTE,page:"/llms.txt/route",pathname:"/llms.txt",filename:"route",bundlePath:""},distDir:".next-seo-check",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/llms.txt/route.ts",nextConfigOutput:"",userland:()=>e.r(530214),...{}}),{workAsyncStorage:y,workUnitAsyncStorage:R,serverHooks:b}=x;async function C(e,t,r){r.requestMeta&&(0,n.R)(e,r.requestMeta),x.isDev&&(0,n.i)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/llms.txt/route";y=y.replace(/\/index$/,"")||"/";let R=await x.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:b,deploymentId:C,params:E,nextConfig:T,parsedUrl:P,isDraftMode:A,prerenderManifest:S,routerServerContext:k,isOnDemandRevalidate:$,revalidateOnlyGenerated:O,resolvedPathname:U,clientReferenceManifest:q,serverActionsManifest:L,previewProps:M}=R,D=(0,o.f)(y),I=!!S.routes[U]&&(x.isDev||(0,v.f)(U,x.cacheOwner,S.routes[U])),N=!!(S.dynamicRoutes[D]||I),_=async()=>((null==k?void 0:k.render404)?await k.render404(e,t,P,!1):t.end("This page could not be found"),null);if(N&&!A){let e=S.dynamicRoutes[D];if(e&&!1===e.fallback&&!I){if(T.adapterPath)return await _();throw new w.NoFallbackError}}let H=null;!N||x.isDev||A||(H="/index"===(H=U)?"/":H),L&&q&&(0,s.f)({page:y,clientReferenceManifest:q,serverActionsManifest:L});let G=e.method||"GET",j=(0,i.v)(),F=j.getActiveScopeSpan(),B=!!(null==k?void 0:k.isWrappedByNextServer),K=!!(0,n.w)(e,"minimalMode"),V=(0,n.w)(e,"incrementalCache")||await x.getIncrementalCache(e,T,M,S,K);null==V||V.resetRequestCache(),globalThis.__incrementalCache=V;let W={params:E,previewProps:M,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts,useCacheTimeout:T.experimental.useCacheTimeout,durableUseCacheEntries:!!T.experimental.durableUseCacheEntries},cacheComponents:!!T.cacheComponents,validationLevel:T.experimental.instantInsights.validationLevel,isDraftMode:A,incrementalCache:V,hmrRefreshHash:(0,n.w)(e,"hmrRefreshHash"),cacheLifeProfiles:T.cacheLife,staticPageGenerationTimeout:T.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0},sharedContext:{buildId:b,deploymentId:C}},J=new l.x(e),Q=new l.e(t),z=u.k.fromNodeNextRequest(J,(0,u.t)(t)),Z=async({previousCacheEntry:a})=>{try{if(!K&&$&&O&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=null===H?await x.handle(z,W):await x.prerender(z,W);e.fetchMetrics=W.renderOpts.fetchMetrics;let i=W.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let s=W.renderOpts.collectedTags;if(!N)return await (0,h.f)(J,Q,n,i),null;{let e=await n.blob(),t=(0,p.S)(n.headers);s&&(t[m.M]=s),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=m.Q)&&W.renderOpts.collectedRevalidate,r=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=m.Q?!1!==a&&a>0?T.expireTime:void 0:W.renderOpts.collectedExpire;return{value:{kind:g.x.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.f)({isStaticGeneration:null!==H,isOnDemandRevalidate:$})},!1,k),t}},X=async(n,s)=>{try{var o,l;let n=await x.handleResponse({req:e,nextConfig:T,cacheKey:H,routeKind:a.f.APP_ROUTE,isFallback:!1,previewProps:M,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:$,revalidateOnlyGenerated:O,responseGenerator:Z,waitUntil:r.waitUntil,isMinimalMode:K});if(null!==n&&"error"in n)throw n.error;if(!N)return;if((null==n||null==(o=n.value)?void 0:o.kind)!==g.x.APP_ROUTE)throw Error(`Invariant: app-route received invalid cache entry ${null==n||null==(l=n.value)?void 0:l.kind}`);K||t.setHeader("x-nextjs-cache",$?"REVALIDATED":n.isMiss?"MISS":n.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,p.G)(n.value.headers);K&&N||i.delete(m.M),!n.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,f.f)(n.cacheControl)),await (0,h.f)(J,Q,new Response(n.value.body,{headers:i,status:n.value.status||200}));return}catch(a){if(a instanceof w.NoFallbackError||await x.onRequestError(e,a,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,c.f)({isStaticGeneration:null!==H,isOnDemandRevalidate:$})},!1,k),N)throw a;if(t.headersSent){if(n){let e=a instanceof Error?a:Error("Unknown app route error");n.recordException(e),n.setStatus({code:i.J.ERROR,message:e.message}),n.setAttribute("error.type",e.name)}t.writableEnded||t.destroyed||t.end()}else await (0,h.f)(J,Q,new Response(null,{status:500}));return}finally{(()=>{if(!n)return;let e=t.statusCode;n.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(n.setStatus({code:i.J.ERROR}),n.setAttribute("error.type",e.toString()));let a=j.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.q.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route")||D,o=`${G} ${r}`;n.setAttributes({"next.route":r,"http.route":r,"next.span_name":o}),n.updateName(o),s&&s!==n&&(s.setAttribute("http.route",r),s.updateName(o))})()}};if(B&&F)await X(F,void 0);else{let t=j.getActiveScopeSpan();await j.withPropagatedContext(e.headers,()=>j.trace(d.q.handleRequest,{spanName:`${G} ${y}`,kind:i.C.SERVER,attributes:{"http.method":G,"http.target":e.url}},e=>X(e,t)),void 0,!B)}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,r.f)({workAsyncStorage:y,workUnitAsyncStorage:R})},"routeModule",0,x,"serverHooks",0,b,"workAsyncStorage",0,y,"workUnitAsyncStorage",0,R])},530214,e=>{var t=e.i(229703),a=e.i(123014);e.s(["GET",0,function(){let e="https://anfielddaily.com",r=a.n.defaultLocale;return new Response(`# ${t.P.name}

> ${(0,t.t)(r)}

${t.P.name} is an unofficial Liverpool FC news site. It is not affiliated with
Liverpool Football Club or the Premier League.

## Written here

These pages are this site's own work and are the ones to cite.

- [Daily briefing](${e}/news/digest): one briefing a day, written from
  that day's reporting across the outlets below, de-duplicated and summarised.
- [Match analysis](${e}/analysis): match reports built from the match
  data feed — lineups, events and statistics — not rewritten from anyone's
  article.

## Gathered from elsewhere

- [News roundup](${e}/news): headlines from across the English
  press, each shown as a headline, a short excerpt and a link to the
  original. The full article always lives with the publisher who wrote it.

Those roundup pages carry \`noindex\` on purpose. They are a way to find the
original, not a copy of it. Cite and link the original publisher, not this
site, for anything that appeared there first.

## Reference

- [Fixtures and results](${e}/fixtures)
- [Premier League table](${e}/standings)
- [Squad](${e}/squad)
- [Statistics](${e}/stats)
- [Club history](${e}/history)

Kick-off times render in the reader's own time zone, so a time read from the
HTML is the server's fallback and not what a given reader sees.

## Languages

English at the bare path, Vietnamese under \`/vi\` (${a.n.locales.join(", ")}).

## Contact

${t.P.contactEmail}
`,{headers:{"Content-Type":"text/markdown; charset=utf-8","Cache-Control":"public, max-age=3600, s-maxage=3600"}})},"dynamic",0,"force-static"])}]})();

//# sourceMappingURL=_02angetmc4jzk._.js.map