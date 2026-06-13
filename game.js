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
    unlocks: { white: false, green: false, blue: false },
    upgrades: { gray: 0, white: 0, green: 0, blue: 0 },
    hpRegenLevel: 0,
    manaRegenLevel: 0
};

// Base Stats
const STATS = {
    gray:  { cost: 3,  hp: 3,  dmg: 1, color: 'gray', radius: 12, unlock: 0 },
    white: { cost: 5,  hp: 5,  dmg: 2, color: 'white', radius: 15, unlock: 5 },
    green: { cost: 10, hp: 10, dmg: 3, color: '#27ae60', radius: 18, unlock: 10 },
    blue:  { cost: 20, hp: 20, dmg: 5, color: '#2980b9', radius: 22, unlock: 20 }
};

// --- SAVE SYSTEM ---
function saveGame() {
    localStorage.setItem('portalClashSaveV2', JSON.stringify(state));
    checkContinues();
}
function loadGame() {
    const saved = localStorage.getItem('portalClashSaveV2');
    if (saved) {
        let parsed = JSON.parse(saved);
        state = { ...state, ...parsed }; // Merge to preserve new keys if updated
    }
}
function checkContinues() {
    const hasSave = localStorage.getItem('portalClashSaveV2') !== null;
    document.getElementById('btn-continue').disabled = !hasSave;
    document.querySelectorAll('.btn-open-shop').forEach(b => b.disabled = !hasSave);
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
        // Player gets upgraded stats, AI gets base stats
        const multi = side === 'player' ? 1 + (0.1 * state.upgrades[type]) : 1;
        
        this.maxHealth = base.hp * multi;
        this.health = this.maxHealth;
        this.damage = base.dmg * multi;
        this.color = base.color;
        this.radius = base.radius;
        this.speed = side === 'player' ? -1.5 : 1.5;
        this.isFighting = false;
        this.target = null;
        this.attackTimer = 0;
    }
    draw() {
        ctx.fillStyle = this.color; ctx.strokeStyle = '#000';
        if (this.side === 'enemy') {
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = 'red'; ctx.fillRect(this.x - 15, this.y - this.radius - 12, 30, 5);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - 15, this.y - this.radius - 12, 30 * (Math.max(0, this.health) / this.maxHealth), 5);
    }
}

// --- GAME LOGIC ---
function startGame() {
    Object.values(menus).forEach(m => m.classList.add('hidden'));
    
    // Setup Mana Economy based on permanent upgrades
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

// In-Game UI
['gray', 'white', 'green', 'blue'].forEach(type => {
    document.getElementById(`btn-${type}`).onclick = () => spawnMonster(type);
});

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

    // Disable buttons if not unlocked or not enough mana
    document.getElementById('btn-gray').disabled = playerMana < STATS.gray.cost;
    ['white', 'green', 'blue'].forEach(type => {
        let btn = document.getElementById(`btn-${type}`);
        if (!state.unlocks[type]) {
            btn.innerText = "Locked";
            btn.disabled = true;
        } else {
            btn.innerHTML = `${type.charAt(0).toUpperCase() + type.slice(1)}<br>(${STATS[type].cost} Mana)`;
            btn.disabled = playerMana < STATS[type].cost;
        }
    });
    document.getElementById('btn-upgrade').disabled = playerMana < playerUpgradeCost;
}

// --- ENEMY AI ---
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

    let types = ['gray', 'white', 'green', 'blue'];
    let affordable = types.filter(t => STATS[t].cost <= enemyMana);
    
    if (affordable.length > 0) {
        if (!isPanic && enemyMana < STATS.blue.cost && Math.random() < 0.6) return; 
        
        let pick = isPanic ? affordable[affordable.length - 1] : affordable[Math.floor(Math.random() * affordable.length)];
        if (!isPanic) {
            if (enemyMana >= STATS.blue.cost && Math.random() < 0.6) pick = 'blue';
            else if (enemyMana >= STATS.green.cost && Math.random() < 0.5) pick = 'green';
        }
        enemyMana -= STATS[pick].cost;
        monsters.push(new Monster(enemyPortal.y + 60, 'enemy', pick));
    }
}

// --- LOOP ---
function gameLoop() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    if (frameCount % 60 === 0) {
        playerMana += playerRegen;
        // Base AI scaling to 10%
        actualEnemyRegenRate = enemyRegen * Math.pow(1.10, state.level - 1);
        enemyMana += actualEnemyRegenRate;
        
        // Permanent HP Regen Tick
        playerPortal.health = Math.min(playerPortal.maxHealth, playerPortal.health + (state.hpRegenLevel * 0.5));
        
        updateUI(); processEnemyAI();
    }

    monsters.forEach(m => { m.isFighting = false; m.target = null; });

    for (let i = 0; i < monsters.length; i++) {
        let m1 = monsters[i];
        for (let j = 0; j < monsters.length; j++) {
            let m2 = monsters[j];
            if (m1.side !== m2.side && Math.abs(m1.y - m2.y) < m1.radius + m2.radius + 5) {
                m1.isFighting = true; m1.target = m2;
            }
        }
        if (m1.side === 'player' && m1.y <= enemyPortal.y + enemyPortal.radius + 10) { m1.isFighting = true; m1.target = enemyPortal; }
        if (m1.side === 'enemy' && m1.y >= playerPortal.y - playerPortal.radius - 10) { m1.isFighting = true; m1.target = playerPortal; }
    }

    monsters.forEach(m => {
        if (m.isFighting && m.target) {
            m.attackTimer++;
            if (m.attackTimer >= 60) { m.target.health -= m.damage; m.attackTimer = 0; }
        } else { m.y += m.speed; m.attackTimer = 0; }
        m.draw();
    });

    monsters = monsters.filter(m => m.health > 0);
    enemyPortal.draw(); playerPortal.draw();

    if (playerPortal.health <= 0) {
        isGameRunning = false; menus.gameOver.classList.remove('hidden');
    } else if (enemyPortal.health <= 0) {
        isGameRunning = false;
        
        // Reward Logic
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

    // Unlocks
    ['white', 'green', 'blue'].forEach(type => {
        let btn = document.getElementById(`shop-unlock-${type}`);
        if (state.unlocks[type]) {
            btn.innerText = "Unlocked"; btn.disabled = true;
        } else {
            btn.disabled = state.gold < STATS[type].unlock;
        }
    });

    // Upgrades
    ['gray', 'white', 'green', 'blue'].forEach(type => {
        let btn = document.getElementById(`shop-upg-${type}`);
        let lvl = state.upgrades[type];
        if (lvl >= 10) {
            btn.innerText = "Max Level"; btn.disabled = true;
        } else {
            btn.innerText = `${type.charAt(0).toUpperCase() + type.slice(1)} [Lvl ${lvl}/10]`;
            btn.disabled = state.gold < 1 || (type !== 'gray' && !state.unlocks[type]);
        }
    });

    // Portal
    let btnHp = document.getElementById('shop-upg-hp');
    if (state.hpRegenLevel >= 10) { btnHp.innerText = "Max Level"; btnHp.disabled = true; }
    else { btnHp.innerText = `HP Regen [Lvl ${state.hpRegenLevel}/10]`; btnHp.disabled = state.gold < 10; }

    let btnMana = document.getElementById('shop-upg-mana');
    if (state.manaRegenLevel >= 10) { btnMana.innerText = "Max Level"; btnMana.disabled = true; }
    else { btnMana.innerText = `Mana Regen [Lvl ${state.manaRegenLevel}/10]`; btnMana.disabled = state.gold < 10; }
}

// Shop Events
['white', 'green', 'blue'].forEach(type => {
    document.getElementById(`shop-unlock-${type}`).onclick = () => {
        if (state.gold >= STATS[type].unlock) { state.gold -= STATS[type].unlock; state.unlocks[type] = true; saveGame(); updateShopUI(); }
    };
});
['gray', 'white', 'green', 'blue'].forEach(type => {
    document.getElementById(`shop-upg-${type}`).onclick = () => {
        if (state.gold >= 1 && state.upgrades[type] < 10) { state.gold -= 1; state.upgrades[type]++; saveGame(); updateShopUI(); }
    };
});
document.getElementById('shop-upg-hp').onclick = () => {
    if (state.gold >= 10 && state.hpRegenLevel < 10) { state.gold -= 10; state.hpRegenLevel++; saveGame(); updateShopUI(); }
};
document.getElementById('shop-upg-mana').onclick = () => {
    if (state.gold >= 10 && state.manaRegenLevel < 10) { state.gold -= 10; state.manaRegenLevel++; saveGame(); updateShopUI(); }
};

// --- MENU LISTENERS ---
document.getElementById('btn-new-game').onclick = () => { 
    state = { level: 1, gold: 0, unlocks: { white: false, green: false, blue: false }, upgrades: { gray: 0, white: 0, green: 0, blue: 0 }, hpRegenLevel: 0, manaRegenLevel: 0 };
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
