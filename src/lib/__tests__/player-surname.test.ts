import { describe, expect, it } from "vitest";
import { playerSurname } from "../player-surname";

describe("playerSurname", () => {
  it.each([
    ["Virgil van Dijk", "van Dijk"],
    ["Alexis Mac Allister", "Mac Allister"],
    ["Frenkie de Jong", "de Jong"],
    ["Ruben dos Santos", "dos Santos"],
    ["Joel Matip van der Berg", "van der Berg"],
    ["Alisson Becker", "Becker"],
    ["Trent Alexander-Arnold", "Alexander-Arnold"],
    ["Jeremie Frimpong", "Frimpong"],
    ["Salah", "Salah"],
    ["  Cody   Gakpo ", "Gakpo"],
  ])("%s -> %s", (name, surname) => {
    expect(playerSurname(name)).toBe(surname);
  });

  it("does not run past the first word", () => {
    expect(playerSurname("van Dijk")).toBe("van Dijk");
    expect(playerSurname("de")).toBe("de");
  });
});
