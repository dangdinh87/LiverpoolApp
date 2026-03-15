/** Admin email — only this account can upload/delete gallery images and change site settings */
export const ADMIN_EMAIL = "nguyendangdinh47@gmail.com";

/** Gallery image categories */
export const GALLERY_CATEGORIES = [
  "anfield",
  "squad",
  "matches",
  "fans",
  "legends",
  "trophies",
  "history",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

/** Check if an email belongs to the admin */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
