import { GoogleTagManager as NextGTM } from '@next/third-parties/google';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function GoogleTagManager() {
  if (!GTM_ID) return null;
  return <NextGTM gtmId={GTM_ID} />;
}
