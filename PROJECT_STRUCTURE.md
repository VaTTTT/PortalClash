# 📁 Portal Clash - Project Structure

This document outlines the directory structure and file layout of the **Portal Clash** project.

```text
PortalClash/
├── Assets/                 # Graphic and audio resources
│   ├── sprites/            # Textures, animations, and icons
│   └── sounds/             # Sound effects and music tracks
├── Documentation/          # Design documentation and sheets
│   └── gamedesign_balance_sheet.md # Stats, curves, and AI progression rules
├── Scripts/                # Core game scripts
│   └── game.js             # Main gameplay loop and engine logic
├── GEMINI.md               # Developer guidelines (Must remain at root for AI context loading)
├── PROJECT_STRUCTURE.md    # Structure documentation (this file)
├── README.md               # User-facing game documentation and guide
├── index.html              # Entry point web interface
├── style.css               # Styling rules and page layout
└── task.md                 # Roadmap and checklists
```

## 🗂️ Directories and Contents

### 1. `Assets/`
Contains all game assets.
- **`Assets/sprites/`**: Place all image sprites, texture sheets, and visual assets here.
- **`Assets/sounds/`**: Place sound effects (e.g. hits, summons, game over) and background soundtracks here.

### 2. `Documentation/`
Organizes general project specifications, game balance math, and mechanics references.
- **`Documentation/gamedesign_balance_sheet.md`**: Contains the tactical counter matrix, 5-tier unit stats (health, damage, speed, costs, unlocks), META upgrade cost/multiplier curves, and Orc AI mana regeneration scaling equations.

### 3. `Scripts/`
Contains JavaScript files containing game code.
- **`Scripts/game.js`**: Holds the main canvas rendering logic, AI threat processing, player/enemy summoning, state saving/loading, and game loops.

### 4. Root Files
- **`index.html`**: The UI layout holding the panels, overlay menus, stats HUD, and drawing canvas.
- **`style.css`**: CSS stylesheet detailing page flex layouts, buttons, font integration, and custom transitions.
- **`README.md`**: General user-facing overview of the game, features list, how-to-play guide, and local run instructions.
- **`GEMINI.md`**: Global developer guidelines, tech stack constraints, coding rules, and development commands. **IMPORTANT:** This file must remain in the root directory as it is parsed by the AI development assistant to load development constraints and rules.
- **`PROJECT_STRUCTURE.md`**: Overview of the folder structure and file purposes (this file).
- **`task.md`**: Tracking checklists for active development tasks.
