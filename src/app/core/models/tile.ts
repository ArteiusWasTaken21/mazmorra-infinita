export type TileKind = 'unknown' | 'wall' | 'floor' | 'door' | 'corridor';

export interface Tile {
  kind: TileKind;
  discovered: boolean;
  doorUsed?: boolean; // solo para kind === 'door'
}
