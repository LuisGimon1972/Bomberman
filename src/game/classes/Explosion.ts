import { MAP_ROWS, MAP_COLS, TileType } from '../bombermanConstants';
import { BombermanMap } from '../BombermanMap';

export interface ExplosionTile {
  r: number;
  c: number;
}

export class Explosion {
  public tiles: ExplosionTile[] = [];
  public duration: number = 0.5; // Duração visual da chama na tela (0.5 segundos)

  constructor(bombR: number, bombC: number, range: number, map: BombermanMap) {
    this.calculateExplosion(bombR, bombC, range, map);
  }

  private calculateExplosion(bombR: number, bombC: number, range: number, map: BombermanMap) {
    const affectedTiles: ExplosionTile[] = [];

    // O centro da bomba atinge sempre
    affectedTiles.push({ r: bombR, c: bombC });
    map.hitTile(bombR, bombC);

    // As 4 direções da cruz: Cima, Baixo, Esquerda, Direita
    const directions = [
      { dr: -1, dc: 0 }, // Cima
      { dr: 1, dc: 0 }, // Baixo
      { dr: 0, dc: -1 }, // Esquerda
      { dr: 0, dc: 1 }, // Direita
    ];

    for (const dir of directions) {
      for (let i = 1; i <= range; i++) {
        const targetR = bombR + dir.dr * i;
        const targetC = bombC + dir.dc * i;

        // Verifica se está dentro dos limites do mapa
        if (targetR < 0 || targetR >= MAP_ROWS || targetC < 0 || targetC >= MAP_COLS) {
          break;
        }

        const tileType = map.grid[targetR]![targetC];

        // Parede Indestrutível interrompe a chama imediatamente e não é destruída
        if (tileType === TileType.WALL_INDESCTRUCTIBLE) {
          break;
        }

        // Adiciona o tile à área de explosão
        affectedTiles.push({ r: targetR, c: targetC });

        // Se for um bloco destrutível (tijolo), a bomba destrói-o e a chama para de avançar nessa direção
        const destroyed = map.hitTile(targetR, targetC);
        if (destroyed) {
          break; // O fogo para ao embater no tijolo que destruiu
        }
      }
    }

    this.tiles = affectedTiles;
  }

  public update(dt: number): boolean {
    this.duration -= dt;
    return this.duration <= 0; // Devolve true quando o efeito visual da explosão terminar
  }
}
