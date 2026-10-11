import { describe, expect, it } from "vitest";
import { validateDraft } from "@/lib/site-articles/validate-draft";
import type { SiteArticleContent } from "@/lib/site-articles/types";
import { REVIEW_FACTS } from "./review-facts-fixture";

/** A draft that states only what the facts contain. */
function goodDraft(): SiteArticleContent {
  return {
    title: "Liverpool 2-1 Manchester City: Gakpo settles it at Anfield",
    excerpt: "Mohamed Salah opened the scoring, Erling Haaland levelled, and Cody Gakpo won it late.",
    metaTitle: "Liverpool 2-1 Manchester City — match report",
    metaDescription: "Goals from Mohamed Salah and Cody Gakpo gave Liverpool a 2-1 win over Manchester City.",
    sections: [
      {
        heading: "How it went",
        body:
          "Mohamed Salah put Liverpool ahead on 23 minutes, with Florian Wirtz providing the assist. " +
          "Erling Haaland levelled for Manchester City on 41, and the sides went in at 1-1. " +
          "Cody Gakpo scored on 78 to settle it.",
      },
      {
        heading: "The numbers",
        body: "Liverpool had 54 percent of the ball and 14 shots, 6 of them on target.",
      },
    ],
  };
}

describe("validateDraft", () => {
  it("accepts a draft that only states what the facts contain", () => {
    expect(validateDraft(goodDraft(), REVIEW_FACTS).ok).toBe(true);
  });

  it("rejects a number the facts do not support", () => {
    // The whole point: with no human reading these, an invented scoreline or
    // stat would publish silently.
    const draft = goodDraft();
    draft.sections[1].body = "Liverpool had 73 percent of the ball.";
    const report = validateDraft(draft, REVIEW_FACTS);
    expect(report.ok).toBe(false);
    expect(report.problems.join(" ")).toMatch(/73/);
  });

  it("rejects a scorer who did not play", () => {
    const draft = goodDraft();
    draft.sections[0].body = "Darwin Nunez put Liverpool ahead on 23 minutes.";
    const report = validateDraft(draft, REVIEW_FACTS);
    expect(report.ok).toBe(false);
    expect(report.problems.join(" ")).toMatch(/Darwin Nunez/);
  });

  it("rejects an invented competition or venue", () => {
    const draft = goodDraft();
    draft.sections[0].body = "Liverpool won at the Etihad Stadium.";
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });

  it("rejects claims about things data cannot show", () => {
    // The article did not watch the match; it has numbers, not eyes.
    for (const body of [
      "The atmosphere at Anfield was electric from the first whistle.",
      "Arne Slot said his side deserved the win.",
      "The dressing room will be delighted tonight.",
    ]) {
      const draft = goodDraft();
      draft.sections[0].body = body;
      const report = validateDraft(draft, REVIEW_FACTS);
      expect(report.ok, body).toBe(false);
      expect(report.problems.join(" "), body).toMatch(/cannot be seen in the data/i);
    }
  });

  it("allows the structural constants of a football match", () => {
    const draft = goodDraft();
    draft.sections[0].body = "The match lasted 90 minutes, level at 1-1 after 45.";
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(true);
  });

  it("allows a sentence to begin with a capitalised ordinary word", () => {
    const draft = goodDraft();
    draft.sections[0].body = "After the break, Liverpool pushed on. Both sides had chances.";
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(true);
  });

  it("rejects an empty or stub draft", () => {
    const draft = goodDraft();
    draft.sections = [];
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });

  it("rejects a link to anywhere", () => {
    const draft = goodDraft();
    draft.sections[0].body += " Read more at https://example.com/report";
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });

  it("names every problem it found, not just the first", () => {
    const draft = goodDraft();
    draft.sections[0].body = "Darwin Nunez scored on 99 minutes.";
    expect(validateDraft(draft, REVIEW_FACTS).problems.length).toBeGreaterThan(1);
  });
});

describe("validateDraft — how writers actually write", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it at Anfield.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("accepts possessives of names in the data", () => {
    // Caught on a real draft: "Gakpo's late goal" was rejected as an unknown name.
    const draft = { ...base, sections: [{ heading: "How it went", body: "Gakpo's goal on 78 settled it. Liverpool's win was narrow." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("accepts a shortening of a club the data names in full", () => {
    // The feed says "Manchester City"; nobody writes that twice in a paragraph.
    const draft = { ...base, sections: [{ heading: "How it went", body: "Man City levelled through Erling Haaland on 41." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("still rejects a name that merely looks plausible", () => {
    // The relaxation must not become a hole: an invented surname prefixes nothing.
    const draft = { ...base, sections: [{ heading: "How it went", body: "Darwin Nunez scored on 78." }] };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });
});

describe("validateDraft — caught in the wild", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it at Anfield.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("lets a sentence open with a counting word", () => {
    // A real draft was rejected for starting sentences "One of...", "Two of...".
    const draft = { ...base, sections: [{ heading: "How it went",
      body: "Two of the three goals came for Liverpool. One of them was on 78." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("still catches a scorer invented to fill a gap in the data", () => {
    // The case this was found on: the feed gave a 0-1 with no scorer, and the
    // model supplied one. Nothing downstream would have questioned it.
    const draft = { ...base, sections: [{ heading: "How it went",
      body: "Isak's 57th-minute strike settled it." }] };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });
});

describe("validateDraft — dates", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it at Anfield.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("accepts the kick-off date written the way a person writes it", () => {
    // The facts carry "2026-10-11T15:30:00Z"; a draft saying "11 October 2026"
    // states the same fact and was being rejected for it.
    const draft = { ...base, sections: [{ heading: "How it went",
      body: "Liverpool beat Manchester City on 11 October 2026." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("does not let a wrong date through on the strength of the right one", () => {
    const draft = { ...base, sections: [{ heading: "How it went",
      body: "Liverpool beat Manchester City on 29 October 2026." }] };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });
});

describe("validateDraft — headings", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it at Anfield.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("does not read Title Case as a string of names", () => {
    // Real rejections: "Goal Gives Liverpool", "Bookings", "Half-time".
    const draft = {
      ...base,
      title: "Late Goal Gives Liverpool The Win",
      sections: [
        { heading: "Bookings", body: "Ryan Gravenberch was booked on 66." },
        { heading: "Half-time", body: "The score was 1-1 at the break." },
      ],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("still catches an invented name inside a Title Case heading", () => {
    // The exemption must not swallow the thing it exists to find.
    const draft = { ...base, title: "Isak Goal Gives Liverpool The Win" };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });

  it("accepts the club's own nicknames", () => {
    const draft = { ...base, sections: [{ heading: "The Reds", body: "The Reds won at Anfield." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });
});

describe("validateDraft — ordinary words the draft defines for itself", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it at Anfield.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("treats a heading word as ordinary when the body writes it in lower case", () => {
    // "Booked" was rejected as a name; the body right under it says "was booked".
    const draft = {
      ...base,
      sections: [{ heading: "Booked", body: "Ryan Gravenberch was booked on 66." }],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("does not excuse a name that is only ever capitalised", () => {
    const draft = {
      ...base,
      sections: [{ heading: "Isak", body: "Isak scored on 78." }],
    };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });
});

describe("validateDraft — the weekday a date implies", () => {
  it("accepts the weekday of the kick-off date", () => {
    // 2026-10-11 was a Sunday; a draft saying so states the date's own content.
    const draft = {
      title: "Liverpool 2-1 Manchester City",
      excerpt: "Cody Gakpo settled it.",
      metaTitle: "Liverpool 2-1 Manchester City",
      metaDescription: "Cody Gakpo settled it.",
      sections: [{ heading: "How it went", body: "Liverpool won on Sunday at Anfield." }],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });
});

describe("validateDraft — the Vietnamese article", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo ấn định tỷ số.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo ghi bàn ở phút 78.",
    sections: [{ heading: "Diễn biến", body: "Cody Gakpo ghi bàn ở phút 78." }],
  };

  it("accepts Vietnamese prose built from the same facts", () => {
    // No Vietnamese article was ever published: every draft tripped on ordinary
    // Vietnamese words being read as names.
    const draft = {
      ...base,
      sections: [
        { heading: "Kết quả", body: "Đội chủ nhà thắng 2-1. Cả hai bàn của Liverpool đều đến trong hiệp hai." },
        { heading: "Bối cảnh", body: "Trận đấu thuộc Ngoại hạng Anh. The Reds có 54 phần trăm thời lượng cầm bóng." },
      ],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("still catches an invented name in Vietnamese", () => {
    const draft = { ...base, sections: [{ heading: "Diễn biến", body: "Darwin Nunez ghi bàn ở phút 78." }] };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });
});

describe("validateDraft — one-letter Vietnamese openers", () => {
  it("does not treat a one-letter opener as a name", () => {
    // "Ở hiệp hai..." — the token filter stripped it to nothing, and an empty
    // name was then reported as unknown.
    const draft = {
      title: "Liverpool 2-1 Manchester City",
      excerpt: "Cody Gakpo ghi bàn.",
      metaTitle: "Liverpool 2-1 Manchester City",
      metaDescription: "Cody Gakpo ghi bàn.",
      sections: [{ heading: "Kết quả", body: "Ở hiệp hai, Cody Gakpo ghi bàn ở phút 78." }],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });
});

describe("validateDraft — forms of a fact already present", () => {
  const base = {
    title: "Liverpool 2-1 Manchester City",
    excerpt: "Cody Gakpo settled it.",
    metaTitle: "Liverpool 2-1 Manchester City",
    metaDescription: "Cody Gakpo settled it.",
    sections: [{ heading: "How it went", body: "Cody Gakpo scored on 78." }],
  };

  it("accepts an ordinal built from a minute in the data", () => {
    const draft = { ...base, sections: [{ heading: "How it went", body: "Cody Gakpo's 78th-minute goal won it." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });

  it("rejects an ordinal built from a minute that is not", () => {
    const draft = { ...base, sections: [{ heading: "How it went", body: "Cody Gakpo's 61st-minute goal won it." }] };
    expect(validateDraft(draft, REVIEW_FACTS).ok).toBe(false);
  });

  it("accepts the manager, now that the lineup feed names them", () => {
    // "Arne Slot" was rejected while the facts carried no coach — correct then,
    // and fixed by putting the coach in the facts rather than loosening this.
    const draft = { ...base, sections: [{ heading: "How it went", body: "Arne Slot named a 4-3-3." }] };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });
});

describe("validateDraft — articles inside a name run", () => {
  it("accepts a nickname introduced mid-sentence", () => {
    // "Với The Reds..." kept failing: the article was only stripped when it
    // opened the run, so "the" survived in the middle of one.
    const draft = {
      title: "Liverpool 2-1 Manchester City",
      excerpt: "Cody Gakpo ghi bàn.",
      metaTitle: "Liverpool 2-1 Manchester City",
      metaDescription: "Cody Gakpo ghi bàn.",
      sections: [{ heading: "Kết quả", body: "Với The Reds, đây là trận thắng thứ hai. The Reds dẫn 2-1." }],
    };
    expect(validateDraft(draft, REVIEW_FACTS).problems).toEqual([]);
  });
});
