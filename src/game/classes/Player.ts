import { TILE_SIZE, TileType } from '../bombermanConstants';

export class Player {
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 32;
  public speed: number = 2.5;
  public lives: number = 3;
  public isAlive: boolean = true;
  public bombLimit: number = 1;
  public activeBombs: number = 0;
  public fireRange: number = 2;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
  }

  public update(moveDir: { x: number; y: number }, grid: number[][]) {
    if (!this.isAlive) return;

    if (moveDir.x !== 0) {
      const nextX = this.x + moveDir.x * this.speed;
      if (!this.checkCollision(nextX, this.y, grid)) {
        this.x = nextX;
      }
    }

    if (moveDir.y !== 0) {
      const nextY = this.y + moveDir.y * this.speed;
      if (!this.checkCollision(this.x, nextY, grid)) {
        this.y = nextY;
      }
    }
  }

  private checkCollision(x: number, y: number, grid: number[][]): boolean {
    const margin = 6;
    const left = x + margin;
    const right = x + this.width - margin;
    const top = y + margin;
    const bottom = y + this.height - margin;

    const corners = [
      { r: Math.floor(top / TILE_SIZE), c: Math.floor(left / TILE_SIZE) },
      { r: Math.floor(top / TILE_SIZE), c: Math.floor(right / TILE_SIZE) },
      { r: Math.floor(bottom / TILE_SIZE), c: Math.floor(left / TILE_SIZE) },
      { r: Math.floor(bottom / TILE_SIZE), c: Math.floor(right / TILE_SIZE) },
    ];

    for (const corner of corners) {
      if (grid[corner.r] && grid[corner.r]![corner.c] !== undefined) {
        const tile = grid[corner.r]![corner.c];
        // O jogador colide com paredes indestrutíveis, blocos destrutíveis e portas fechadas/ocultas
        if (tile === TileType.WALL_INDESCTRUCTIBLE || tile === TileType.WALL_DESTRUCTIBLE) {
          return true;
        }
      } else {
        return true;
      }
    }

    return false;
  }

  public getGridPosition(): { r: number; c: number } {
    return {
      r: Math.floor((this.y + this.height / 2) / TILE_SIZE),
      c: Math.floor((this.x + this.width / 2) / TILE_SIZE),
    };
  }

  public resetPosition(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.isAlive = true;
  }
}
