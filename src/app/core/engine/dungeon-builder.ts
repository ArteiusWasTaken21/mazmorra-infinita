import { GameState, idx, inBounds, Point } from '../models/game-state';
import { rollND6 } from './dice';

type Dir = 'N' | 'S' | 'E' | 'W';

function tileAt(s: GameState, p: Point) {
  return s.tiles[idx(p.x, p.y, s.width)];
}

function setTile(s: GameState, p: Point, kind: GameState['tiles'][number]['kind']) {
  if (!inBounds(p.x, p.y, s)) return;
  s.tiles[idx(p.x, p.y, s.width)] = { kind, discovered: true };
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
 * Determina hacia dónde “sale” una puerta:
 * Busca un vecino floor (lado interno). La salida es el lado opuesto.
 */
function inferDoorExitDir(s: GameState, door: Point): Dir | null {
  const neighbors: Array<{ d: Dir; p: Point }> = [
    { d: 'N', p: { x: door.x, y: door.y - 1 } },
    { d: 'S', p: { x: door.x, y: door.y + 1 } },
    { d: 'E', p: { x: door.x + 1, y: door.y } },
    { d: 'W', p: { x: door.x - 1, y: door.y } },
  ];

  // Si encontramos floor cerca, ese lado es “adentro”
  const inside = neighbors.find(n => inBounds(n.p.x, n.p.y, s) && tileAt(s, n.p).kind === 'floor');
  if (!inside) return null;

  // Salimos hacia el lado opuesto
  return opposite(inside.d);
}

/**
 * Tabla de SALIDAS (ajústala si tus reglas dicen distinto).
 * Yo la dejo así (común y práctica):
 * 1 -> 0 salidas
 * 2-3 -> 1 salida
 * 4-5 -> 2 salidas
 * 6 -> 3 salidas
 */
function exitsFromNeutral(neutral: number): number {
  if (neutral === 1) return 0;
  if (neutral <= 3) return 1;
  if (neutral <= 5) return 2;
  return 3;
}

/**
 * Construye desde una puerta: habitación o pasillo.
 * rng: función determinista (luego le metemos semilla).
 */
export function buildFromDoor(s: GameState, rng: () => number, door: Point) {
  const dir = inferDoorExitDir(s, door);
  if (!dir) return { ok: false, reason: 'No pude inferir dirección de la puerta' };

  // Dados
  const X = rollND6(rng, 1).total; // principal
  const Y = rollND6(rng, 1).total; // secundario
  const N = rollND6(rng, 1).total; // neutro

  const exitsCount = exitsFromNeutral(N);

  // Celda “afuera” (primer tile después de la puerta)
  const out = step(door, dir);

  // Si ambos son 1: construcción libre (por ahora: 2x2)
  let w = X;
  let h = Y;
  let isCorridor = false;

  if (X === 1 && Y === 1) {
    w = 2; h = 2;
  } else if (X === 1 || Y === 1) {
    isCorridor = true;
  }

  if (isCorridor) {
    // Regla práctica: largo = el otro dado (2..6). Si sale 1 también, lo forzamos a 2.
    const length = Math.max(2, X === 1 ? Y : X);
    carveCorridor(s, out, dir, length);

    // Puerta al final del pasillo (y pequeña “cámara” 2x2 para que se vea bien)
    const end = advance(out, dir, length - 1);
    setTile(s, end, 'door');

    // Mini-cuarto al final para que puedas continuar desde ahí (opcional)
    carveRoomAnchored(s, step(end, dir), dir, 3, 3);

    // Salidas adicionales desde ese cuartito
    placeExtraExits(s, end, dir, exitsCount);

    return { ok: true, kind: 'corridor', rolls: { X, Y, N, exitsCount } };
  }

  // Habitación normal: X por Y anclada a la salida
  carveRoomAnchored(s, out, dir, w, h);

  // Poner salidas extra (sin contar la entrada)
  placeExtraExits(s, door, dir, exitsCount);

  return { ok: true, kind: 'room', rolls: { X, Y, N, exitsCount } };
}

function advance(p: Point, d: Dir, steps: number) {
  let cur = { ...p };
  for (let i = 0; i < steps; i++) cur = step(cur, d);
  return cur;
}

/**
 * Carva un corredor 1-tile ancho en dirección dir.
 */
function carveCorridor(s: GameState, start: Point, dir: Dir, length: number) {
  let cur = { ...start };
  for (let i = 0; i < length; i++) {
    if (!inBounds(cur.x, cur.y, s)) break;
    setTile(s, cur, 'corridor');
    cur = step(cur, dir);
  }
}

/**
 * Crea un cuarto W x H “pegado” a la salida, extendiéndose hacia dir.
 * Simplificación: lo centramos respecto al eje perpendicular para que se vea bien.
 */
function carveRoomAnchored(s: GameState, anchor: Point, dir: Dir, w: number, h: number) {
  // clamp mínimo razonable
  w = Math.max(2, Math.min(6, w));
  h = Math.max(2, Math.min(6, h));

  let x0 = anchor.x;
  let y0 = anchor.y;

  if (dir === 'N') { x0 = anchor.x - Math.floor(w / 2); y0 = anchor.y - (h - 1); }
  if (dir === 'S') { x0 = anchor.x - Math.floor(w / 2); y0 = anchor.y; }
  if (dir === 'E') { x0 = anchor.x; y0 = anchor.y - Math.floor(h / 2); }
  if (dir === 'W') { x0 = anchor.x - (w - 1); y0 = anchor.y - Math.floor(h / 2); }

  // Carvado simple (sin resolver colisiones todavía; eso va enseguida)
  for (let yy = y0; yy < y0 + h; yy++) {
    for (let xx = x0; xx < x0 + w; xx++) {
      if (!inBounds(xx, yy, s)) continue;
      // si ya era piso/corredor/puerta, lo dejamos (permitimos “solape” básico)
      const k = s.tiles[idx(xx, yy, s.width)].kind;
      if (k === 'wall' || k === 'unknown') setTile(s, { x: xx, y: yy }, 'floor');
    }
  }

  // Puerta de entrada (tile anchor)
  if (inBounds(anchor.x, anchor.y, s)) setTile(s, anchor, 'door');
}

/**
 * Coloca N salidas adicionales en la NUEVA habitación.
 * Simplificación: intenta poner puertas en lados distintos, evitando el lado de entrada.
 */
function placeExtraExits(s: GameState, fromDoor: Point, exitDir: Dir, exitsCount: number) {
  // Donde está la nueva zona: “afuera”
  const out = step(fromDoor, exitDir);

  // Elegimos candidatos en 3 lados (no el lado de entrada)
  const sides: Dir[] = ['N', 'E', 'W', 'S'].filter(d => d !== opposite(exitDir)) as Dir[];

  let placed = 0;
  for (let i = 0; i < exitsCount && i < sides.length; i++) {
    const d = sides[i];
    // ponemos puerta a 2 tiles de out (para que normalmente caiga dentro del cuarto)
    const p = step(step(out, d), d);
    if (!inBounds(p.x, p.y, s)) continue;

    // si ya hay piso/corredor, lo convertimos a puerta
    const k = tileAt(s, p).kind;
    if (k === 'floor' || k === 'corridor') {
      setTile(s, p, 'door');
      placed++;
    }
  }

  // Si no cupo alguna, no pasa nada; luego implementamos bien la regla “reducir/solapar”.
}
