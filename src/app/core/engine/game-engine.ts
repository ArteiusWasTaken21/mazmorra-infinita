import { GameState, idx, inBounds, Point } from '../models/game-state';
import { mulberry32 } from './rng';
import { buildFromDoor } from './dungeon-builder';

export type Action =
  | { type: 'move'; to: Point }
  | { type: 'build_from_door'; door: Point }
  | { type: 'noop' };

export class GameEngine {
  private rng = mulberry32(123456); // luego lo hacemos configurable/guardable

  constructor(private state: GameState) {}

  getState() { return this.state; }

  dispatch(action: Action) {
    switch (action.type) {
      case 'move': this.handleMove(action.to); break;
      case 'build_from_door': this.handleBuildFromDoor(action.door); break;
      case 'noop': this.log('Listo'); break;
    }
    this.state.turn++;
  }

  private handleBuildFromDoor(door: Point) {
    const s = this.state;
    if (!inBounds(door.x, door.y, s)) return;

    const t = s.tiles[idx(door.x, door.y, s.width)];
    if (t.kind !== 'door') {
      this.log('Eso no es una puerta');
      return;
    }

    const res = buildFromDoor(s, this.rng, door);
    if (!res.ok) {
      this.log(`No se pudo construir: ${res.reason}`);
      return;
    }

    this.log(`Construido: ${res.kind} (X=${res.rolls!.X}, Y=${res.rolls!.Y}, N=${res.rolls!.N}, salidas=${res.rolls!.exitsCount})`);
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
