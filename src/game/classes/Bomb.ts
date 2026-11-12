import { TILE_SIZE } from '../bombermanConstants';

export class Bomb {
  public r: number;
  public c: number;
  public timer: number; // Tempo até rebentar (em segundos ou frames)
  public range: number; // Alcance da explosão em blocos

  constructor(r: number, c: number, range: number) {
    this.r = r;
    this.c = c;
    this.timer = 3.0; // 3 segundos para explodir
    this.range = range;
  }

  // Atualiza o temporizador da bomba
  public update(dt: number): boolean {
    this.timer -= dt;
    return this.timer <= 0; // Devolve true se chegou a hora de explodir
  }

  // Devolve a posição em pixéis centralizada no tile
  public getPixelPosition(): { x: number; y: number } {
    return {
      x: this.c * TILE_SIZE + (TILE_SIZE - 32) / 2,
      y: this.r * TILE_SIZE + (TILE_SIZE - 32) / 2,
    };
  }
}
