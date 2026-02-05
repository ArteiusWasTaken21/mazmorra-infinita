import { GameState, idx, inBounds, Point } from '../models/game-state';
import { mulberry32 } from './rng';
import { buildFromDoor, BuildMode } from './dungeon-builder';

export type Action =
  | { type: 'move'; to: Point }
  | { type: 'select_door'; door: Point }
  | { type: 'build_room_from_selected' }
  | { type: 'build_corridor_from_selected' }
  | { type: 'noop' };

export class GameEngine {
  private rng = mulberry32(123456);

  constructor(private state: GameState) {}

  getState() { return this.state; }

  dispatch(action: Action) {
    switch (action.type) {
      case 'move': this.handleMove(action.to); break;
      case 'select_door': this.handleSelectDoor(action.door); break;
      case 'build_room_from_selected': this.handleBuildFromSelected('room'); break;
      case 'build_corridor_from_selected': this.handleBuildFromSelected('corridor'); break;
      case 'noop': this.log('Listo'); break;
    }

    this.state.turn++;
  }

  private handleSelectDoor(door: Point) {
    const s = this.state;
    if (!inBounds(door.x, door.y, s)) return;

    const t = s.tiles[idx(door.x, door.y, s.width)];
    if (t.kind !== 'door') {
      this.log('Eso no es una puerta');
      return;
    }
    if (t.doorUsed) {
      this.log('Esa puerta ya fue usada');
      return;
    }

    s.selectedDoor = { ...door };
    this.log(`Puerta seleccionada: (${door.x}, ${door.y})`);
  }

  private handleBuildFromSelected(mode: BuildMode) {
    const s = this.state;

    if (!s.selectedDoor) {
      this.log('Primero selecciona una puerta');
      return;
    }

    const door = s.selectedDoor;

    if (!inBounds(door.x, door.y, s)) {
      this.log('Puerta seleccionada fuera de rango');
      s.selectedDoor = null;
      return;
    }

    const i = idx(door.x, door.y, s.width);
    const t = s.tiles[i];

    if (t.kind !== 'door') {
      this.log('La selección ya no es una puerta');
      s.selectedDoor = null;
      return;
    }

    if (t.doorUsed) {
      this.log('Esa puerta ya fue usada');
      s.selectedDoor = null;
      return;
    }

    const res = buildFromDoor(s, this.rng, door, mode);

    if (!res.ok) {
      this.log(`No se pudo construir: ${res.reason}`);
      return;
    }

    // marca puerta usada y limpia selección
    s.tiles[i] = { ...t, doorUsed: true };
    s.selectedDoor = null;

    this.log(
      `Construido (${mode}): ${res.kind} | X=${res.rolls.X}, Y=${res.rolls.Y}, N=${res.rolls.N}, salidas=${res.rolls.exitsCount}`
    );
  }

  private handleMove(to: Point) {
    const s = this.state;
    if (!inBounds(to.x, to.y, s)) return;

    const tile = s.tiles[idx(to.x, to.y, s.width)];
    if (tile.kind !== 'floor' && tile.kind !== 'corridor' && tile.kind !== 'door') {
      this.log(`No puedes moverte ahí (${tile.kind})`);
      return;
    }

    s.player.pos = { ...to };
    this.log(`Te mueves a (${to.x}, ${to.y})`);
  }

  private log(text: string) {
    this.state.log.unshift({ atTurn: this.state.turn, text });
    this.state.log = this.state.log.slice(0, 200);
  }
}
