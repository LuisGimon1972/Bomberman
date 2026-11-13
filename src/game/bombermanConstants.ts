export const TILE_SIZE = 35;
export const MAP_COLS = 15;
export const MAP_ROWS = 13;

export const CANVAS_WIDTH = MAP_COLS * TILE_SIZE;
export const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE;

export enum TileType {
  EMPTY = 0,
  WALL_INDESCTRUCTIBLE = 1,
  WALL_DESTRUCTIBLE = 2,
  DOOR = 3,
}
