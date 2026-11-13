import { MAP_ROWS, MAP_COLS, TileType } from './bombermanConstants';

export class BombermanMap {
  public grid: number[][] = [];
  public doorPosition: { r: number; c: number } | null = null;
  public isDoorRevealed: boolean = false;

  public generateLevel(level: number) {
    this.grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TileType.EMPTY));
    this.isDoorRevealed = false;

    // 1. Reinicializa a grelha com paredes indestrutíveis nas bordas e pilares internos
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

    // 2. Cria blocos destrutíveis garantindo avenidas amplas e evitando aglomerações
    const destructibleBlocks: { r: number; c: number }[] = [];
    const borderDestructibleBlocks: { r: number; c: number }[] = [];

    for (let r = 1; r < MAP_ROWS - 1; r++) {
      for (let c = 1; c < MAP_COLS - 1; c++) {
        // Zona inicial ampla totalmente livre para o jogador (canto superior esquerdo)
        if (r <= 3 && c <= 3) {
          continue;
        }

        // Densidade reduzida (25%) para garantir espaço aberto e rotas de fuga aos inimigos
        if (this.grid[r]![c] === TileType.EMPTY && Math.random() < 0.25) {
          // Evita colocar blocos destrutíveis em cruzamentos para dar total liberdade de circulação
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

    // 3. Escolhe a porta prioritariamente num bloco destrutível da borda; se não houver, escolhe nos normais
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

  // Executado quando uma bomba explode numa coordenada (r, c)
  public hitTile(r: number, c: number): boolean {
    if (this.grid[r]![c] === TileType.WALL_DESTRUCTIBLE) {
      // Se este bloco continha a porta secreta, revela-o imediatamente como um portal dourado!
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
