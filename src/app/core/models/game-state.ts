import { Tile } from './tile';

export interface Point { x: number; y: number; }

export interface PlayerState {
  pos: Point;
  hp: number;
  hpMax: number;
  gold: number;
}

export interface GameLogEntry {
  atTurn: number;
  text: string;
}

export interface GameState {
  turn: number;
  width: number;
  height: number;
  tiles: Tile[];     // 1D para performance
  player: PlayerState;
  log: GameLogEntry[];
}

export function idx(x: number, y: number, w: number) {
  return y * w + x;
}

export function inBounds(x: number, y: number, s: { width: number; height: number }) {
  return x >= 0 && y >= 0 && x < s.width && y < s.height;
}
