const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const spawnBtn = document.getElementById('spawn-btn');
const cooldownSpan = document.getElementById('cooldown');
const gameOverScreen = document.getElementById('game-over-screen');
const resultMessage = document.getElementById('result-message');

// Game State
let gameOver = false;
let monsters = [];

// Portal Classes
class Portal {
    constructor(x, side) {
        this.x = x;
        this.y = 200;
        this.side = side;
        this.maxHealth = 500;
        this.health = 500;
        this.radius = 40;
        this.color = side === 'player' ? '#3498db' : '#e74c3c';
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 30, this.y - 60, 60, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 30, this.y - 60, 60 * (this.health / this.maxHealth), 10);
    }
}

// Monster Class
class Monster {
    constructor(x, side) {
        this.x = x;
        this.y = 200 + (Math.random() * 20 - 10); // Slight vertical offset to prevent exact stacking
        this.side = side;
        this.maxHealth = 100;
        this.health = 100;
        this.damage = 1;
        this.baseSpeed = side === 'player' ? 1.5 : -1.5;
        this.radius = 15;
        this.color = side === 'player' ? '#2ecc71' : '#e67e22';
        this.isFighting = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - 25, 30, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 15, this.y - 25, 30 * (this.health / this.maxHealth), 5);
    }

    update() {
        if (!this.isFighting) {
            this.x += this.baseSpeed;
        }
    }
}

// Initialize Portals
const playerPortal = new Portal(60, 'player');
const enemyPortal = new Portal(740, 'enemy');

// Controls & Cooldowns
let playerCooldown = 0;
let enemySpawnTimer = 0;

spawnBtn.addEventListener('click', () => {
    if (playerCooldown <= 0 && !gameOver) {
        monsters.push(new Monster(playerPortal.x + 50, 'player'));
        playerCooldown = 60; // 1 second cooldown at 60fps
    }
});

// Main Game Loop
function gameLoop() {
    if (gameOver) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update Cooldowns
    if (playerCooldown > 0) {
        playerCooldown--;
        spawnBtn.disabled = true;
        cooldownSpan.innerText = (playerCooldown / 60).toFixed(1);
    } else {
        spawnBtn.disabled = false;
        cooldownSpan.innerText = "0";
    }

    // Enemy AI (Auto-spawn)
    enemySpawnTimer++;
    if (enemySpawnTimer > 90) { // Spawns every 1.5 seconds
        monsters.push(new Monster(enemyPortal.x - 50, 'enemy'));
        enemySpawnTimer = 0;
    }

    // Reset fighting states
    monsters.forEach(m => m.isFighting = false);

    // Collision & Combat Logic
    for (let i = 0; i < monsters.length; i++) {
        let m1 = monsters[i];

        // Check monster vs monster collisions
        for (let j = 0; j < monsters.length; j++) {
            let m2 = monsters[j];
            if (m1.side !== m2.side) {
                let dist = Math.abs(m1.x - m2.x);
                if (dist < m1.radius + m2.radius + 5) {
                    m1.isFighting = true;
                    m1.health -= m2.damage;
                }
            }
        }

        // Check monster vs portal collisions
        if (m1.side === 'player' && Math.abs(m1.x - enemyPortal.x) < m1.radius + enemyPortal.radius) {
            m1.isFighting = true;
            enemyPortal.health -= m1.damage;
        }
        if (m1.side === 'enemy' && Math.abs(m1.x - playerPortal.x) < m1.radius + playerPortal.radius) {
            m1.isFighting = true;
            playerPortal.health -= m1.damage;
        }

        m1.update();
        m1.draw();
    }

    // Remove dead monsters
    monsters = monsters.filter(m => m.health > 0);

    // Draw Portals
    playerPortal.draw();
    enemyPortal.draw();

    // Check Win/Loss
    if (playerPortal.health <= 0) {
        endGame("You Lost! The enemy destroyed your portal.");
    } else if (enemyPortal.health <= 0) {
        endGame("You Won! You destroyed the enemy portal!");
    }

    requestAnimationFrame(gameLoop);
}

function endGame(message) {
    gameOver = true;
    resultMessage.innerText = message;
    gameOverScreen.classList.remove('hidden');
}

// Start Game
gameLoop();
