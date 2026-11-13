import { MAP_ROWS, MAP_COLS, TileType } from '../bombermanConstants';
import { BombermanMap } from '../BombermanMap';

export interface ExplosionTile {
  r: number;
  c: number;
}

export class Explosion {
  public tiles: ExplosionTile[] = [];
  public duration: number = 0.5;

  constructor(bombR: number, bombC: number, range: number, map: BombermanMap) {
    this.calculateExplosion(bombR, bombC, range, map);
  }

  private calculateExplosion(bombR: number, bombC: number, range: number, map: BombermanMap) {
    const affectedTiles: ExplosionTile[] = [];

    affectedTiles.push({ r: bombR, c: bombC });
    map.hitTile(bombR, bombC);

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      for (let i = 1; i <= range; i++) {
        const targetR = bombR + dir.dr * i;
        const targetC = bombC + dir.dc * i;

        if (targetR < 0 || targetR >= MAP_ROWS || targetC < 0 || targetC >= MAP_COLS) {
          break;
        }

        const tileType = map.grid[targetR]![targetC];

        if (tileType === TileType.WALL_INDESCTRUCTIBLE) {
          break;
        }

        affectedTiles.push({ r: targetR, c: targetC });

        const destroyed = map.hitTile(targetR, targetC);
        if (destroyed) {
          break;
        }
      }
    }

    this.tiles = affectedTiles;
  }

  public update(dt: number): boolean {
    this.duration -= dt;
    return this.duration <= 0;
  }
}
