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
let projectiles = [];
let enemyPortal, playerPortal;

// Persistent Data (Saved)
let state = {
    level: 1,
    gold: 0,
    unlocks: { skeleton: false },
    upgrades: { rat: 0, skeleton: 0 },
    hpRegenLevel: 0,
    manaRegenLevel: 0
};

// Base Stats
const STATS = {
    rat: { 
        cost: 3, 
        hp: 20, 
        dmg: 5, 
        range: 15, 
        speed: 0.5, 
        color: '#8d6e63', 
        radius: 21,
        spriteWidth: 128,
        spriteHeight: 128,
        drawWidth: 140,
        drawHeight: 140,
        frames: { walk: 6, attack: 8, hurt: 4, death: 5 }
    },
    skeleton: {
        cost: 7, 
        hp: 50, 
        dmg: 12, 
        range: 15, 
        speed: 0.3, 
        color: '#b0bec5', 
        radius: 40,
        spriteWidth: 64,
        spriteHeight: 64,
        drawWidth: 240,
        drawHeight: 240,
        frames: { walk: 6, attack: 9, hurt: 4, death: 6 }
    }
};

// Sprite Loading (Walk, Attack, Hurt, and Death Sheets)
const IMAGES = {
    rat: {
        walk: new Image(),
        attack: new Image(),
        hurt: new Image(),
        death: new Image()
    },
    skeleton: {
        walk: new Image(),
        attack: new Image(),
        hurt: new Image(),
        death: new Image()
    }
};

IMAGES.rat.walk.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Walk_with_shadow.png';
IMAGES.rat.attack.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Attack_with_shadow.png';
IMAGES.rat.hurt.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Hurt_with_shadow.png';
IMAGES.rat.death.src = 'Assets/Sprites/Units/Rat_LVL1/Rat1_Death_with_shadow.png';

IMAGES.skeleton.walk.src = 'Assets/Sprites/Units/Skeleton_LVL1/Skeleton1_Walk_with_shadow.png';
IMAGES.skeleton.attack.src = 'Assets/Sprites/Units/Skeleton_LVL1/Skeleton1_Attack_with_shadow.png';
IMAGES.skeleton.hurt.src = 'Assets/Sprites/Units/Skeleton_LVL1/Skeleton1_Hurt_with_shadow.png';
IMAGES.skeleton.death.src = 'Assets/Sprites/Units/Skeleton_LVL1/Skeleton1_Death_with_shadow.png';

let assetsLoaded = 0;
let isSpriteLoaded = false;
const checkAssetsLoaded = () => {
    assetsLoaded++;
    if (assetsLoaded === 8) isSpriteLoaded = true;
};

Object.values(IMAGES).forEach(unitImgs => {
    Object.values(unitImgs).forEach(img => {
        img.onload = checkAssetsLoaded;
    });
});

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
            // Auto-migration/compatibility for Rat and Skeleton upgrades & unlocks
            if (!state.upgrades) {
                state.upgrades = { rat: 0, skeleton: 0 };
            } else {
                if (state.upgrades.rat === undefined) {
                    state.upgrades.rat = state.upgrades.gray || 0;
                }
                if (state.upgrades.skeleton === undefined) {
                    state.upgrades.skeleton = 0;
                }
            }
            if (!state.unlocks) {
                state.unlocks = { skeleton: false };
            } else if (state.unlocks.skeleton === undefined) {
                state.unlocks.skeleton = false;
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
    takeDamage(amount) {
        this.health -= amount;
        // Trigger damage variables or screen shake if desired here
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
        const walkFrames = base.frames.walk;
        this.frame = Math.floor(Math.random() * walkFrames); // Desynchronize initial walk frame phase
        this.frameTimer = Math.floor(Math.random() * 6); // Desynchronize timer phase
        this.animationSpeed = 6;
        this.spriteWidth = base.spriteWidth || 64;
        this.spriteHeight = base.spriteHeight || 64;
        this.drawWidth = base.drawWidth || 40;
        this.drawHeight = base.drawHeight || 40;
        this.isDeadFinished = false;
        this.deathDelayTimer = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health > 0) {
            // Trigger hurt flinch (hit stun) and reset frame timers
            this.state = 'hurt';
            this.frame = 0;
            this.frameTimer = 0;
        }
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
                this.deathDelayTimer = 0;
            }
            
            const maxDeathFrames = STATS[this.type].frames.death;
            if (this.frame < maxDeathFrames - 1) {
                // Advance animation frame when dying
                this.frameTimer++;
                if (this.frameTimer >= this.animationSpeed) {
                    this.frame++;
                    this.frameTimer = 0;
                }
            } else {
                // Final frame (lying dead). Hold for 1 second (60 frames) before disappearing.
                this.deathDelayTimer++;
                if (this.deathDelayTimer >= 60) {
                    this.isDeadFinished = true;
                }
            }
            return;
        }

        // Hurt flinch / hit stun logic
        if (this.state === 'hurt') {
            const maxHurtFrames = STATS[this.type].frames.hurt;
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                if (this.frame < maxHurtFrames - 1) {
                    this.frame++;
                    this.frameTimer = 0;
                } else {
                    // Hit stun finishes, reset to walk so update checks can select correct state next loop
                    this.state = 'walk';
                    this.frame = 0;
                    this.frameTimer = 0;
                }
            }
            return; // Interrupt walking and attacking during hit stun
        }

        const previousState = this.state;
        if (this.isFighting && this.target) {
            this.state = 'attack';
        } else {
            this.state = 'walk';
        }

        // Reset animation frame on state transitions to prevent out-of-bounds frame indices
        if (this.state !== previousState) {
            const framesCount = STATS[this.type].frames[this.state];
            this.frame = Math.floor(Math.random() * framesCount);
            this.frameTimer = Math.floor(Math.random() * this.animationSpeed);
            if (this.state === 'attack') {
                // Offset the initial attackTimer slightly to desynchronize attack hits
                this.attackTimer = Math.floor(Math.random() * 15);
            }
        }

        if (this.state === 'attack') {
            this.attackTimer++;
            if (this.attackTimer >= 60) {
                if (this.range > 50) {
                    // Spawn projectile (Skeletal Arrow / Bolt)
                    projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, 4.5, '#eceff1'));
                } else {
                    // Melee instant hit
                    this.target.takeDamage(this.damage);
                }
                this.attackTimer = 0;
            }
            
            // Advance animation frame when attacking
            const maxAttackFrames = STATS[this.type].frames.attack;
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                this.frame = (this.frame + 1) % maxAttackFrames;
                this.frameTimer = 0;
            }
        } else {
            this.y += this.speed;
            this.attackTimer = 0;
            
            // Advance animation frame when moving
            const maxWalkFrames = STATS[this.type].frames.walk;
            this.frameTimer++;
            if (this.frameTimer >= this.animationSpeed) {
                this.frame = (this.frame + 1) % maxWalkFrames;
                this.frameTimer = 0;
            }
        }
    }

    draw() {
        if (isSpriteLoaded) {
            let img = IMAGES[this.type][this.state];
            
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
            ctx.fillText(this.state === 'death' ? '💀' : (this.type === 'rat' ? '🐀' : '💀'), this.x, this.y);
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
class Projectile {
    constructor(startX, startY, target, damage, speed, color) {
        this.x = startX;
        this.y = startY;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.isFinished = false;
        this.radius = 4;
    }
    update() {
        if (!this.target || this.target.health <= 0) {
            this.isFinished = true;
            return;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.speed + 10) {
            this.target.takeDamage(this.damage);
            this.isFinished = true;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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
    
    monsters = []; projectiles = []; frameCount = 0;
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
document.getElementById('btn-skeleton').onclick = () => spawnMonster('skeleton');

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

    const btnSkeleton = document.getElementById('btn-skeleton');
    if (state.unlocks.skeleton) {
        btnSkeleton.classList.remove('hidden');
        btnSkeleton.disabled = playerMana < STATS.skeleton.cost;
    } else {
        btnSkeleton.classList.add('hidden');
    }

    document.getElementById('btn-upgrade').disabled = playerMana < playerUpgradeCost;
}

// --- ENEMY AI (Weighted choices between Rat and Skeleton) ---
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

    // Weighted Spawning
    let ratWeight = Math.max(20, 100 - 8 * (state.level - 1));
    let skelWeight = state.level < 3 ? 0 : Math.min(40, 15 * (state.level - 2));

    let pool = [];
    if (enemyMana >= STATS.rat.cost) {
        for (let i = 0; i < ratWeight; i++) pool.push('rat');
    }
    if (enemyMana >= STATS.skeleton.cost) {
        for (let i = 0; i < skelWeight; i++) pool.push('skeleton');
    }

    if (pool.length > 0) {
        let choice = pool[Math.floor(Math.random() * pool.length)];
        
        // Anti-spam padding (save up sometimes if not in panic mode)
        if (!isPanic && enemyMana < STATS[choice].cost * 2 && Math.random() < 0.4) return;
        
        enemyMana -= STATS[choice].cost;
        monsters.push(new Monster(enemyPortal.y + 60, 'enemy', choice));
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

    projectiles.forEach(p => {
        p.update();
        p.draw();
    });
    projectiles = projectiles.filter(p => !p.isFinished);

    // Keep units on screen if they are alive OR if they are playing their death animation
    monsters = monsters.filter(m => m.health > 0 || !m.isDeadFinished);
    enemyPortal.draw(); playerPortal.draw();

    if (playerPortal.health <= 0) {
        isGameRunning = false; menus.gameOver.classList.remove('hidden');
    } else if (enemyPortal.health <= 0) {
        isGameRunning = false;
        
        let baseGold = Math.min(10, Math.floor(1 + state.level / 2.5));
        let flawless = playerPortal.health >= playerPortal.maxHealth;
        let goldEarned = flawless ? baseGold * 2 : baseGold;
        if (state.level === 1) {
            goldEarned += 10;
        }
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
function getUpgradeCost(lvl) {
    return Math.round(lvl * 1.5) + 2;
}

function updateShopUI() {
    document.getElementById('shop-gold').innerText = state.gold;

    // Rat Upgrades
    const btnUpgRat = document.getElementById('shop-upg-rat');
    const lvlRat = state.upgrades.rat || 0;
    if (lvlRat >= 10) {
        btnUpgRat.innerText = "Rat: Max Level"; btnUpgRat.disabled = true;
    } else {
        const cost = getUpgradeCost(lvlRat);
        btnUpgRat.innerText = `Upgrade Rat [Lvl ${lvlRat}/10] (Cost: ${cost} Gold)`;
        btnUpgRat.disabled = state.gold < cost;
    }

    // Skeleton Unlock & Upgrades
    const btnUnlockSkel = document.getElementById('shop-unlock-skeleton');
    const btnUpgSkel = document.getElementById('shop-upg-skeleton');

    if (!state.unlocks.skeleton) {
        btnUnlockSkel.classList.remove('hidden');
        btnUpgSkel.classList.add('hidden');
        btnUnlockSkel.innerText = "Unlock Skeleton (10 Gold)";
        btnUnlockSkel.disabled = state.gold < 10;
    } else {
        btnUnlockSkel.classList.add('hidden');
        btnUpgSkel.classList.remove('hidden');
        const lvlSkel = state.upgrades.skeleton || 0;
        if (lvlSkel >= 10) {
            btnUpgSkel.innerText = "Skeleton: Max Level"; btnUpgSkel.disabled = true;
        } else {
            const cost = getUpgradeCost(lvlSkel);
            btnUpgSkel.innerText = `Upgrade Skeleton [Lvl ${lvlSkel}/10] (Cost: ${cost} Gold)`;
            btnUpgSkel.disabled = state.gold < cost;
        }
    }

    // Portal Upgrades
    const costHp = 8 * (state.hpRegenLevel + 1);
    let btnHp = document.getElementById('shop-upg-hp');
    if (state.hpRegenLevel >= 10) { 
        btnHp.innerText = "HP Regen: Max Level"; btnHp.disabled = true; 
    } else { 
        btnHp.innerText = `HP Regen [Lvl ${state.hpRegenLevel}/10] (Cost: ${costHp} Gold)`; 
        btnHp.disabled = state.gold < costHp; 
    }

    const costMana = 12 * (state.manaRegenLevel + 1);
    let btnMana = document.getElementById('shop-upg-mana');
    if (state.manaRegenLevel >= 10) { 
        btnMana.innerText = "Mana Regen: Max Level"; btnMana.disabled = true; 
    } else { 
        btnMana.innerText = `Mana Regen [Lvl ${state.manaRegenLevel}/10] (Cost: ${costMana} Gold)`; 
        btnMana.disabled = state.gold < costMana; 
    }
}

document.getElementById('shop-upg-rat').onclick = () => {
    const lvl = state.upgrades.rat || 0;
    const cost = getUpgradeCost(lvl);
    if (state.gold >= cost && lvl < 10) {
        state.gold -= cost;
        state.upgrades.rat++;
        saveGame();
        updateShopUI();
    }
};

document.getElementById('shop-unlock-skeleton').onclick = () => {
    if (state.gold >= 10 && !state.unlocks.skeleton) {
        state.gold -= 10;
        state.unlocks.skeleton = true;
        saveGame();
        updateShopUI();
    }
};

document.getElementById('shop-upg-skeleton').onclick = () => {
    const lvl = state.upgrades.skeleton || 0;
    const cost = getUpgradeCost(lvl);
    if (state.gold >= cost && lvl < 10) {
        state.gold -= cost;
        state.upgrades.skeleton++;
        saveGame();
        updateShopUI();
    }
};

document.getElementById('shop-upg-hp').onclick = () => {
    const cost = 8 * (state.hpRegenLevel + 1);
    if (state.gold >= cost && state.hpRegenLevel < 10) {
        state.gold -= cost;
        state.hpRegenLevel++;
        saveGame();
        updateShopUI();
    }
};

document.getElementById('shop-upg-mana').onclick = () => {
    const cost = 12 * (state.manaRegenLevel + 1);
    if (state.gold >= cost && state.manaRegenLevel < 10) {
        state.gold -= cost;
        state.manaRegenLevel++;
        saveGame();
        updateShopUI();
    }
};

// --- MENU LISTENERS ---
document.getElementById('btn-new-game').onclick = () => { 
    state = { level: 1, gold: 0, unlocks: { skeleton: false }, upgrades: { rat: 0, skeleton: 0 }, hpRegenLevel: 0, manaRegenLevel: 0 };
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
