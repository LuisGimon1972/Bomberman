import { TILE_SIZE, TileType } from '../bombermanConstants';

export interface BombRef {
  r: number;
  c: number;
}

export interface PlayerRef {
  x: number;
  y: number;
  isAlive: boolean;
}

export class Enemy {
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 32;
  public speed: number;
  public isAdvanced: boolean;
  public direction: { x: number; y: number } = { x: 1, y: 0 };
  public isAlive: boolean = true;
  private chaseCooldown: number = 0;

  constructor(r: number, c: number, isAdvanced: boolean = false) {
    this.x = c * TILE_SIZE + (TILE_SIZE - 32) / 2;
    this.y = r * TILE_SIZE + (TILE_SIZE - 32) / 2;
    this.isAdvanced = isAdvanced;

    // Inimigos avançados (Nível 4+) são mais rápidos e agressivos
    this.speed = isAdvanced ? 2.3 : 1.5;
  }

  public update(grid: number[][], bombs: BombRef[] = [], player?: PlayerRef) {
    if (!this.isAlive) return;

    if (player && player.isAlive) {
      this.chaseCooldown++;
      // Inimigos avançados recalculam a perseguição muito mais frequentemente
      const threshold = this.isAdvanced ? 25 : 65;

      if (this.chaseCooldown > threshold) {
        this.chaseCooldown = 0;
        this.intensifyChase(player, grid, bombs);
      }
    }

    const nextX = this.x + this.direction.x * this.speed;
    const nextY = this.y + this.direction.y * this.speed;

    if (!this.checkCollision(nextX, nextY, grid, bombs)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      this.changeDirection(grid, bombs);
    }
  }

  private intensifyChase(player: PlayerRef, grid: number[][], bombs: BombRef[]) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;

    const directionsByPriority: { x: number; y: number }[] = [];

    if (Math.abs(dx) > Math.abs(dy)) {
      directionsByPriority.push({ x: dx > 0 ? 1 : -1, y: 0 });
      directionsByPriority.push({ x: 0, y: dy > 0 ? 1 : -1 });
      directionsByPriority.push({ x: 0, y: dy > 0 ? -1 : 1 });
      directionsByPriority.push({ x: dx > 0 ? -1 : 1, y: 0 });
    } else {
      directionsByPriority.push({ x: 0, y: dy > 0 ? 1 : -1 });
      directionsByPriority.push({ x: dx > 0 ? 1 : -1, y: 0 });
      directionsByPriority.push({ x: dx > 0 ? -1 : 1, y: 0 });
      directionsByPriority.push({ x: 0, y: dy > 0 ? -1 : 1 });
    }

    for (const dir of directionsByPriority) {
      const testX = this.x + dir.x * TILE_SIZE * 0.4;
      const testY = this.y + dir.y * TILE_SIZE * 0.4;
      if (!this.checkCollision(testX, testY, grid, bombs)) {
        this.direction = dir;
        return;
      }
    }
  }

  private changeDirection(grid: number[][], bombs: BombRef[]) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const validDirs = dirs.filter((dir) => {
      const testX = this.x + dir.x * TILE_SIZE * 0.4;
      const testY = this.y + dir.y * TILE_SIZE * 0.4;
      return !this.checkCollision(testX, testY, grid, bombs);
    });

    if (validDirs.length > 0) {
      const chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
      if (chosen) this.direction = chosen;
    }
  }

  private checkCollision(x: number, y: number, grid: number[][], bombs: BombRef[]): boolean {
    const margin = 4;
    const left = x + margin;
    const right = x + this.width - margin;
    const top = y + margin;
    const bottom = y + this.height - margin;

    const rTop = Math.floor(top / TILE_SIZE);
    const rBottom = Math.floor(bottom / TILE_SIZE);
    const cLeft = Math.floor(left / TILE_SIZE);
    const cRight = Math.floor(right / TILE_SIZE);

    const corners = [
      { r: rTop, c: cLeft },
      { r: rTop, c: cRight },
      { r: rBottom, c: cLeft },
      { r: rBottom, c: cRight },
    ];

    for (const corner of corners) {
      if (!grid[corner.r] || grid[corner.r]![corner.c] === undefined) {
        return true;
      }

      const tile = grid[corner.r]![corner.c];
      if (tile === TileType.WALL_INDESCTRUCTIBLE || tile === TileType.WALL_DESTRUCTIBLE) {
        return true;
      }

      const isBombHere = bombs.some((b) => b.r === corner.r && b.c === corner.c);
      if (isBombHere) {
        return true;
      }
    }

    return false;
  }
}
