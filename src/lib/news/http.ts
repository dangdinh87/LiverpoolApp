/**
 * One honest User-Agent for every outbound news request (RSS, listing pages,
 * article scraping). Reach-network sites (Echo, Mirror, MEN, liverpool.com) and
 * ESPN answer 403 / challenge pages to a spoofed Chrome UA but 200 to this one.
 */
export const NEWS_USER_AGENT = "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)";
