class ChickenInvadersGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('chickenInvadersHighScore') || '0');
        this.wave = 1;
        this.lives = 3;
        
        this.CANVAS_WIDTH = 800;
        this.CANVAS_HEIGHT = 600;
        
        // Game objects
        this.player = { 
            x: 400, y: 500, width: 40, height: 40, 
            health: 100, maxHealth: 100 
        };
        this.bullets = [];
        this.chickens = [];
        this.powerUps = [];
        this.explosions = [];
        this.keys = {};
        
        // Game state
        this.lastShot = 0;
        this.weaponType = 'single';
        this.fireRate = 300;
        this.powerUpTimers = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.renderGame();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyP' && this.gameState === 'playing') {
                this.gameState = 'paused';
            } else if (e.code === 'KeyP' && this.gameState === 'paused') {
                this.gameState = 'playing';
                this.gameLoop();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button events
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
    }
    
    startGame() {
        this.initGame();
        this.gameState = 'playing';
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('gameover-overlay').style.display = 'none';
        this.gameLoop();
    }
    
    showMenu() {
        this.gameState = 'menu';
        document.getElementById('menu-overlay').style.display = 'flex';
        document.getElementById('gameover-overlay').style.display = 'none';
    }
    
    initGame() {
        this.player.x = this.CANVAS_WIDTH / 2 - this.player.width / 2;
        this.player.y = this.CANVAS_HEIGHT - 80;
        this.player.health = this.player.maxHealth;
        
        this.bullets = [];
        this.chickens = [];
        this.powerUps = [];
        this.explosions = [];
        
        this.weaponType = 'single';
        this.fireRate = 300;
        this.powerUpTimers = {};
        
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        
        this.spawnChickens(1);
        this.updateUI();
    }
    
    spawnChickens(waveNum) {
        this.chickens = [];
        
        const rows = Math.min(3 + Math.floor(waveNum / 3), 6);
        const cols = Math.min(8 + Math.floor(waveNum / 2), 12);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const chickenType = row === 0 && waveNum > 3 ? 'big' : 'normal';
                this.chickens.push({
                    x: 100 + col * 60,
                    y: 50 + row * 50,
                    width: chickenType === 'big' ? 50 : 35,
                    height: chickenType === 'big' ? 45 : 30,
                    health: chickenType === 'big' ? 3 : 1,
                    maxHealth: chickenType === 'big' ? 3 : 1,
                    moveDirection: 1,
                    shootCooldown: Math.random() * 2000 + 1000,
                    type: chickenType,
                    points: chickenType === 'big' ? 50 : 10
                });
            }
        }
        
        // Add boss chicken every 5 waves
        if (waveNum % 5 === 0) {
            this.chickens.push({
                x: this.CANVAS_WIDTH / 2 - 75,
                y: 30,
                width: 150,
                height: 100,
                health: 20,
                maxHealth: 20,
                moveDirection: 1,
                shootCooldown: 500,
                type: 'boss',
                points: 500
            });
        }
    }
    
    createExplosion(x, y, size = 30) {
        this.explosions.push({
            x, y,
            radius: 0,
            life: 0,
            maxLife: size
        });
    }
    
    spawnPowerUp(x, y) {
        if (Math.random() < 0.3) { // 30% chance
            const types = ['multishot', 'rapidfire', 'health', 'points'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.powerUps.push({
                x: x - 15,
                y: y,
                width: 30,
                height: 30,
                type,
                speed: 2
            });
        }
    }
    
    updateGame() {
        if (this.gameState !== 'playing') return;
        
        const currentTime = Date.now();
        
        // Update power-up timers
        Object.keys(this.powerUpTimers).forEach(key => {
            if (currentTime > this.powerUpTimers[key]) {
                delete this.powerUpTimers[key];
                if (key === 'multishot') this.weaponType = 'single';
                if (key === 'rapidfire') this.fireRate = 300;
            }
        });
        
        // Move player
        if (this.keys['ArrowLeft'] && this.player.x > 0) this.player.x -= 6;
        if (this.keys['ArrowRight'] && this.player.x < this.CANVAS_WIDTH - this.player.width) this.player.x += 6;
        if (this.keys['ArrowUp'] && this.player.y > this.CANVAS_HEIGHT / 2) this.player.y -= 6;
        if (this.keys['ArrowDown'] && this.player.y < this.CANVAS_HEIGHT - this.player.height) this.player.y += 6;
        
        // Shoot bullets
        if (this.keys['Space'] && currentTime - this.lastShot > this.fireRate) {
            this.shootPlayerBullets();
            this.lastShot = currentTime;
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.type === 'player') {
                bullet.y -= bullet.speed;
                if (bullet.y < 0) this.bullets.splice(i, 1);
            } else {
                bullet.y += bullet.speed;
                if (bullet.y > this.CANVAS_HEIGHT) this.bullets.splice(i, 1);
            }
        }
        
        // Update chickens
        this.updateChickens();
        
        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            this.powerUps[i].y += this.powerUps[i].speed;
            if (this.powerUps[i].y > this.CANVAS_HEIGHT) this.powerUps.splice(i, 1);
        }
        
        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].life += 2;
            this.explosions[i].radius = (this.explosions[i].life / this.explosions[i].maxLife) * 40;
            if (this.explosions[i].life >= this.explosions[i].maxLife) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Check collisions
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkGameConditions();
        
        this.updateUI();
    }
    
    shootPlayerBullets() {
        if (this.weaponType === 'single') {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 12,
                speed: 10,
                damage: 1,
                type: 'player'
            });
        } else if (this.weaponType === 'double') {
            this.bullets.push(
                {
                    x: this.player.x + 8,
                    y: this.player.y,
                    width: 4,
                    height: 12,
                    speed: 10,
                    damage: 1,
                    type: 'player'
                },
                {
                    x: this.player.x + this.player.width - 12,
                    y: this.player.y,
                    width: 4,
                    height: 12,
                    speed: 10,
                    damage: 1,
                    type: 'player'
                }
            );
        } else if (this.weaponType === 'triple') {
            this.bullets.push(
                {
                    x: this.player.x + this.player.width / 2 - 2,
                    y: this.player.y,
                    width: 4,
                    height: 12,
                    speed: 10,
                    damage: 1,
                    type: 'player'
                },
                {
                    x: this.player.x + 8,
                    y: this.player.y,
                    width: 4,
                    height: 12,
                    speed: 10,
                    damage: 1,
                    type: 'player'
                },
                {
                    x: this.player.x + this.player.width - 12,
                    y: this.player.y,
                    width: 4,
                    height: 12,
                    speed: 10,
                    damage: 1,
                    type: 'player'
                }
            );
        }
    }
    
    updateChickens() {
        let changeDirection = false;
        
        this.chickens.forEach(chicken => {
            chicken.x += chicken.moveDirection * 1;
            if (chicken.x <= 0 || chicken.x >= this.CANVAS_WIDTH - chicken.width) {
                changeDirection = true;
            }
            
            // Chicken shooting
            chicken.shootCooldown -= 16;
            if (chicken.shootCooldown <= 0 && Math.random() < 0.001) {
                this.bullets.push({
                    x: chicken.x + chicken.width / 2 - 3,
                    y: chicken.y + chicken.height,
                    width: 6,
                    height: 8,
                    speed: 4,
                    damage: 10,
                    type: 'enemy'
                });
                chicken.shootCooldown = Math.random() * 3000 + 1000;
            }
        });
        
        if (changeDirection) {
            this.chickens.forEach(chicken => {
                chicken.moveDirection *= -1;
                chicken.y += 20;
            });
        }
    }
    
    checkCollisions() {
        // Bullet-chicken collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].type !== 'player') continue;
            
            for (let j = this.chickens.length - 1; j >= 0; j--) {
                const bullet = this.bullets[i];
                const chicken = this.chickens[j];
                
                if (this.isColliding(bullet, chicken)) {
                    chicken.health -= bullet.damage;
                    this.bullets.splice(i, 1);
                    
                    if (chicken.health <= 0) {
                        this.createExplosion(
                            chicken.x + chicken.width / 2, 
                            chicken.y + chicken.height / 2,
                            chicken.type === 'boss' ? 60 : chicken.type === 'big' ? 40 : 30
                        );
                        this.spawnPowerUp(chicken.x + chicken.width / 2, chicken.y + chicken.height / 2);
                        this.score += chicken.points;
                        this.chickens.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        // Bullet-player collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].type !== 'enemy') continue;
            
            const bullet = this.bullets[i];
            if (this.isColliding(bullet, this.player)) {
                this.player.health -= bullet.damage;
                this.bullets.splice(i, 1);
                this.createExplosion(bullet.x, bullet.y, 20);
                
                if (this.player.health <= 0) {
                    this.lives--;
                    if (this.lives <= 0) {
                        this.gameOver();
                    } else {
                        this.player.health = this.player.maxHealth;
                    }
                }
            }
        }
        
        // Power-up collisions
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (this.isColliding(powerUp, this.player)) {
                this.applyPowerUp(powerUp.type);
                this.powerUps.splice(i, 1);
                this.createExplosion(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 25);
            }
        }
    }
    
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    applyPowerUp(type) {
        const currentTime = Date.now();
        
        if (type === 'multishot') {
            this.weaponType = Math.random() < 0.5 ? 'double' : 'triple';
            this.powerUpTimers.multishot = currentTime + 10000;
        } else if (type === 'rapidfire') {
            this.fireRate = 100;
            this.powerUpTimers.rapidfire = currentTime + 8000;
        } else if (type === 'health') {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
        } else if (type === 'points') {
            this.score += 100;
        }
    }
    
    checkGameConditions() {
        // Check if wave is complete
        if (this.chickens.length === 0) {
            this.wave++;
            this.spawnChickens(this.wave);
        }
        
        // Check chicken invasion
        const invasion = this.chickens.some(chicken => chicken.y + chicken.height > this.CANVAS_HEIGHT - 100);
        if (invasion) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('chickenInvadersHighScore', this.highScore.toString());
        }
        
        document.getElementById('final-score').textContent = `Final Score: ${this.score} | Wave: ${this.wave}`;
        document.getElementById('gameover-overlay').style.display = 'flex';
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('high-score').textContent = `High Score: ${this.highScore}`;
        document.getElementById('wave').textContent = `Wave: ${this.wave}`;
        document.getElementById('lives').textContent = `Lives: ${this.lives}`;
    }
    
    renderGame() {
        // Clear canvas with space background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#000811');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        
        // Draw stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 150; i++) {
            const x = (i * 7919) % this.CANVAS_WIDTH;
            const y = (i * 3571 + Date.now() * 0.05) % this.CANVAS_HEIGHT;
            const size = Math.sin(i) > 0.8 ? 2 : 1;
            this.ctx.fillRect(x, y, size, size);
        }
        
        if (this.gameState !== 'playing' && this.gameState !== 'paused') return;
        
        // Draw player
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw player health bar
        const healthBarWidth = this.player.width;
        const healthBarHeight = 4;
        const healthPercent = this.player.health / this.player.maxHealth;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(this.player.x, this.player.y - 8, healthBarWidth, healthBarHeight);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x, this.player.y - 8, healthBarWidth * healthPercent, healthBarHeight);
        
        // Draw bullets
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.type === 'player' ? '#ffff00' : '#ff0066';
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw chickens
        this.chickens.forEach(chicken => {
            const colors = {
                normal: '#ffaa00',
                big: '#ff6600',
                boss: '#ff0000'
            };
            this.ctx.fillStyle = colors[chicken.type];
            this.ctx.fillRect(chicken.x, chicken.y, chicken.width, chicken.height);
            
            // Draw chicken health bar for damaged chickens
            if (chicken.health < chicken.maxHealth) {
                const healthPercent = chicken.health / chicken.maxHealth;
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(chicken.x, chicken.y - 6, chicken.width, 3);
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(chicken.x, chicken.y - 6, chicken.width * healthPercent, 3);
            }
            
            // Draw simple chicken features
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(chicken.x + chicken.width * 0.2, chicken.y + chicken.height * 0.2, 3, 3);
            this.ctx.fillRect(chicken.x + chicken.width * 0.7, chicken.y + chicken.height * 0.2, 3, 3);
        });
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            const colors = {
                multishot: '#00ffff',
                rapidfire: '#ff00ff',
                health: '#00ff00',
                points: '#ffff00'
            };
            this.ctx.fillStyle = colors[powerUp.type];
            this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        });
        
        // Draw explosions
        this.explosions.forEach(explosion => {
            const alpha = 1 - (explosion.life / explosion.maxLife);
            this.ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.7})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        
        // Draw UI on canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 25);
        this.ctx.fillText(`Wave: ${this.wave}`, 10, 45);
        this.ctx.fillText(`Lives: ${this.lives}`, 10, 65);
        
        // Draw active power-ups
        let powerUpY = 90;
        Object.keys(this.powerUpTimers).forEach(key => {
            const timeLeft = Math.ceil((this.powerUpTimers[key] - Date.now()) / 1000);
            this.ctx.fillText(`${key}: ${timeLeft}s`, 10, powerUpY);
            powerUpY += 20;
        });
        
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
            this.ctx.fillText('Press P to resume', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 40);
            this.ctx.textAlign = 'left';
        }
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.updateGame();
            this.renderGame();
            requestAnimationFrame(() => this.gameLoop());
        } else if (this.gameState === 'paused') {
            this.renderGame();
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChickenInvadersGame();
});