"use client";

import { useEffect } from "react";
import { markAsRead } from "@/lib/news/read-history";

/** Zero-render component that marks an article as read on mount */
export function ReadTracker({ articleUrl }: { articleUrl: string }) {
  useEffect(() => {
    markAsRead(articleUrl);
  }, [articleUrl]);
  return null;
}
