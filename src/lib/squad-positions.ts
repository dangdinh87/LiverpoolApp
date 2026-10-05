/**
 * Position labels and ordering. Kept apart from squad-data.ts on purpose: that
 * module imports the whole squad.json (every bio, ~26 KB gzip), so a client
 * component importing a constant from it shipped the data set to the browser.
 */
export type PlayerPosition = "goalkeeper" | "defender" | "midfielder" | "forward";

export const POSITION_DISPLAY: Record<PlayerPosition, string> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
};

export const POSITION_ORDER: Record<PlayerPosition, number> = {
  goalkeeper: 0,
  defender: 1,
  midfielder: 2,
  forward: 3,
};
