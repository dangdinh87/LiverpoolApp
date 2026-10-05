import { revalidatePath } from "next/cache";
import { routing } from "./routing";

// Pages live under app/[locale], so their cache entries are keyed by the
// locale-prefixed path (/vi/news, /en/news), not the public URL (/news).
// revalidatePath("/news") alone would silently do nothing.
export function revalidateLocalizedPath(path: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${path === "/" ? "" : path}`);
  }
}
