import { describe, expect, it } from "vitest";
import {
  selectLiverpoolElements,
  type FplBootstrapResponse,
  type FplElement,
} from "@/lib/football/fpl-stats";

function element(id: number, team: number, webName: string): FplElement {
  return {
    id,
    team,
    web_name: webName,
    first_name: webName,
    second_name: webName,
    element_type: 3,
    minutes: 90,
    starts: 1,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps: 0,
    influence: "0",
    creativity: "0",
    threat: "0",
    expected_goals: "0",
    expected_assists: "0",
    expected_goal_involvements: "0",
    expected_goals_conceded: "0",
    total_points: 0,
    points_per_game: "0",
    selected_by_percent: "0",
    form: "0",
  } as FplElement;
}

describe("selectLiverpoolElements", () => {
  it("finds Liverpool by short name, whatever its id is this season", () => {
    // 2026/27 ordering: id 12 is Ipswich, Liverpool is 14.
    const data: FplBootstrapResponse = {
      teams: [
        { id: 12, name: "Ipswich Town", short_name: "IPS" },
        { id: 14, name: "Liverpool", short_name: "LIV" },
      ],
      elements: [element(1, 12, "Walton"), element(2, 14, "Szoboszlai"), element(3, 14, "Gakpo")],
    };
    expect(selectLiverpoolElements(data).map((p) => p.webName)).toEqual(["Szoboszlai", "Gakpo"]);
  });

  it("returns nothing (rather than another club) when Liverpool is missing", () => {
    const data: FplBootstrapResponse = {
      teams: [{ id: 12, name: "Ipswich Town", short_name: "IPS" }],
      elements: [element(1, 12, "Walton")],
    };
    expect(selectLiverpoolElements(data)).toEqual([]);
  });
});
