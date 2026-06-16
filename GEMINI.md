# ⚔️ Portal Clash - Developer Guidelines & Rules

This file outlines the coding guidelines, technical constraints, and developer commands for building and expanding **Portal Clash**.

## ⚙️ Development Commands
Since this is a vanilla client-side application, there is no build step required:
- **Run Locally**: Double-click `index.html` or run a local static server (e.g. `npx serve .` or Live Server).

## 📝 Coding Guidelines & Rules
- **Vanilla JavaScript**: Keep logic clean, using functions and ES6 classes (e.g., `Portal` and `Monster`).
- **State Preservation**: Ensure any added features update the persistent `state` object and call `saveGame()` correctly.
- **Canvas Rendering**: Use coordinate-based drawing on `ctx`. Keep player units moving up (negative speed) and enemy units moving down (positive speed).
- **Responsive Layout**: Maintain compatibility with the vertical column design (`max-width: 600px`).
