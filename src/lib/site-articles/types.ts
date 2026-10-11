/**
 * Shapes for articles the site writes about itself, as opposed to the
 * excerpt-and-link mirrors under /news.
 *
 * The split that matters: `facts` is built by code from the site's own data and
 * is the ONLY thing a draft may state, while `SiteArticleContent` is what the
 * model produces. Nothing the model returns is trusted until it has been
 * checked back against the facts it was given.
 */

export type SiteArticleKind = "review" | "preview" | "weekly" | "digest" | "history";

/** A draft, as the model returns it. */
export interface SiteArticleContent {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  sections: { heading: string; body: string }[];
}

/** One scoring event. */
export interface GoalFact {
  minute: number;
  scorer: string;
  assist: string | null;
  team: string;
  /** "goal" | "penalty" | "own goal" */
  kind: string;
}

export interface CardFact {
  minute: number;
  player: string;
  team: string;
  /** "yellow" | "red" */
  colour: string;
}

/** A pair of values, home first. */
export type HomeAway = [number, number];

/**
 * Everything a match report is allowed to say.
 *
 * Built entirely from the site's own data. The model never adds to it, and the
 * validator derives the permitted numbers and names from exactly this object.
 */
export interface MatchReviewFacts {
  kind: "review";
  competition: string;
  /**
   * What else this competition is called, so a Vietnamese article may write
   * "Ngoại hạng Anh" for the Premier League. Carried in the facts rather than
   * known to the validator: the facts are the single statement of what is true,
   * and a name in another language is the same fact.
   */
  competitionAliases: string[];
  round: string | null;
  venue: string | null;
  /** ISO 8601. */
  kickOff: string;
  home: { name: string; score: number };
  away: { name: string; score: number };
  /** Which side Liverpool played on. */
  liverpoolSide: "home" | "away";
  result: "win" | "draw" | "loss";
  halfTime: { home: number; away: number } | null;
  goals: GoalFact[];
  cards: CardFact[];
  formation: string | null;
  starters: string[];
  /** Named because the lineup feed names them; otherwise the model guesses. */
  coach: string | null;
  /** On the bench. Listed so naming one is not read as an invention. */
  substitutes: string[];
  stats: {
    possession: HomeAway | null;
    shots: HomeAway | null;
    onTarget: HomeAway | null;
    corners: HomeAway | null;
  } | null;
  /** League position after the match, when the competition has a table. */
  table: { position: number; points: number; played: number } | null;
}

/** Everything a match preview is allowed to say. */
export interface MatchPreviewFacts {
  kind: "preview";
  competition: string;
  round: string | null;
  venue: string | null;
  kickOff: string;
  home: { name: string };
  away: { name: string };
  liverpoolSide: "home" | "away";
  /** Most recent first, e.g. ["W", "D", "L"]. */
  liverpoolForm: string[];
  opponentForm: string[];
  /** Previous meetings, most recent first. */
  headToHead: { date: string; home: string; away: string; score: HomeAway }[];
  table: { position: number; points: number; played: number } | null;
  opponentTable: { position: number; points: number; played: number } | null;
}

export type ArticleFacts = MatchReviewFacts | MatchPreviewFacts;
