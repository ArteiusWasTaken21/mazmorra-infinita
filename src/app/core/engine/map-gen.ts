import { GameState, idx } from '../models/game-state';
import { Tile } from '../models/tile';

function makeTile(kind: Tile['kind']): Tile {
  return { kind, discovered: true };
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
    selectedDoor: null,
  };

  // Habitación inicial 3x3 ABAJO al centro
  const roomW = 3;
  const roomH = 3;

  const startX = Math.floor((width - roomW) / 2);
  const marginBottom = 1;
  const startY = height - marginBottom - roomH;

  carveRoom(state, startX, startY, roomW, roomH);

  // Centro del cuarto
  const cx = startX + 1;
  const cy = startY + 1;

  // Jugador inicia en el centro del cuarto
  state.player.pos = { x: cx, y: cy };

  // Puertas N/E/O
  setDoor(state, cx, startY - 1);         // N
  setDoor(state, startX + roomW, cy);     // E
  setDoor(state, startX - 1, cy);         // O

  // Entrada visual (abajo-centro): NO es puerta jugable.
  // Si quieres que se vea como entrada, descomenta:
  // setTile(state, { x: cx, y: startY + roomH }, 'corridor');

  return state;
}

export function carveRoom(s: GameState, x: number, y: number, w: number, h: number) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      s.tiles[idx(xx, yy, s.width)] = makeTile('floor');
    }
  }
}

function setTile(s: GameState, p: { x: number; y: number }, kind: Tile['kind']) {
  if (p.x < 0 || p.y < 0 || p.x >= s.width || p.y >= s.height) return;
  s.tiles[idx(p.x, p.y, s.width)] = makeTile(kind);
}

function setDoor(s: GameState, x: number, y: number) {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return;
  s.tiles[idx(x, y, s.width)] = { kind: 'door', discovered: true, doorUsed: false };
}
