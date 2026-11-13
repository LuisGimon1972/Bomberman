import { TILE_SIZE } from '../bombermanConstants';

export class Bomb {
  public r: number;
  public c: number;
  public timer: number;
  public range: number;

  constructor(r: number, c: number, range: number) {
    this.r = r;
    this.c = c;
    this.timer = 3.0;
    this.range = range;
  }

  public update(dt: number): boolean {
    this.timer -= dt;
    return this.timer <= 0; // Devolve true se chegou a hora de explodir
  }

  public getPixelPosition(): { x: number; y: number } {
    return {
      x: this.c * TILE_SIZE + (TILE_SIZE - 32) / 2,
      y: this.r * TILE_SIZE + (TILE_SIZE - 32) / 2,
    };
  }
}
