import { GameState, idx, inBounds, Point } from '../models/game-state';
import { rollND6 } from './dice';

export type BuildMode = 'room' | 'corridor';

type Dir = 'N' | 'S' | 'E' | 'W';

function tileAt(s: GameState, p: Point) {
  return s.tiles[idx(p.x, p.y, s.width)];
}

function setTile(s: GameState, p: Point, kind: GameState['tiles'][number]['kind']) {
  if (!inBounds(p.x, p.y, s)) return;
  const cur = s.tiles[idx(p.x, p.y, s.width)];
  s.tiles[idx(p.x, p.y, s.width)] = { ...cur, kind, discovered: true };
}

function step(p: Point, d: Dir): Point {
  if (d === 'N') return { x: p.x, y: p.y - 1 };
  if (d === 'S') return { x: p.x, y: p.y + 1 };
  if (d === 'E') return { x: p.x + 1, y: p.y };
  return { x: p.x - 1, y: p.y };
}

function opposite(d: Dir): Dir {
  if (d === 'N') return 'S';
  if (d === 'S') return 'N';
  if (d === 'E') return 'W';
  return 'E';
}

/**
 * Encuentra hacia dónde “sale” una puerta:
 * busca el vecino 'floor' (adentro) y regresa el opuesto (afuera).
 */
function inferDoorExitDir(s: GameState, door: Point): Dir | null {
  const neighbors: Array<{ d: Dir; p: Point }> = [
    { d: 'N', p: { x: door.x, y: door.y - 1 } },
    { d: 'S', p: { x: door.x, y: door.y + 1 } },
    { d: 'E', p: { x: door.x + 1, y: door.y } },
    { d: 'W', p: { x: door.x - 1, y: door.y } },
  ];

  const inside = neighbors.find(n => inBounds(n.p.x, n.p.y, s) && tileAt(s, n.p).kind === 'floor');
  if (!inside) return null;
  return opposite(inside.d);
}

/**
 * Tabla de salidas (placeholder). La afinamos con tu regla exacta luego:
 * 1 -> 0
 * 2-3 -> 1
 * 4-5 -> 2
 * 6 -> 3
 */
function exitsFromNeutral(neutral: number): number {
  if (neutral === 1) return 0;
  if (neutral <= 3) return 1;
  if (neutral <= 5) return 2;
  return 3;
}

function advance(p: Point, d: Dir, steps: number) {
  let cur = { ...p };
  for (let i = 0; i < steps; i++) cur = step(cur, d);
  return cur;
}

function carveCorridor(s: GameState, start: Point, dir: Dir, length: number) {
  let cur = { ...start };
  for (let i = 0; i < length; i++) {
    if (!inBounds(cur.x, cur.y, s)) break;
    setTile(s, cur, 'corridor');
    cur = step(cur, dir);
  }
}

function carveRoomAnchored(s: GameState, anchor: Point, dir: Dir, w: number, h: number) {
  // clamp básico para que no salgan cuartos gigantes todavía
  w = Math.max(2, Math.min(6, w));
  h = Math.max(2, Math.min(6, h));

  let x0 = anchor.x;
  let y0 = anchor.y;

  // anclaje: el anchor es la puerta/entrada del cuarto
  if (dir === 'N') { x0 = anchor.x - Math.floor(w / 2); y0 = anchor.y - (h - 1); }
  if (dir === 'S') { x0 = anchor.x - Math.floor(w / 2); y0 = anchor.y; }
  if (dir === 'E') { x0 = anchor.x; y0 = anchor.y - Math.floor(h / 2); }
  if (dir === 'W') { x0 = anchor.x - (w - 1); y0 = anchor.y - Math.floor(h / 2); }

  for (let yy = y0; yy < y0 + h; yy++) {
    for (let xx = x0; xx < x0 + w; xx++) {
      if (!inBounds(xx, yy, s)) continue;
      const k = s.tiles[idx(xx, yy, s.width)].kind;
      if (k === 'wall' || k === 'unknown') setTile(s, { x: xx, y: yy }, 'floor');
    }
  }

  // el anchor debe quedar como puerta
  if (inBounds(anchor.x, anchor.y, s)) setTile(s, anchor, 'door');
}

function placeExtraExits(s: GameState, fromDoor: Point, exitDir: Dir, exitsCount: number) {
  const out = step(fromDoor, exitDir);
  const blockedSide = opposite(exitDir); // lado de entrada: NO poner salidas ahí

  const sides: Dir[] = ['N', 'E', 'W', 'S'].filter(d => d !== blockedSide) as Dir[];

  let placed = 0;
  for (let i = 0; i < exitsCount && i < sides.length; i++) {
    const d = sides[i];
    const p = step(step(out, d), d); // 2 pasos
    if (!inBounds(p.x, p.y, s)) continue;

    const k = tileAt(s, p).kind;
    if (k === 'floor' || k === 'corridor') {
      setTile(s, p, 'door');
      placed++;
    }
  }
}

/**
 * Construcción desde una puerta. El jugador elige mode:
 * - 'room' => siempre construye habitación (tamaños salen de X,Y)
 * - 'corridor' => siempre construye pasillo (largo sale de max(X,Y))
 */
export function buildFromDoor(s: GameState, rng: () => number, door: Point, mode: BuildMode) {
  const dir = inferDoorExitDir(s, door);
  if (!dir) return { ok: false as const, reason: 'No pude inferir dirección de la puerta' };

  const X = rollND6(rng, 1).total; // ancho/valor 1..6
  const Y = rollND6(rng, 1).total; // alto/valor 1..6
  const N = rollND6(rng, 1).total; // neutro 1..6
  const exitsCount = exitsFromNeutral(N);

  const out = step(door, dir);

  if (mode === 'corridor') {
    const length = Math.max(2, Math.max(X, Y));
    carveCorridor(s, out, dir, length);

    // puerta al final del pasillo
    const end = advance(out, dir, length - 1);
    setTile(s, end, 'door');

    // cuarto pequeño visual para que sea jugable inmediatamente
    carveRoomAnchored(s, step(end, dir), dir, 3, 3);

    // salidas extra desde esa zona
    placeExtraExits(s, end, dir, exitsCount);

    return { ok: true as const, kind: 'corridor' as const, rolls: { X, Y, N, exitsCount } };
  }

  // mode === 'room'
  carveRoomAnchored(s, out, dir, X, Y);
  placeExtraExits(s, door, dir, exitsCount);

  return { ok: true as const, kind: 'room' as const, rolls: { X, Y, N, exitsCount } };
}
