import { z } from "zod";

export const RawFeedItemSchema = z.object({
  title: z.string().min(5),
  link: z.string().url(),
  pubDate: z.string().optional(),
  contentSnippet: z.string().optional().default(""),
});

export type ValidFeedItem = z.infer<typeof RawFeedItemSchema>;

export function validateFeedItems(items: unknown[]): ValidFeedItem[] {
  return items
    .map((item) => RawFeedItemSchema.safeParse(item))
    .filter((r): r is z.ZodSafeParseSuccess<ValidFeedItem> => r.success)
    .map((r) => r.data);
}
