import { describe, expect, it } from "vitest";
import squad from "@/data/squad.json";
import { moderateDisplayName, moderateMessageContent } from "../moderation";

describe("community moderation & anti-spam", () => {
  it("blocks Vietnamese and English profanity including separator and stretch obfuscation", () => {
    for (const bad of [
      "địt mẹ trọng tài",
      "đ.ị.t con mẹ",
      "thằng óc chó này",
      "đá như lồn vậy v.c.l",
      "đm đá chán quá",
      "what the f*ck was that ref",
      "f u c k this VAR",
      "total bullshit decision",
      "fuuuuuuuck off",
    ]) {
      const res = moderateMessageContent(bad, { allowLinks: false });
      expect(res, bad).toEqual({ ok: false, reason: "profanity" });
    }
  });

  it("blocks gambling, casino, Zalo/Telegram solicitation, guest links, and floods", () => {
    for (const spam of [
      "Vào kubet nhận 100k miễn phí",
      "Kéo nhóm tài xỉu zalo 0912345678",
      "Tham gia https://t.me/keobongvip ngay",
      "Xem trực tiếp tại https://evil-stream.example",
      "Nhắn www.nhacai88.bet để nhận code",
      "goallllllllllll anfield",
      "spam spam spam spam spam",
      "ALL CAPS SHOUTING ACROSS THE WHOLE MESSAGE BOX NOW",
    ]) {
      const res = moderateMessageContent(spam, { allowLinks: false });
      expect(res, spam).toEqual({ ok: false, reason: "spam" });
    }
  });

  it("allows at most one standard link for signed-in members while still blocking shady links", () => {
    expect(
      moderateMessageContent("Read the breakdown https://anfielddaily.com/analysis", {
        allowLinks: true,
      }).ok,
    ).toBe(true);

    expect(
      moderateMessageContent("Visit https://a.com and https://b.com", {
        allowLinks: true,
      }),
    ).toEqual({ ok: false, reason: "spam" });

    expect(
      moderateMessageContent("Join https://t.me/scamgroup", {
        allowLinks: true,
      }),
    ).toEqual({ ok: false, reason: "spam" });
  });

  it("produces zero false positives on legitimate football discussions and all active squad players", () => {
    const cleanMessages = [
      "Arsenal thắng 2-1 ở lượt đi rồi",
      "Alonso cho mượn từ London rất hợp chiến thuật",
      "Gravenberch đá DM quá hay trận này",
      "Slot điều chỉnh pressing hiệp 2 cực đỉnh",
      "Salah kiến tạo cúp châu Âu đêm nay",
      "Dự đoán Liverpool 2-0 và giữ sạch lưới",
      "Pass accuracy and class from Szoboszlai in midfield",
      "Đọc thêm tin trên Liverpool.com tối nay",
    ];

    for (const msg of cleanMessages) {
      const res = moderateMessageContent(msg, { allowLinks: false });
      expect(res.ok, msg).toBe(true);
    }

    for (const player of squad.players) {
      const check = moderateDisplayName(player.name);
      expect(check.ok, `player name false positive: ${player.name}`).toBe(true);
    }
  });

  it("enforces default 300-char limit and max 3 line breaks", () => {
    const exact300 =
      Array.from({ length: 80 }, (_, i) => `word${String(i).padStart(2, "0")}`)
        .join(" ")
        .slice(0, 299) + "z";
    expect(exact300.length).toBe(300);
    expect(moderateMessageContent(exact300, { allowLinks: false }).ok).toBe(true);
    expect(moderateMessageContent(`${exact300}x`, { allowLinks: false })).toEqual({
      ok: false,
      reason: "invalid_length",
    });

    expect(moderateMessageContent("line 1\nline 2\nline 3\nline 4", { allowLinks: false }).ok).toBe(
      true,
    );
    expect(
      moderateMessageContent("line 1\nline 2\nline 3\nline 4\nline 5", { allowLinks: false }),
    ).toEqual({
      ok: false,
      reason: "spam",
    });
  });

  it("rejects offensive, reserved, or spam display names while keeping normal nicknames", () => {
    expect(moderateDisplayName("Kopite Hà Nội")).toEqual({ ok: true, name: "Kopite Hà Nội" });
    expect(moderateDisplayName("")).toEqual({ ok: true, name: null });
    expect(moderateDisplayName("kubet88vip")).toEqual({ ok: false, reason: "spam" });
    expect(moderateDisplayName("Admin")).toEqual({ ok: false, reason: "spam" });
    expect(moderateDisplayName("óc chó 123")).toEqual({ ok: false, reason: "profanity" });
  });
});
