# ⚔️ Portal Clash - Project Roadmap & Task List

This file tracks the development milestones, implementation checklists, and progress of the **Portal Clash** project.

---

## 🗺️ Project Milestones

- [x] **Milestone 1: Setup and Repository Connection**
- [ ] **Milestone 2: Unit Roster Alignment (5-Tier Roster)**
- [ ] **Milestone 3: UI/UX Aesthetics Polish (itch.io ready)**
- [ ] **Milestone 4: Publishing Prep (Packaging & Verification)**

---

## 📋 Detailed Checklists

### 🔹 Milestone 1: Setup and Repository Connection
- [x] Connect local workspace to the project files.
- [x] Analyze codebase (`index.html`, `style.css`, `game.js`).
- [x] Understand current color-based 4-tier unit mechanics (`gray`, `white`, `green`, `blue`).
- [x] Review `GEMINI.md` design parameters.
- [x] Document project structure in `PROJECT_STRUCTURE.md` and organize directories:
  - [x] Create `Assets/`, `Assets/sprites/`, and `Assets/sounds/` directories.
  - [x] Create `Scripts/` directory.
  - [x] Move `game.js` to `Scripts/game.js`.
  - [x] Update `index.html` script reference to `Scripts/game.js` to prevent breakage.
  - [x] Create `Documentation/` directory and move `gamedesign_balance_sheet.md` to `Documentation/gamedesign_balance_sheet.md` while keeping `GEMINI.md` at the root for AI context.
  - [x] Reorganize `GEMINI.md` (retain developer guidelines) and extract user-facing documentation to a new root-level `README.md`.

### 🔹 Milestone 2: Unit Roster Alignment (5-Tier Roster)
Align the unit roster to the 5 distinct, high-fantasy tiers described in the game specifications:
- **Peasant** (Tier 1: cheap swarm unit, melee)
- **Archer** (Tier 2: reliable ranged damage)
- **Swordsman** (Tier 3: sturdy frontline infantry, melee)
- **Knight** (Tier 4: heavy armor and high damage, melee)
- **Wizard** (Tier 5: fragile but devastating magic user, ranged/AOE)

#### Tasks:
- [x] **Data Model & Stats Upgrade (`game.js`)**
  - [x] Define the new `STATS` object mapping stats to the 5 tiers (`peasant`, `archer`, `swordsman`, `knight`, `wizard`).
  - [x] Balance health, damage, speed, costs, and unlock gold parameters.
  - [x] Introduce range capabilities:
    - [x] Archer: Ranged attack radius (range 150px).
    - [x] Wizard: Ranged magic attack (range 220px) with splash/AOE logic.
    - [x] Melee units: Close quarters (default radius combat).
- [x] **State Preservation & Save Compatibility**
  - [x] Update persistent `state` initialization in `game.js` to track unlocks and upgrade levels for the 5-tier roster:
    - `state.unlocks: { archer: false, swordsman: false, knight: false, wizard: false }`
    - `state.upgrades: { peasant: 0, archer: 0, swordsman: 0, knight: 0, wizard: 0 }`
  - [x] Implement local storage backwards compatibility (safe schema migration from older save versions).
- [x] **UI & DOM Updates (`index.html`)**
  - [x] Update bottom summoning bar to include 5 buttons for the 5 tiers.
  - [x] Update Shop overlay to show unlock buttons for Archer, Swordsman, Knight, and Wizard.
  - [x] Update Shop overlay to show upgrade buttons for all 5 units.
- [x] **Rendering & Visual Identity**
  - [x] Replace simple solid circle/square drawings on the canvas with character-themed visuals (drawing thematic colors/shields and high-quality Emojis `🧑🌾`, `🏹`, `🗡️`, `🐎`, `🧙‍♂️` rendered directly inside the canvas units).
  - [x] Render projectiles for Archer (arrows) and Wizard (magic bolts) moving towards their targets.
- [x] **AI Behavior Upgrades**
  - [x] Update threat detection and panic rules in AI to assess a 5-tier roster.
  - [x] Allow Orc AI to summon all 5 unit types (Peasant Orcs, Archer Orcs, Swordsman Orcs, Knight Orcs, and Wizard Orcs) using equivalent AI behaviors.

### 🔹 Milestone 3: UI/UX Aesthetics Polish
Enhance look-and-feel of the game to prepare for release on platform channels (like itch.io):
- [ ] **Typography & Theme**
  - [ ] Connect a fantasy/pixel font (e.g., Press Start 2P, VT323, or Cinzel) via Google Fonts.
  - [ ] Enhance general background, borders, and margins to look clean and dark-fantasy aligned.
- [ ] **Interface & Buttons Styling**
  - [ ] Apply glowing borders, hover transitions, and retro gaming styling to all buttons and shop windows.
  - [ ] Make the scrollable middle-section scrollbar custom and minimal.
- [ ] **Polished Canvas Rendering**
  - [ ] Draw detailed graphic representation for the Portals (e.g. swirling portal animations using canvas paths, stone textures, energy waves).
  - [ ] Add floating text for damage numbers (`-3`, `-12` Magic) when units hit targets.
  - [ ] Add visual summon flash and death dust effects on the canvas.
  - [ ] Implement minor screen shake when portals take damage or heavy units fight.
- [ ] **A/B Testing and Analytics Hook (Optional Prep)**
  - [ ] Ensure clear hooks are present if analytics-tracking is needed later.

### 🔹 Milestone 4: Publishing Prep
- [ ] **Quality Assurance Checks**
  - [ ] Run game client and verify zero browser console errors.
  - [ ] Test the gameplay loop: verify peasants swarm, archers/wizards attack from distance, upgrades function, and enemy AI adapts.
  - [ ] Verify local storage saves properly across page refreshes.
- [ ] **Mobile Touch Optimization**
  - [ ] Prevent default double-tap zooming on mobile layout.
  - [ ] Standardize column widths (`max-width: 600px`) and scale canvas cleanly.
- [ ] **Packaging**
  - [ ] Package release-ready files (`index.html`, `style.css`, `game.js`) into a clean ZIP folder ready for itch.io upload.

---

## 🛠️ Code Conventions & Design Principles
- **No Third-Party Frameworks:** Keep it strictly Vanilla JS, CSS3, and HTML5.
- **Responsive Layout:** Must support mobile vertical scrolling screens. Max-width of column layout locked at `600px`.
- **Stat Progression Sync:** Gold purchases must update the persistent save state in `localStorage` securely.
- **Ranged Combat Logic:** Non-blocking target selection: ranged units shoot without walking into melee collision range.
