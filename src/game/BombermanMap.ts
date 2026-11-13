import { MAP_ROWS, MAP_COLS, TileType } from './bombermanConstants';

export class BombermanMap {
  public grid: number[][] = [];
  public doorPosition: { r: number; c: number } | null = null;
  public isDoorRevealed: boolean = false;

  public generateLevel(level: number) {
    this.grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TileType.EMPTY));
    this.isDoorRevealed = false;

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (
          r === 0 ||
          r === MAP_ROWS - 1 ||
          c === 0 ||
          c === MAP_COLS - 1 ||
          (r % 2 === 0 && c % 2 === 0)
        ) {
          this.grid[r]![c] = TileType.WALL_INDESCTRUCTIBLE;
        } else {
          this.grid[r]![c] = TileType.EMPTY;
        }
      }
    }

    const destructibleBlocks: { r: number; c: number }[] = [];
    const borderDestructibleBlocks: { r: number; c: number }[] = [];

    for (let r = 1; r < MAP_ROWS - 1; r++) {
      for (let c = 1; c < MAP_COLS - 1; c++) {
        if (r <= 3 && c <= 3) {
          continue;
        }

        if (this.grid[r]![c] === TileType.EMPTY && Math.random() < 0.25) {
          const isIntersection = r % 2 !== 0 && c % 2 !== 0;
          if (!isIntersection) {
            this.grid[r]![c] = TileType.WALL_DESTRUCTIBLE;
            destructibleBlocks.push({ r, c });

            if (r === 1 || r === MAP_ROWS - 2 || c === 1 || c === MAP_COLS - 2) {
              borderDestructibleBlocks.push({ r, c });
            }
          }
        }
      }
    }

    const candidateBlocks =
      borderDestructibleBlocks.length > 0 ? borderDestructibleBlocks : destructibleBlocks;

    if (candidateBlocks.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidateBlocks.length);
      const doorBlock = candidateBlocks[randomIndex]!;
      this.doorPosition = { r: doorBlock.r, c: doorBlock.c };
    } else {
      this.doorPosition = null;
    }
  }

  public hitTile(r: number, c: number): boolean {
    if (this.grid[r]![c] === TileType.WALL_DESTRUCTIBLE) {
      if (this.doorPosition && this.doorPosition.r === r && this.doorPosition.c === c) {
        this.isDoorRevealed = true;
        this.grid[r]![c] = TileType.DOOR;
      } else {
        this.grid[r]![c] = TileType.EMPTY; // Bloco normal destruído
      }
      return true;
    }
    return false;
  }
}
