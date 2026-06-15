# ⚔️ Portal Clash

A fast-paced, vertical "tug-of-war" tower defense game built entirely in HTML5 Canvas and JavaScript. Lead the Human army against the relentless Orc horde, manage your mana economy, and destroy the enemy portal to secure victory!

## 📜 Game Description
In **Portal Clash**, you command a defending portal at the bottom of the screen while an enemy portal constantly spawns threats from the top. The battlefield is a vertical, scrollable arena. You must carefully manage your Mana regeneration to summon units ranging from cheap Peasant fodder to devastating Wizards. 

Between battles, visit the Shop to spend your hard-earned Gold on permanent upgrades, new unit unlocks, and enhanced portal regeneration to keep up with an AI that grows stronger and smarter every level.

## ✨ Features
* **Vertical Tug-of-War Combat:** A unique vertical scrolling battlefield that perfectly fits mobile and desktop screens.
* **Dynamic Enemy AI:** The Orc AI calculates threat levels on the fly. It will panic when overwhelmed, save up for heavy units when safe, and continuously scale its mana regeneration as you progress through the levels.
* **5-Tier Roster:**
  * 🧑🌾 **Peasant** (Cheap swarm unit)
  * 🏹 **Archer** (Reliable ranged damage)
  * 🗡️ **Swordsman** (Sturdy frontline infantry)
  * 🐎 **Knight** (Heavy armor and high damage)
  * 🧙‍♂️ **Wizard** (Fragile but devastating magic user)
* **Meta-Progression Shop:** Earn Gold by winning matches without taking damage. Spend it to unlock higher-tier units, upgrade unit health/damage, and permanently boost your Portal's HP and Mana regeneration.
* **Persistent Saves:** Your progress, unlocks, and gold are automatically saved to your local browser storage.

## 🎮 How to Play
1. **Summon Units:** Click the unit buttons at the bottom of the screen to spawn troops. Each unit costs Mana.
2. **Manage Economy:** Your Mana regenerates automatically. You can spend a chunk of Mana during a battle to temporarily upgrade your regeneration rate.
3. **Scroll to View:** The battlefield is large! Scroll up and down the middle section to check on the frontline and the enemy portal.
4. **Win Condition:** Reduce the Enemy Portal's HP to 0. 
5. **Lose Condition:** If the Orcs reduce your Portal's HP to 0, the run is over.

## 💻 How to Run Locally
No server or installation is required to play this game!
1. Clone or download this repository.
2. Ensure `index.html`, `style.css`, and `game.js` are in the same folder.
3. Double-click `index.html` to open it in any modern web browser.

## 🛠️ Built With
* **HTML5** (Structure)
* **CSS3** (Styling & Flexbox Layout)
* **Vanilla JavaScript** (Game Logic, Canvas Rendering, Local Storage)

---

## ⚙️ Development Commands
Since this is a vanilla client-side application, there is no build step required, but standard commands include:
- **Run Locally**: Double-click `index.html` or run a local static server (e.g. `npx serve .` or Live Server).

## 📝 Coding Guidelines & Rules
- **Vanilla JavaScript**: Keep logic clean, using functions and ES6 classes (e.g., `Portal` and `Monster`).
- **State Preservation**: Ensure any added features update the persistent `state` object and call `saveGame()` correctly.
- **Canvas Rendering**: Use coordinate-based drawing on `ctx`. Keep player units moving up (negative speed) and enemy units moving down (positive speed).
- **Responsive Layout**: Maintain compatibility with the vertical column design (`max-width: 600px`).
