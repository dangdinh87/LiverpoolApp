/**
 * Nationality adjectives as they appear in squad.json ("Georgian", "Northern
 * Irish", and one data entry spelled "Wales") mapped to a flag emoji and a
 * message key under `PlayerDetail.nationalities` so the name can be shown in
 * the visitor's language ("Gruzia", not "Georgian").
 */
const NATIONALITIES: Record<string, { flag: string; key: string }> = {
  American: { flag: "🇺🇸", key: "american" },
  Argentinian: { flag: "🇦🇷", key: "argentinian" },
  Belgian: { flag: "🇧🇪", key: "belgian" },
  Brazilian: { flag: "🇧🇷", key: "brazilian" },
  Colombian: { flag: "🇨🇴", key: "colombian" },
  Czech: { flag: "🇨🇿", key: "czech" },
  Dutch: { flag: "🇳🇱", key: "dutch" },
  Egyptian: { flag: "🇪🇬", key: "egyptian" },
  English: { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", key: "english" },
  French: { flag: "🇫🇷", key: "french" },
  Georgian: { flag: "🇬🇪", key: "georgian" },
  German: { flag: "🇩🇪", key: "german" },
  Greek: { flag: "🇬🇷", key: "greek" },
  Guinean: { flag: "🇬🇳", key: "guinean" },
  Hungarian: { flag: "🇭🇺", key: "hungarian" },
  Irish: { flag: "🇮🇪", key: "irish" },
  Italian: { flag: "🇮🇹", key: "italian" },
  Japanese: { flag: "🇯🇵", key: "japanese" },
  "Northern Irish": { flag: "🇬🇧", key: "northernIrish" },
  Portuguese: { flag: "🇵🇹", key: "portuguese" },
  Scottish: { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", key: "scottish" },
  Senegalese: { flag: "🇸🇳", key: "senegalese" },
  Spanish: { flag: "🇪🇸", key: "spanish" },
  Swedish: { flag: "🇸🇪", key: "swedish" },
  Uruguayan: { flag: "🇺🇾", key: "uruguayan" },
  Welsh: { flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", key: "welsh" },
  Wales: { flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", key: "welsh" },
};

export const NATIONALITY_KEYS = [...new Set(Object.values(NATIONALITIES).map((n) => n.key))];

/** Flag and message key; unknown nationalities get a neutral flag and no key (show the raw text). */
export function getNationality(nationality: string): { flag: string; key: string | null } {
  const hit = NATIONALITIES[nationality];
  return hit ?? { flag: "🏳️", key: null };
}
