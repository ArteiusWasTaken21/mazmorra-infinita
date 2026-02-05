import { GameState, idx } from '../models/game-state';
import { Tile } from '../models/tile';

function makeTile(kind: Tile['kind']): Tile {
  return { kind, discovered: true }; // TODO: luego metemos fog; por ahora todo visible
}

export function createEmptyState(width: number, height: number): GameState {
  const tiles: Tile[] = Array.from({ length: width * height }, () => makeTile('wall'));

  const state: GameState = {
    turn: 0,
    width,
    height,
    tiles,
    player: { pos: { x: 0, y: 0 }, hp: 10, hpMax: 10, gold: 0 },
    log: [],
  };

  // Habitación inicial 3x3 centrada
  const roomW = 3;
  const roomH = 3;
  const startX = Math.floor((width - roomW) / 2);
  const startY = Math.floor((height - roomH) / 2);

  carveRoom(state, startX, startY, roomW, roomH);

  // Centro de la habitación
  const cx = startX + Math.floor(roomW / 2);
  const cy = startY + Math.floor(roomH / 2);

  // Jugador inicia en el centro
  state.player.pos = { x: cx, y: cy };

  // 3 salidas: Norte, Este, Oeste (puertas)
  setDoor(state, cx, startY - 1);          // N
  setDoor(state, startX + roomW, cy);      // E
  setDoor(state, startX - 1, cy);          // O

  return state;
}

export function carveRoom(s: GameState, x: number, y: number, w: number, h: number) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      s.tiles[idx(xx, yy, s.width)] = makeTile('floor');
    }
  }
}

function setDoor(s: GameState, x: number, y: number) {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return;
  s.tiles[idx(x, y, s.width)] = makeTile('door');
}
