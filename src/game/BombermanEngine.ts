import { TILE_SIZE, TileType, CANVAS_WIDTH, CANVAS_HEIGHT } from './bombermanConstants';
import { BombermanMap } from './BombermanMap';
import { Player } from './classes/Player';
import { Bomb } from './classes/Bomb';
import { Explosion } from './classes/Explosion';
import { Enemy } from './classes/Enemy';
import { PlayerAtlas } from './classes/PlayerAtlas';

export class BombermanEngine {
  public map: BombermanMap;
  public player: Player;
  public bombs: Bomb[] = [];
  public explosions: Explosion[] = [];
  public enemies: Enemy[] = [];

  public level: number = 1;
  public score: number = 0;
  public lives: number = 3;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

  public moveDir: { x: number; y: number } = { x: 0, y: 0 };
  private lastTime: number = 0;

  // Gestor do Atlas de Sprites do Personagem
  private playerAtlas: PlayerAtlas;

  // Contexto de Áudio Web nativo para efeitos sonoros sem ficheiros externos
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.map = new BombermanMap();
    this.player = new Player(1 * TILE_SIZE + 4, 1 * TILE_SIZE + 4);
    this.playerAtlas = new PlayerAtlas('/images/Atlasbomberman.png');

    // Inicialização ultra-reativa do sistema de áudio e desbloqueio imediato no primeiro clique ou tecla
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    this.initLevel();
  }

  // --- Sistema de Efeitos Sonoros (Web Audio API) ---
  private playSound(type: 'bomb' | 'explode' | 'hurt' | 'victory') {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'bomb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Som curto de colocação
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'explode') {
        // --- ESTRONDO ÉPICO "BOOOOOOM" INTERGALÁCTICO ---

        // 1. Sub-Bass Profundo e Prolongado (Sawtooth)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(15, now + 1.2); // 1.2 segundos de duração

        gain.gain.setValueAtTime(0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);

        // 2. Ruído de Fogo e Onda de Choque Estendida (White Noise Buffer)
        const bufferSize = ctx.sampleRate * 1.2; // 1.2 segundos
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.linearRampToValueAtTime(80, now + 1.2);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 1.2);
      } else if (type === 'hurt') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Som de dano / perda de vida
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'victory') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Jingle triunfante de avanço de nível / vitória
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.setValueAtTime(440, now + 0.12);
        osc.frequency.setValueAtTime(554.37, now + 0.24);
        osc.frequency.setValueAtTime(659.25, now + 0.36);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch {
      // Ignora restrições estritas do navegador
    }
  }

  public initLevel() {
    this.map.generateLevel(this.level);
    this.player.resetPosition(1 * TILE_SIZE + 4, 1 * TILE_SIZE + 4);
    this.bombs = [];
    this.explosions = [];

    this.enemies = [];
    const enemyCount = 2 + this.level;
    for (let i = 0; i < enemyCount; i++) {
      this.spawnRandomEnemy();
    }
  }

  private spawnRandomEnemy() {
    let placed = false;
    while (!placed) {
      const r = Math.floor(Math.random() * 11) + 1;
      const c = Math.floor(Math.random() * 13) + 1;
      if (this.map.grid[r]![c] === TileType.EMPTY && (r > 3 || c > 3)) {
        this.enemies.push(new Enemy(r, c));
        placed = true;
      }
    }
  }

  public placeBomb() {
    if (!this.player.isAlive || this.isGameOver) return;

    const gridPos = this.player.getGridPosition();
    const exists = this.bombs.some((b) => b.r === gridPos.r && b.c === gridPos.c);

    // Usamos 99 como alcance máximo para cobrir todo o corredor disponível até encontrar uma parede
    const maxRange = 99;

    if (!exists && this.player.activeBombs < this.player.bombLimit) {
      this.bombs.push(new Bomb(gridPos.r, gridPos.c, maxRange));
      this.player.activeBombs++;
      this.playSound('bomb');
    }
  }

  public update() {
    if (this.isGameOver || this.isVictory) return;

    const now = performance.now();
    const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0.016;
    this.lastTime = now;

    this.player.update(this.moveDir, this.map.grid);

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i]!;
      const exploded = bomb.update(dt);
      if (exploded) {
        this.bombs.splice(i, 1);
        this.player.activeBombs = Math.max(0, this.player.activeBombs - 1);
        this.explosions.push(new Explosion(bomb.r, bomb.c, bomb.range, this.map));
        this.playSound('explode');
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]!;
      const finished = explosion.update(dt);

      const playerGrid = this.player.getGridPosition();
      const hitPlayer = explosion.tiles.some((t) => t.r === playerGrid.r && t.c === playerGrid.c);
      if (hitPlayer && this.player.isAlive) {
        this.player.isAlive = false;
        this.lives--;
        this.playSound('hurt');
        if (this.lives <= 0) {
          this.isGameOver = true;
        } else {
          setTimeout(() => this.player.resetPosition(1 * TILE_SIZE + 4, 1 * TILE_SIZE + 4), 1000);
        }
      }

      for (let e = this.enemies.length - 1; e >= 0; e--) {
        const enemy = this.enemies[e]!;
        const enemyGrid = {
          r: Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE),
          c: Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE),
        };
        const hitEnemy = explosion.tiles.some((t) => t.r === enemyGrid.r && t.c === enemyGrid.c);
        if (hitEnemy) {
          this.enemies.splice(e, 1);
          this.score += 200;
        }
      }

      if (finished) {
        this.explosions.splice(i, 1);
      }
    }

    // Atualização dos inimigos com envio do mapa, bombas e rastreio direto do jogador
    for (const enemy of this.enemies) {
      enemy.update(this.map.grid, this.bombs, this.player);

      const dx = Math.abs(this.player.x + this.player.width / 2 - (enemy.x + enemy.width / 2));
      const dy = Math.abs(this.player.y + this.player.height / 2 - (enemy.y + enemy.height / 2));
      if (dx < 20 && dy < 20 && this.player.isAlive) {
        this.player.isAlive = false;
        this.lives--;
        this.playSound('hurt');
        if (this.lives <= 0) {
          this.isGameOver = true;
        } else {
          setTimeout(() => this.player.resetPosition(1 * TILE_SIZE + 4, 1 * TILE_SIZE + 4), 1000);
        }
      }
    }

    // Verificação de vitória de nível ao entrar na porta aberta
    if (this.map.doorPosition && this.enemies.length === 0) {
      const pGrid = this.player.getGridPosition();
      if (pGrid.r === this.map.doorPosition.r && pGrid.c === this.map.doorPosition.c) {
        this.level++;
        this.playSound('victory');

        if (this.level > 5) {
          this.isVictory = true;
        } else {
          this.initLevel();
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Desenha o Mapa (Tiles com Fundo Intergaláctico)
    for (let r = 0; r < this.map.grid.length; r++) {
      for (let c = 0; c < this.map.grid[r]!.length; c++) {
        const tile = this.map.grid[r]![c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === TileType.EMPTY) {
          const cosmicGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
          cosmicGrad.addColorStop(0, '#090d16');
          cosmicGrad.addColorStop(0.5, '#131b2e');
          cosmicGrad.addColorStop(1, '#05070c');
          ctx.fillStyle = cosmicGrad;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          const starSeed = (r * 37 + c * 73) % 5;
          if (starSeed === 1) {
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(x + 8, y + 12, 2, 2);
          } else if (starSeed === 3) {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x + 22, y + 20, 1.5, 1.5);
          }
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }

        if (tile === TileType.WALL_INDESCTRUCTIBLE) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === TileType.WALL_DESTRUCTIBLE) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === TileType.DOOR) {
          const isDoorOpen = this.enemies.length === 0;
          ctx.save();
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = isDoorOpen ? 16 : 4;

          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 12, y + 16, 8, 12);
          ctx.restore();
        }
      }
    }

    // 2. Desenha as Bombas
    for (const bomb of this.bombs) {
      const pos = bomb.getPixelPosition();
      const tileSize = TILE_SIZE;
      const pulse = Math.sin(Date.now() / 100) * 2;

      ctx.save();
      ctx.font = `${tileSize * 0.75 + pulse}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillText('💣', pos.x + tileSize / 2, pos.y + tileSize / 2);
      ctx.restore();
    }

    // 3. Efeitos Visuais de Fogo e Fumaça na Explosão
    for (const explosion of this.explosions) {
      ctx.save();

      for (const t of explosion.tiles) {
        const tx = t.c * TILE_SIZE;
        const ty = t.r * TILE_SIZE;
        const cx = tx + TILE_SIZE / 2;
        const cy = ty + TILE_SIZE / 2;

        ctx.fillStyle = 'rgba(100, 100, 100, 0.45)';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 16, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy + 4, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
        ctx.fillRect(tx + 7, ty + 7, TILE_SIZE - 14, TILE_SIZE - 14);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx + 12, ty + 12, TILE_SIZE - 24, TILE_SIZE - 24);
      }
      ctx.restore();
    }

    // 4. Desenha os Inimigos
    for (const enemy of this.enemies) {
      const ex = enemy.x;
      const ey = enemy.y;

      ctx.fillStyle = '#012915';
      ctx.beginPath();
      ctx.arc(ex + 16, ey + 16, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#012915';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex + 9, ey + 10, 4, 6);
      ctx.fillRect(ex + 19, ey + 10, 4, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ex + 11, ey + 12, 2, 3);
      ctx.fillRect(ex + 21, ey + 12, 2, 3);
    }

    // 5. Desenha o Personagem
    if (this.player.isAlive) {
      let row = 2;
      let col = 7;

      if (this.moveDir.x > 0) {
        row = 1;
        col = 1 + (Math.floor(Date.now() / 120) % 6);
      } else if (this.moveDir.x < 0) {
        row = 1;
        col = 7 + (Math.floor(Date.now() / 120) % 6);
      } else if (this.moveDir.y < 0) {
        row = 2;
        col = 1 + (Math.floor(Date.now() / 120) % 6);
      } else if (this.moveDir.y > 0) {
        row = 2;
        col = 7 + (Math.floor(Date.now() / 120) % 6);
      }

      if (this.isVictory) {
        row = 3;
        col = 8;
      }

      const tileSize = 32;
      const spriteW = 36;
      const spriteH = 29;

      const renderX = Math.round(this.player.x + (tileSize - spriteW) / 2 + 1);
      const renderY = Math.round(this.player.y + (tileSize - spriteH) / 2 + 2);
      const drawn = this.playerAtlas.draw(ctx, row, col, renderX, renderY, spriteW, spriteH);

      if (!drawn) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(renderX, renderY, spriteW, spriteH);
      }
    }
  }
}
