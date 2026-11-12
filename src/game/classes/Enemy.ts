import { TILE_SIZE, TileType, MAP_ROWS, MAP_COLS } from '../bombermanConstants';

export class Enemy {
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 32;
  public speed: number = 1.5;
  public direction: { x: number; y: number } = { x: 1, y: 0 };
  public isAlive: boolean = true;

  constructor(r: number, c: number) {
    this.x = c * TILE_SIZE + (TILE_SIZE - 32) / 2;
    this.y = r * TILE_SIZE + (TILE_SIZE - 32) / 2;
  }

  // Movimentação automática do inimigo com mudança aleatória de direção ao colidir
  public update(grid: number[][]) {
    if (!this.isAlive) return;

    const nextX = this.x + this.direction.x * this.speed;
    const nextY = this.y + this.direction.y * this.speed;

    if (!this.checkCollision(nextX, nextY, grid)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      // Se bateu num obstáculo, escolhe uma nova direção aleatória (Cima, Baixo, Esquerda ou Direita)
      this.changeDirection();
    }
  }

  private changeDirection() {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
    if (randomDir) {
      this.direction = randomDir;
    }
  }

  private checkCollision(x: number, y: number, grid: number[][]): boolean {
    const margin = 4;
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
        // Inimigos colidem com paredes indestrutíveis e blocos de tijolo
        if (tile === TileType.WALL_INDESCTRUCTIBLE || tile === TileType.WALL_DESTRUCTIBLE) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  }
}
