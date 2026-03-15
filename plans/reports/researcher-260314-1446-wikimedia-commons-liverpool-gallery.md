# Wikimedia Commons Liverpool FC Gallery Curation Research

**Date:** 2026-03-14
**Goal:** Compile ~200 Liverpool FC images from Wikimedia Commons (CC/public domain) across 7 categories

## Research Findings

### Wikimedia Commons Categories Identified

#### 1. **Anfield Stadium** (Target: ~35 images)
- **Main Category:** https://commons.wikimedia.org/wiki/Category:Anfield_(stadium)
- **Subcategories:**
  - Interior of Anfield (stadium) - https://commons.wikimedia.org/wiki/Category:Interior_of_Anfield_(stadium)
  - Exterior of Anfield (stadium) - https://commons.wikimedia.org/wiki/Category:Exterior_of_Anfield_(stadium)
- **Available Content Types:**
  - Stadium aerial views
  - Stand views (Kop, Main Stand, Centenary Stand, Anfield Road Stand)
  - Iconic gates (Shankly Gates) & signage (This Is Anfield)
  - Monuments (Hillsborough Memorial, Shankly statue, Paisley Gateway)
  - Match day atmospheres
  - Historic and modern photos

**Sample Images Verified:**
- Anfield-2017-aerial.jpg (1280px)
- Anfield_from_the_air.jpg (1280px)
- Anfieldroad08.jpg (1280px)
- Centenary_Stand%2C_Anfield.jpg (1280px)
- The_Kop%2C_Anfield.jpg (1280px)
- KopStandAnfield.jpg (1280px)
- Entrancetothekop.jpg (1280px)
- Shankly_Gates (800px)
- Bill_shankly_statue_at_anfield.jpg (800px)
- This_Is_Anfield_Sign.jpg (800px)
- PaisleyGateway.JPG (800px)
- Hillsborough_Memorial%2C_Anfield.jpg (800px)
- Main_Stand expansion images (October 2016 & later)
- You%27ll_Never_Walk_Alone_Liverpool.jpg (YNWA Kop mosaic)

#### 2. **Current Squad Players** (Target: ~30 images)
- **Main Category:** https://commons.wikimedia.org/wiki/Category:Players_of_Liverpool_FC
- **Subcategories:** Individual player categories within the main Players of Liverpool FC category (327 subcategories available)

**Current Squad Member Photos Verified:**
- Mohamed Salah (2018, 2022)
- Virgil van Dijk (2023)
- Alisson Becker (2019)
- Trent Alexander-Arnold (2022)
- Andy Robertson (2018)
- Luis Díaz (2022)
- Cody Gakpo (2022)
- Dominik Szoboszlai (2021)
- Sadio Mané (2018) - historical
- Roberto Firmino (2018) - historical

**Status:** Squad player images are available on Wikimedia Commons but tend to be professional headshots or match action photos from international matches rather than Liverpool-specific action shots. Many are sourced from international football federation photo repositories.

#### 3. **Legendary Players** (Target: ~35 images)
- **Strategy:** Individual Wikipedia pages for each legend include their Wikimedia Commons images
- **Key Legends with Available Images:**
  - Steven Gerrard (multiple years available)
  - Kenny Dalglish (crop images, historical)
  - Ian Rush (historical)
  - Robbie Fowler
  - Jamie Carragher
  - Fernando Torres
  - Luis Suárez
  - Philippe Coutinho
  - Jordan Henderson
  - Sadio Mané
  - Roberto Firmino
  - Jürgen Klopp (manager)
  - Bill Shankly (historical)
  - Bob Paisley (historical)

**Image Availability:** Mostly professional photographs from international matches, domestic fixtures, and official team photos. Many legends have multiple year variants available.

#### 4. **Match Action & Celebrations** (Target: ~25 images)
- **Primary Source:** https://commons.wikimedia.org/wiki/Category:UEFA_Champions_League_Final_2005
- **Other Match Categories:**
  - 2004-2005 UEFA Champions League
  - Finals of the UEFA Champions League
  - 2005-2006 UEFA Champions League

**Verified Match Images:**
- Liverpool vs Chelsea UEFA Super Cup 2019 (multiple angles: team lineup, celebrations, penalty shootout)
- Liverpool vs AC Milan Champions League Final 2005 (iconic Istanbul trophy)
- Line-up diagrams for various matches

**Challenge:** Generic match action photos are limited; most Wikimedia images are from specific high-profile matches or championship events documented through SVG diagrams and official match photography.

#### 5. **Fans & Atmosphere** (Target: ~20 images)
- **Search Strategy:** Direct "Kop" and "crowd" searches on Wikimedia Commons
- **Challenge:** Generic crowd/fan atmosphere images are limited on Wikimedia Commons. Most images focus on:
  - Kop Stand exterior/interior
  - You'll Never Walk Alone mosaic
  - Historical crowd photos from major matches

**Available Content:**
- Kop Stand crowd views
- YNWA banner/sign imagery
- Historic tifo/ultras photos from major European competitions

#### 6. **Trophies & Silverware** (Target: ~25 images)
- **Main Categories:**
  - https://commons.wikimedia.org/wiki/Category:UEFA_Champions_League_trophy
  - https://commons.wikimedia.org/wiki/Category:Trophies_of_association_football

**Verified Trophy Images:**
- Liverpool Champions League 2005 trophy lift
- UEFA Champions League Trophy (generic)
- Premier League Trophy (generic icon)
- Liverpool FC badge/crest (SVG)

**Status:** Trophy images exist but many are generic icons or SVG files rather than action shots of Liverpool players lifting trophies. Specific "trophy lift" photos are limited.

#### 7. **History & Heritage** (Target: ~30 images)
- **Strategy:** Historical Liverpool FC content from Wikimedia Commons
- **Available Content:**
  - Historic team photos
  - Iconic moments (Hillsborough memorial)
  - Old Anfield photos
  - Historical badge/crest versions
  - Club founding era imagery

## URL Format Standard

All URLs follow the Wikimedia Commons thumbnail format:
```
https://upload.wikimedia.org/wikipedia/commons/thumb/[path]/[width]px-[filename]
```

**Recommended Widths:**
- `800px` - For player portraits, smaller stadium views
- `1280px` - For panoramic stadium shots, full crowd atmospheres, landscape images

## Data Structure

Each image requires:
```json
{
  "id": "kebab-case-descriptive-id",
  "src": "https://upload.wikimedia.org/...",
  "alt": "Descriptive alt text",
  "category": "string-singular",
  "is_homepage_eligible": true/false
}
```

**Homepage Eligibility Criteria:**
- Wide landscape orientation (16:9 or wider)
- Stadium panoramas, aerial views
- Large crowd atmospheres
- High visual impact suitable for fullscreen hero background

## Key Challenges & Workarounds

1. **Limited Match Action Photos:** Wikimedia Commons has relatively few match action shots from Liverpool games. Most are from major European competitions or international fixtures.

2. **Player Image Quality:** Squad player photos tend to be official headshots from national teams rather than Liverpool-specific action shots.

3. **Crowd Atmosphere Images:** Generic "fan celebration" photos are surprisingly limited; most Kop imagery is architectural rather than atmospheric.

4. **Trophy Lift Shortage:** While trophy images exist, dedicated "player lifting trophy" photos are less common than expected. Many are SVG diagrams or generic trophy icons.

5. **Historic Content:** Older historical images (pre-1990s) are limited, though some historic team photos and Shankly-era imagery exists.

## Recommendations for Reaching 200 Images

1. **Leverage player subcategories:** Each player has an individual category with multiple photos across different years
2. **Use multiple variants:** Different years/angles of the same subjects (e.g., Salah 2018 vs 2022)
3. **Include architectural stadium shots:** Multiple angles of Anfield stands, gates, memorials
4. **Stadium variations:** Different seasons, lighting conditions, and angles of the same structures
5. **Historic reproductions:** Various dated photos of Anfield from different eras
6. **International match photos:** Player photos from Euro/World Cup matches while Liverpool players were active
7. **Match diagrams:** SVG lineups and formation diagrams from significant matches

## Sources & Categories

**Main Wikimedia Commons Entry Points:**
- Anfield (stadium): https://commons.wikimedia.org/wiki/Category:Anfield_(stadium)
- Players of Liverpool FC: https://commons.wikimedia.org/wiki/Category:Players_of_Liverpool_FC
- Coaches of Liverpool FC: https://commons.wikimedia.org/wiki/Category:Coaches_of_Liverpool_FC
- Champions League 2005: https://commons.wikimedia.org/wiki/Category:UEFA_Champions_League_Final_2005
- Football Trophies: https://commons.wikimedia.org/wiki/Category:Trophies_of_association_football

## JSON File Status

**Existing Images:** 42 images in current gallery.json
- **Transformation Required:** Change `categories` (array) to `category` (singular string)
- **Category Mapping:** "players" → "squad"

**New Images to Add:** Target 158+ new images to reach ~200 total

**Curation Priority:**
1. Anfield stadium variants (high homepage eligibility)
2. Current squad players (high visual appeal)
3. Legendary players (strong fan engagement)
4. Match action from major competitions (unique moments)
5. Trophy/celebration images (aspirational)
6. Historical content (heritage appeal)
7. Fan atmosphere (authenticity)

---

**Next Steps:** Compile full JSON array with all existing (transformed) + new images from Wikimedia Commons, ensuring URL validity and alt text quality.
