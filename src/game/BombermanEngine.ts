import { TILE_SIZE, TileType, CANVAS_WIDTH, CANVAS_HEIGHT } from './bombermanConstants';
import { BombermanMap } from './BombermanMap';
import { Player } from './classes/Player';
import { Bomb } from './classes/Bomb';
import { Explosion } from './classes/Explosion';
import { Enemy } from './classes/Enemy';
import { PlayerAtlas } from './classes/PlayerAtlas';

type Direction = { x: number; y: number };
type SoundEffect = 'bomb' | 'explode' | 'hurt' | 'victory';

const PLAYER_START = {
  x: TILE_SIZE + 4,
  y: TILE_SIZE + 4,
} as const;

const MAX_LEVEL = 5;
const MAX_FRAME_DELTA_SECONDS = 0.05;
const PLAYER_INVULNERABILITY_MS = 1_000;
const ENEMY_SCORE = 200;
const BOMB_RANGE = 99;
const ENEMY_SPAWN_ATTEMPTS = 250;

export class BombermanEngine {
  public map: BombermanMap;
  public player: Player;
  public bombs: Bomb[] = [];
  public explosions: Explosion[] = [];
  public enemies: Enemy[] = [];

  public level = 1;
  public score = 0;
  public lives = 3;
  public isGameOver = false;
  public isVictory = false;
  public moveDir: Direction = { x: 0, y: 0 };

  private lastTime = 0;
  private respawnAt: number | null = null;
  private audioCtx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly playerAtlas: PlayerAtlas;

  private readonly unlockAudio = (): void => {
    const ctx = this.getAudioContext();
    if (ctx?.state === 'suspended') {
      void ctx.resume();
    }
  };

  constructor() {
    this.map = new BombermanMap();
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.playerAtlas = new PlayerAtlas('/images/Atlasbomberman.png');

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlockAudio, { once: true });
      window.addEventListener('keydown', this.unlockAudio, { once: true });
    }

    this.initLevel();
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlockAudio);
      window.removeEventListener('keydown', this.unlockAudio);
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
  }

  public initLevel(): void {
    this.map.generateLevel(this.level);
    this.player.resetPosition(PLAYER_START.x, PLAYER_START.y);
    this.bombs = [];
    this.explosions = [];
    this.enemies = [];
    this.respawnAt = null;
    this.lastTime = 0;

    const enemyCount = 2 + this.level;
    for (let i = 0; i < enemyCount; i++) {
      if (!this.spawnRandomEnemy()) break;
    }
  }

  public placeBomb(): void {
    if (!this.player.isAlive || this.isGameOver || this.isVictory) return;

    const { r, c } = this.player.getGridPosition();
    const alreadyOccupied = this.bombs.some((bomb) => bomb.r === r && bomb.c === c);

    if (!alreadyOccupied && this.player.activeBombs < this.player.bombLimit) {
      this.bombs.push(new Bomb(r, c, BOMB_RANGE));
      this.player.activeBombs += 1;
      this.playSound('bomb');
    }
  }

  public update(): void {
    if (this.isGameOver || this.isVictory) return;

    const now = performance.now();
    const dt = this.lastTime
      ? Math.min((now - this.lastTime) / 1_000, MAX_FRAME_DELTA_SECONDS)
      : 1 / 60;
    this.lastTime = now;

    this.updateRespawn(now);

    if (this.player.isAlive) {
      this.player.update(this.moveDir, this.map.grid);
    }

    this.updateBombs(dt);
    this.updateExplosions(dt);
    this.updateEnemies();
    this.updateLevelProgress();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderMap(ctx);
    this.renderBombs(ctx);
    this.renderExplosions(ctx);
    this.renderEnemies(ctx);
    this.renderPlayer(ctx);
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    if (typeof window === 'undefined') return null;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    this.audioCtx = new AudioContextClass();
    return this.audioCtx;
  }

  private playSound(type: SoundEffect): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;

      switch (type) {
        case 'bomb':
          this.playTone(ctx, now, {
            oscillator: 'triangle',
            startFrequency: 300,
            endFrequency: 100,
            duration: 0.1,
            volume: 0.3,
            exponentialFrequency: true,
          });
          break;

        case 'hurt':
          this.playTone(ctx, now, {
            oscillator: 'square',
            startFrequency: 200,
            endFrequency: 80,
            duration: 0.3,
            volume: 0.4,
          });
          break;

        case 'victory':
          this.playVictorySound(ctx, now);
          break;

        case 'explode':
          this.playExplosionSound(ctx, now);
          break;
      }
    } catch {
      // O jogo continua normalmente quando a API de áudio não está disponível.
    }
  }

  private playTone(
    ctx: AudioContext,
    now: number,
    options: {
      oscillator: OscillatorType;
      startFrequency: number;
      endFrequency: number;
      duration: number;
      volume: number;
      exponentialFrequency?: boolean;
    },
  ): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = options.oscillator;
    oscillator.frequency.setValueAtTime(options.startFrequency, now);

    if (options.exponentialFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        options.endFrequency,
        now + options.duration,
      );
    } else {
      oscillator.frequency.linearRampToValueAtTime(options.endFrequency, now + options.duration);
    }

    gain.gain.setValueAtTime(options.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + options.duration);
  }

  private playVictorySound(ctx: AudioContext, now: number): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(330, now);
    oscillator.frequency.setValueAtTime(440, now + 0.12);
    oscillator.frequency.setValueAtTime(554.37, now + 0.24);
    oscillator.frequency.setValueAtTime(659.25, now + 0.36);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.6);
  }

  private playExplosionSound(ctx: AudioContext, now: number): void {
    this.playTone(ctx, now, {
      oscillator: 'sawtooth',
      startFrequency: 150,
      endFrequency: 20,
      duration: 0.6,
      volume: 0.8,
      exponentialFrequency: true,
    });

    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.7);
      this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);

      for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    whiteNoise.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(100, now + 0.7);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.7);
  }

  private spawnRandomEnemy(): boolean {
    const rowCount = this.map.grid.length;
    const columnCount = this.map.grid[0]?.length ?? 0;

    if (rowCount < 3 || columnCount < 3) return false;

    for (let attempt = 0; attempt < ENEMY_SPAWN_ATTEMPTS; attempt++) {
      const r = this.randomInt(1, rowCount - 2);
      const c = this.randomInt(1, columnCount - 2);

      const isSpawnArea = r <= 3 && c <= 3;
      const isOccupied = this.enemies.some((enemy) => {
        const position = this.getEntityGridPosition(enemy);
        return position.r === r && position.c === c;
      });

      if (this.map.grid[r]?.[c] === TileType.EMPTY && !isSpawnArea && !isOccupied) {
        this.enemies.push(new Enemy(r, c));
        return true;
      }
    }

    return false;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i]!;
      if (!bomb.update(dt)) continue;

      this.bombs.splice(i, 1);
      this.player.activeBombs = Math.max(0, this.player.activeBombs - 1);
      this.explosions.push(new Explosion(bomb.r, bomb.c, bomb.range, this.map));
      this.playSound('explode');
    }
  }

  private updateExplosions(dt: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]!;
      const finished = explosion.update(dt);

      if (this.player.isAlive) {
        const playerGrid = this.player.getGridPosition();
        if (this.tileListContains(explosion.tiles, playerGrid.r, playerGrid.c)) {
          this.damagePlayer();
        }
      }

      for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = this.enemies[enemyIndex]!;
        const enemyGrid = this.getEntityGridPosition(enemy);

        if (this.tileListContains(explosion.tiles, enemyGrid.r, enemyGrid.c)) {
          this.enemies.splice(enemyIndex, 1);
          this.score += ENEMY_SCORE;
        }
      }

      if (finished) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.update(this.map.grid, this.bombs, this.player);

      if (this.player.isAlive && this.entitiesOverlap(this.player, enemy)) {
        this.damagePlayer();
      }
    }
  }

  private updateRespawn(now: number): void {
    if (this.respawnAt === null || now < this.respawnAt || this.isGameOver) return;

    this.respawnAt = null;
    this.player.resetPosition(PLAYER_START.x, PLAYER_START.y);
  }

  private damagePlayer(): void {
    if (!this.player.isAlive || this.isGameOver) return;

    this.player.isAlive = false;
    this.lives = Math.max(0, this.lives - 1);
    this.playSound('hurt');

    if (this.lives === 0) {
      this.isGameOver = true;
      this.respawnAt = null;
      return;
    }

    this.respawnAt = performance.now() + PLAYER_INVULNERABILITY_MS;
  }

  private updateLevelProgress(): void {
    const door = this.map.doorPosition;
    if (!door || this.enemies.length > 0 || !this.player.isAlive) return;

    const playerGrid = this.player.getGridPosition();
    if (playerGrid.r !== door.r || playerGrid.c !== door.c) return;

    this.playSound('victory');

    if (this.level >= MAX_LEVEL) {
      this.isVictory = true;
      return;
    }

    this.level += 1;
    this.initLevel();
  }

  private getEntityGridPosition(entity: { x: number; y: number; width: number; height: number }): {
    r: number;
    c: number;
  } {
    return {
      r: Math.floor((entity.y + entity.height / 2) / TILE_SIZE),
      c: Math.floor((entity.x + entity.width / 2) / TILE_SIZE),
    };
  }

  private tileListContains(
    tiles: ReadonlyArray<{ r: number; c: number }>,
    r: number,
    c: number,
  ): boolean {
    return tiles.some((tile) => tile.r === r && tile.c === c);
  }

  private entitiesOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  private renderMap(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < this.map.grid.length; r++) {
      const row = this.map.grid[r]!;

      for (let c = 0; c < row.length; c++) {
        const tile = row[c]!;
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        this.renderTileBackground(ctx, tile, r, c, x, y);

        switch (tile) {
          case TileType.WALL_INDESCTRUCTIBLE:
            ctx.fillStyle = '#475569';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#334155';
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            break;

          case TileType.WALL_DESTRUCTIBLE:
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            break;

          case TileType.DOOR:
            this.renderDoor(ctx, x, y);
            break;
        }
      }
    }
  }

  private renderTileBackground(
    ctx: CanvasRenderingContext2D,
    tile: TileType,
    row: number,
    column: number,
    x: number,
    y: number,
  ): void {
    if (tile !== TileType.EMPTY) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      return;
    }

    const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
    gradient.addColorStop(0, '#090d16');
    gradient.addColorStop(0.5, '#131b2e');
    gradient.addColorStop(1, '#05070c');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    const starSeed = (row * 37 + column * 73) % 5;
    if (starSeed === 1) {
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(x + 8, y + 12, 2, 2);
    } else if (starSeed === 3) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x + 22, y + 20, 1.5, 1.5);
    }
  }

  private renderDoor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const isOpen = this.enemies.length === 0;

    ctx.save();
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = isOpen ? 16 : 4;
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 12, y + 16, 8, 12);
    ctx.restore();
  }

  private renderBombs(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(performance.now() / 100) * 2;

    for (const bomb of this.bombs) {
      const position = bomb.getPixelPosition();

      ctx.save();
      ctx.font = `${TILE_SIZE * 0.75 + pulse}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillText('💣', position.x + TILE_SIZE / 2, position.y + TILE_SIZE / 2);
      ctx.restore();
    }
  }

  private renderExplosions(ctx: CanvasRenderingContext2D): void {
    for (const explosion of this.explosions) {
      ctx.save();

      for (const tile of explosion.tiles) {
        const x = tile.c * TILE_SIZE;
        const y = tile.r * TILE_SIZE;
        const centerX = x + TILE_SIZE / 2;
        const centerY = y + TILE_SIZE / 2;

        ctx.fillStyle = 'rgba(100, 100, 100, 0.45)';
        ctx.beginPath();
        ctx.arc(centerX - 4, centerY - 4, 16, 0, Math.PI * 2);
        ctx.arc(centerX + 4, centerY + 4, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
        ctx.fillRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 12, y + 12, TILE_SIZE - 24, TILE_SIZE - 24);
      }

      ctx.restore();
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      const { x, y } = enemy;

      ctx.fillStyle = '#012915';
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#012915';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 9, y + 10, 4, 6);
      ctx.fillRect(x + 19, y + 10, 4, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 11, y + 12, 2, 3);
      ctx.fillRect(x + 21, y + 12, 2, 3);
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    if (!this.player.isAlive) return;

    let row = 2;
    let column = 7;
    const animationFrame = Math.floor(performance.now() / 120) % 6;

    if (this.moveDir.x > 0) {
      row = 1;
      column = 1 + animationFrame;
    } else if (this.moveDir.x < 0) {
      row = 1;
      column = 7 + animationFrame;
    } else if (this.moveDir.y < 0) {
      row = 2;
      column = 1 + animationFrame;
    } else if (this.moveDir.y > 0) {
      row = 2;
      column = 7 + animationFrame;
    }

    const spriteWidth = 36;
    const spriteHeight = 29;
    const renderX = Math.round(this.player.x + (TILE_SIZE - spriteWidth) / 2 + 1);
    const renderY = Math.round(this.player.y + (TILE_SIZE - spriteHeight) / 2 + 2);
    const drawn = this.playerAtlas.draw(
      ctx,
      row,
      column,
      renderX,
      renderY,
      spriteWidth,
      spriteHeight,
    );

    if (!drawn) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(renderX, renderY, spriteWidth, spriteHeight);
    }
  }
}
