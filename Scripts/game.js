const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const middleSection = document.getElementById('middle-section');

// UI Elements
const menus = {
    main: document.getElementById('main-menu'),
    levelComplete: document.getElementById('level-complete-screen'),
    gameOver: document.getElementById('game-over-screen'),
    shop: document.getElementById('shop-screen')
};

// Game State
let isGameRunning = false;
let frameCount = 0;
let playerMana, playerRegen, playerUpgradeCost;
let enemyMana, enemyRegen, enemyUpgradeCost, actualEnemyRegenRate;
let monsters = [];
let enemyPortal, playerPortal;

// Persistent Data (Saved)
let state = {
    level: 1,
    gold: 0,
    unlocks: {},
    upgrades: { rat: 0 },
    hpRegenLevel: 0,
    manaRegenLevel: 0
};

// Base Stats (Restricted to Rat T1 MVP)
const STATS = {
    rat: { 
        cost: 3, 
        hp: 20, 
        dmg: 5, 
        range: 15, 
        speed: 0.5, 
        color: '#8d6e63', 
        radius: 30,
        spriteWidth: 128,
        spriteHeight: 128,
        drawWidth: 200,
        drawHeight: 200
    }
};

// Sprite Loading for Rat (Walk, Attack, and Death Sheets)
const ratWalkImg = new Image();
ratWalkImg.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Walk_with_shadow.png';

const ratAttackImg = new Image();
ratAttackImg.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Attack_with_shadow.png';

const ratDeathImg = new Image();
ratDeathImg.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Death_with_shadow.png';

let assetsLoaded = 0;
let isSpriteLoaded = false;
const checkAssetsLoaded = () => {
    assetsLoaded++;
    if (assetsLoaded === 3) isSpriteLoaded = true;
};
ratWalkImg.onload = checkAssetsLoaded;
ratAttackImg.onload = checkAssetsLoaded;
ratDeathImg.onload = checkAssetsLoaded;

// --- SAFE SAVE SYSTEM ---
function saveGame() {
    try {
        localStorage.setItem('portalClashSaveV2', JSON.stringify(state));
    } catch (e) {
        console.warn("Storage disabled by mobile browser, skipping save.");
    }
    checkContinues();
}

function loadGame() {
    try {
        const saved = localStorage.getItem('portalClashSaveV2');
        if (saved) {
            let parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            // Auto-migration/compatibility for Rat upgrades
            if (!state.upgrades) {
                state.upgrades = { rat: 0 };
            } else if (state.upgrades.rat === undefined) {
                state.upgrades.rat = state.upgrades.gray || 0;
            }
        }
    } catch (e) {
        console.warn("Storage disabled by mobile browser.");
    }
}

function checkContinues() {
    try {
        const hasSave = localStorage.getItem('portalClashSaveV2') !== null;
        document.getElementById('btn-continue').disabled = !hasSave;
        document.querySelectorAll('.btn-open-shop').forEach(b => b.disabled = !hasSave);
    } catch (e) {
        document.getElementById('btn-continue').disabled = true;
        document.querySelectorAll('.btn-open-shop').forEach(b => b.disabled = true);
    }
}

// --- PORTAL & MONSTER CLASSES ---
class Portal {
    constructor(y, side) {
        this.x = canvas.width / 2;
        this.y = y;
        this.side = side;
        this.maxHealth = 100 + ((state.level - 1) * 25);
        this.health = this.maxHealth;
        this.radius = 50;
        this.color = side === 'player' ? '#8e44ad' : '#c0392b';
    }
    draw() {
        ctx.fillStyle = this.color;
        if (this.side === 'enemy') ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        else { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = 'red'; ctx.fillRect(this.x - 40, this.y + (this.side === 'player' ? -70 : 60), 80, 10);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 40, this.y + (this.side === 'player' ? -70 : 60), 80 * (Math.max(0, this.health) / this.maxHealth), 10);
    }
}

class Monster {
    constructor(y, side, type) {
        this.x = (canvas.width / 2) + (Math.random() * 40 - 20);
        this.y = y;
        this.side = side;
        this.type = type;
        
        const base = STATS[type];
        const multi = side === 'player' ? 1 + (0.1 * (state.upgrades[type] || 0)) : 1;
        
        this.maxHealth = base.hp * multi;
        this.health = this.maxHealth;
        this.damage = base.dmg * multi;
        this.color = base.color;
        this.radius = base.radius;
        this.speed = side === 'player' ? -base.speed : base.speed;
        this.range = base.range || 5;
        this.isFighting = false;
        this.target = null;
        this.attackTimer = 0;

        // Animation & Sprite Properties
        this.state = 'walk';
        this.frame = 0;
        this.frameTimer = 0;
        this.animationSpeed = 6;
        this.spriteWidth = base.spriteWidth || 64;
        this.spriteHeight = base.spriteHeight || 64;
        this.drawWidth = base.drawWidth || 40;
        this.drawHeight = base.drawHeight || 40;
        this.isDeadFinished = false;
    }

    update() {
        if (this.health <= 0) {
            const previousState = this.state;
            this.state = 'death';
            this.isFighting = false;
            this.target = null;
            
            // Reset frame/timer on transition to death state
            if (this.state !== previousState) {
                this.frame = 0;
                this.frameTimer = 0;
            }
            
            // Advance animation frame when dying (5 frames)
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                if (this.frame < 4) {
                    this.frame++;
                } else {
                    this.isDeadFinished = true;
                }
                this.frameTimer = 0;
            }
            return;
        }

        const previousState = this.state;
        if (this.isFighting && this.target) {
            this.state = 'attack';
        } else {
            this.state = 'walk';
        }

        // Reset animation frame on state transitions to prevent out-of-bounds frame indices
        if (this.state !== previousState) {
            this.frame = 0;
            this.frameTimer = 0;
        }

        if (this.state === 'attack') {
            this.attackTimer++;
            if (this.attackTimer >= 60) {
                this.target.health -= this.damage;
                this.attackTimer = 0;
            }
            
            // Advance animation frame when attacking (8 frames)
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                this.frame = (this.frame + 1) % 8;
                this.frameTimer = 0;
            }
        } else {
            this.y += this.speed;
            this.attackTimer = 0;
            
            // Advance animation frame when moving (6 frames)
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                this.frame = (this.frame + 1) % 6;
                this.frameTimer = 0;
            }
        }
    }

    draw() {
        if (isSpriteLoaded) {
            let img = ratWalkImg;
            if (this.state === 'attack') img = ratAttackImg;
            else if (this.state === 'death') img = ratDeathImg;
            
            const sx = this.frame * this.spriteWidth;
            const sy = (this.side === 'player' ? 1 : 0) * this.spriteHeight;
            ctx.drawImage(img, sx, sy, this.spriteWidth, this.spriteHeight, this.x - this.drawWidth / 2, this.y - this.drawHeight / 2, this.drawWidth, this.drawHeight);
        } else {
            ctx.fillStyle = this.color; ctx.strokeStyle = '#000';
            if (this.side === 'enemy') {
                ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            } else {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            // Fallback emoji
            ctx.fillStyle = '#000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.state === 'death' ? '💀' : '🐀', this.x, this.y);
        }
        
        // Draw Health Bar (only if alive)
        if (this.health > 0) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - 25, this.y - this.radius - 15, 50, 6);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x - 25, this.y - this.radius - 15, 50 * (Math.max(0, this.health) / this.maxHealth), 6);
        }
    }
}

// --- GAME LOGIC ---
function startGame() {
    Object.values(menus).forEach(m => m.classList.add('hidden'));
    
    playerMana = 10;
    playerRegen = 1 + (state.manaRegenLevel * 0.5);
    playerUpgradeCost = 15;
    
    enemyMana = 10;
    enemyRegen = 1;
    enemyUpgradeCost = 15;
    
    monsters = []; frameCount = 0;
    enemyPortal = new Portal(80, 'enemy');
    playerPortal = new Portal(canvas.height - 80, 'player');

    setTimeout(() => { middleSection.scrollTop = middleSection.scrollHeight; }, 100);
    isGameRunning = true;
    updateUI(); requestAnimationFrame(gameLoop);
}

function spawnMonster(type) {
    if (playerMana >= STATS[type].cost) {
        playerMana -= STATS[type].cost;
        monsters.push(new Monster(playerPortal.y - 60, 'player', type));
        updateUI();
    }
}

// In-Game UI Buttons
document.getElementById('btn-rat').onclick = () => spawnMonster('rat');

document.getElementById('btn-upgrade').onclick = () => {
    if (playerMana >= playerUpgradeCost) {
        playerMana -= playerUpgradeCost; playerRegen += 1;
        playerUpgradeCost = Math.floor(playerUpgradeCost * 1.5);
        updateUI();
    }
};

function updateUI() {
    document.getElementById('player-mana').innerText = Math.floor(playerMana);
    document.getElementById('player-regen').innerText = playerRegen.toFixed(1);
    document.getElementById('player-hp-regen').innerText = (state.hpRegenLevel * 0.5).toFixed(1);
    document.getElementById('level-display').innerText = state.level;
    document.getElementById('gold-display').innerText = state.gold;
    document.getElementById('enemy-hp').innerText = Math.ceil(Math.max(0, enemyPortal.health));
    document.getElementById('enemy-regen').innerText = actualEnemyRegenRate ? actualEnemyRegenRate.toFixed(1) : "1.0";
    document.getElementById('upgrade-cost').innerText = playerUpgradeCost;

    const btnRat = document.getElementById('btn-rat');
    btnRat.disabled = playerMana < STATS.rat.cost;

    document.getElementById('btn-upgrade').disabled = playerMana < playerUpgradeCost;
}

// --- ENEMY AI (Restricted to Rat spawning) ---
function processEnemyAI() {
    let pThreat = monsters.filter(m => m.side === 'player').reduce((s, m) => s + m.health, 0);
    let eThreat = monsters.filter(m => m.side === 'enemy').reduce((s, m) => s + m.health, 0);
    let isPanic = pThreat > eThreat + 10;
    
    document.getElementById('ai-status').innerText = isPanic ? "AI: Panic!" : (eThreat > pThreat + 15 ? "AI: Eco Mode" : "AI: Defending");

    let upgChance = isPanic ? 0 : (enemyRegen < playerRegen ? 0.5 : 0.2);
    if (enemyMana > enemyUpgradeCost * 1.5) upgChance += 0.5;

    if (enemyMana >= enemyUpgradeCost && Math.random() < upgChance) {
        enemyMana -= enemyUpgradeCost; enemyRegen += 1;
        enemyUpgradeCost = Math.floor(enemyUpgradeCost * 1.5);
        return;
    }

    if (enemyMana >= STATS.rat.cost) {
        // AI summons Rat unit
        if (!isPanic && enemyMana < STATS.rat.cost * 2 && Math.random() < 0.4) return;
        
        enemyMana -= STATS.rat.cost;
        monsters.push(new Monster(enemyPortal.y + 60, 'enemy', 'rat'));
    }
}

// --- LOOP ---
function gameLoop() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    if (frameCount % 60 === 0) {
        playerMana += playerRegen;
        actualEnemyRegenRate = enemyRegen * Math.pow(1.10, state.level - 1);
        enemyMana += actualEnemyRegenRate;
        
        playerPortal.health = Math.min(playerPortal.maxHealth, playerPortal.health + (state.hpRegenLevel * 0.5));
        
        updateUI(); processEnemyAI();
    }

    monsters.forEach(m => { m.isFighting = false; m.target = null; });

    for (let i = 0; i < monsters.length; i++) {
        let m1 = monsters[i];
        if (m1.health <= 0) continue; // Skip dead/dying units in combat detection
        
        for (let j = 0; j < monsters.length; j++) {
            let m2 = monsters[j];
            if (m2.health <= 0) continue; // Skip dead/dying units in combat detection
            
            if (m1.side !== m2.side && Math.abs(m1.y - m2.y) < m1.radius + m2.radius + m1.range) {
                m1.isFighting = true; m1.target = m2;
            }
        }
        if (m1.side === 'player' && m1.y <= enemyPortal.y + enemyPortal.radius + 10) { m1.isFighting = true; m1.target = enemyPortal; }
        if (m1.side === 'enemy' && m1.y >= playerPortal.y - playerPortal.radius - 10) { m1.isFighting = true; m1.target = playerPortal; }
    }

    monsters.forEach(m => {
        m.update();
        m.draw();
    });

    // Keep units on screen if they are alive OR if they are playing their death animation
    monsters = monsters.filter(m => m.health > 0 || !m.isDeadFinished);
    enemyPortal.draw(); playerPortal.draw();

    if (playerPortal.health <= 0) {
        isGameRunning = false; menus.gameOver.classList.remove('hidden');
    } else if (enemyPortal.health <= 0) {
        isGameRunning = false;
        
        let goldEarned = playerPortal.health >= playerPortal.maxHealth ? 2 : 1;
        state.gold += goldEarned;
        state.level++;
        saveGame();
        
        document.getElementById('gold-earned-msg').innerText = `+${goldEarned} Gold!`;
        menus.levelComplete.classList.remove('hidden');
    }

    updateUI();
    if (isGameRunning) requestAnimationFrame(gameLoop);
}

// --- SHOP LOGIC ---
function updateShopUI() {
    document.getElementById('shop-gold').innerText = state.gold;

    const btnUpgRat = document.getElementById('shop-upg-rat');
    const lvl = state.upgrades.rat || 0;
    if (lvl >= 10) {
        btnUpgRat.innerText = "Max Level"; btnUpgRat.disabled = true;
    } else {
        btnUpgRat.innerText = `Rat [Lvl ${lvl}/10]`;
        btnUpgRat.disabled = state.gold < 1;
    }

    let btnHp = document.getElementById('shop-upg-hp');
    if (state.hpRegenLevel >= 10) { btnHp.innerText = "Max Level"; btnHp.disabled = true; }
    else { btnHp.innerText = `HP Regen [Lvl ${state.hpRegenLevel}/10]`; btnHp.disabled = state.gold < 10; }

    let btnMana = document.getElementById('shop-upg-mana');
    if (state.manaRegenLevel >= 10) { btnMana.innerText = "Max Level"; btnMana.disabled = true; }
    else { btnMana.innerText = `Mana Regen [Lvl ${state.manaRegenLevel}/10]`; btnMana.disabled = state.gold < 10; }
}

document.getElementById('shop-upg-rat').onclick = () => {
    if (state.gold >= 1 && state.upgrades.rat < 10) {
        state.gold -= 1;
        state.upgrades.rat++;
        saveGame();
        updateShopUI();
    }
};
document.getElementById('shop-upg-hp').onclick = () => {
    if (state.gold >= 10 && state.hpRegenLevel < 10) { state.gold -= 10; state.hpRegenLevel++; saveGame(); updateShopUI(); }
};
document.getElementById('shop-upg-mana').onclick = () => {
    if (state.gold >= 10 && state.manaRegenLevel < 10) { state.gold -= 10; state.manaRegenLevel++; saveGame(); updateShopUI(); }
};

// --- MENU LISTENERS ---
document.getElementById('btn-new-game').onclick = () => { 
    state = { level: 1, gold: 0, unlocks: {}, upgrades: { rat: 0 }, hpRegenLevel: 0, manaRegenLevel: 0 };
    saveGame(); startGame(); 
};
document.getElementById('btn-continue').onclick = () => { loadGame(); startGame(); };
document.getElementById('btn-retry').onclick = () => startGame();
document.getElementById('btn-next-level').onclick = () => startGame();

document.querySelectorAll('.btn-open-shop').forEach(btn => {
    btn.onclick = () => {
        loadGame(); updateShopUI();
        Object.values(menus).forEach(m => m.classList.add('hidden'));
        menus.shop.classList.remove('hidden');
    };
});
document.getElementById('btn-close-shop').onclick = () => {
    menus.shop.classList.add('hidden');
    menus.main.classList.remove('hidden');
    checkContinues();
};
document.querySelectorAll('.btn-to-menu').forEach(btn => {
    btn.onclick = () => {
        Object.values(menus).forEach(m => m.classList.add('hidden'));
        menus.main.classList.remove('hidden');
        checkContinues();
    };
});

// Initialization
loadGame();
checkContinues();
