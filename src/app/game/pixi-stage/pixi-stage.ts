import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import * as PIXI from 'pixi.js';
import {GameEngine} from '../../core/engine/game-engine';
import {createEmptyState} from '../../core/engine/map-gen';
import {idx} from '../../core/models/game-state';


@Component({
  selector: 'app-pixi-stage',
  imports: [],
  templateUrl: './pixi-stage.html',
  styleUrl: './pixi-stage.scss',
  standalone: true,
})
export class PixiStage implements AfterViewInit, OnDestroy {
  @ViewChild('host', {static: true}) hostRef!: ElementRef<HTMLDivElement>;

  private app!: PIXI.Application;

  private tileLayer!: PIXI.Graphics;
  private playerLayer!: PIXI.Graphics;
  private gridLayer!: PIXI.Graphics;

  private readonly tileSize = 24;

  private engine = new GameEngine(createEmptyState(30, 25));

  async ngAfterViewInit() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'r') this.engine.dispatch({ type: 'build_room_from_selected' });
      if (key === 'p') this.engine.dispatch({ type: 'build_corridor_from_selected' });
      this.draw();
    });

    this.app = new PIXI.Application();
    await this.app.init({resizeTo: this.hostRef.nativeElement, antialias: true, backgroundAlpha: 0});
    this.hostRef.nativeElement.appendChild(this.app.canvas);

    this.tileLayer = new PIXI.Graphics();
    this.gridLayer = new PIXI.Graphics();
    this.playerLayer = new PIXI.Graphics();

    this.app.stage.addChild(this.tileLayer);
    this.app.stage.addChild(this.gridLayer);
    this.app.stage.addChild(this.playerLayer);

    // input
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 99999, 99999);
    this.app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      const p = e.global;
      const tx = Math.floor(p.x / this.tileSize);
      const ty = Math.floor(p.y / this.tileSize);
      const s = this.engine.getState();
      const i = idx(tx, ty, s.width);
      const kind = s.tiles[i].kind;

      if (kind === 'door') {
        this.engine.dispatch({ type: 'select_door', door: { x: tx, y: ty } });
      } else {
        this.engine.dispatch({ type: 'move', to: { x: tx, y: ty } });
      }
      this.draw();
    });

    // revela inicio
    this.engine.dispatch({type: 'noop'});
    this.draw();
  }

  private draw() {
    const s = this.engine.getState();

    this.tileLayer.clear();
    this.gridLayer.clear();
    this.playerLayer.clear();

    // 1) DIBUJAR TILES
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const t = s.tiles[idx(x, y, s.width)];
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // Colores por tipo
        const color =
          t.kind === 'wall' ? 0x1f1f1f :
            t.kind === 'floor' ? 0x3f3f3f :
              t.kind === 'corridor' ? 0x363636 :
                t.kind === 'door'
                  ? (t.doorUsed ? 0x6b4a1e : 0xc0841a) // puerta usada vs nueva
                  : 0x111111;

        this.tileLayer.rect(px, py, this.tileSize, this.tileSize);
        this.tileLayer.fill({ color, alpha: 1 });
      }
    }

    // 2) GRILLA
    this.gridLayer.stroke({ width: 1, color: 0x2a2a2a, alpha: 0.65 });

    const w = s.width * this.tileSize;
    const h = s.height * this.tileSize;

    for (let x = 0; x <= s.width; x++) {
      const px = x * this.tileSize;
      this.gridLayer.moveTo(px, 0);
      this.gridLayer.lineTo(px, h);
    }

    for (let y = 0; y <= s.height; y++) {
      const py = y * this.tileSize;
      this.gridLayer.moveTo(0, py);
      this.gridLayer.lineTo(w, py);
    }

    // 3) HIGHLIGHT: PUERTA SELECCIONADA
    if (s.selectedDoor) {
      const px = s.selectedDoor.x * this.tileSize;
      const py = s.selectedDoor.y * this.tileSize;

      // borde grueso encima de la grilla
      this.gridLayer.stroke({ width: 3, color: 0xFFD54A, alpha: 1 });
      this.gridLayer.rect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
    }

    // 4) JUGADOR
    const pad = 5;
    const pp = s.player.pos;
    this.playerLayer.rect(
      pp.x * this.tileSize + pad,
      pp.y * this.tileSize + pad,
      this.tileSize - pad * 2,
      this.tileSize - pad * 2
    );
    this.playerLayer.fill({ color: 0x4ade80, alpha: 1 });
  }

  ngOnDestroy() {
    this.app?.destroy(true);
  }
}
