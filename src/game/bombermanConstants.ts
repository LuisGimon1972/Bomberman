export const TILE_SIZE = 40; // Tamanho de cada célula em pixels
export const MAP_COLS = 15; // Número de colunas do mapa
export const MAP_ROWS = 12; // Número de linhas do mapa

export const CANVAS_WIDTH = MAP_COLS * TILE_SIZE; // 600px
export const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE; // 520px

export enum TileType {
  EMPTY = 0,
  WALL_INDESCTRUCTIBLE = 1,
  WALL_DESTRUCTIBLE = 2,
  DOOR = 3, // Porta oculta (revelada ao destruir o tijolo correto)
}
