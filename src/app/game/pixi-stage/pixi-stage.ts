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
        this.engine.dispatch({ type: 'build_from_door', door: { x: tx, y: ty } });
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
    this.playerLayer.clear();
    this.gridLayer.clear();

    // tiles + fog
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const t = s.tiles[idx(x, y, s.width)];
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // base tile (solo si descubierto, si no: negro)
        if (!t.discovered) {
          this.tileLayer.rect(px, py, this.tileSize, this.tileSize);
          this.tileLayer.fill({color: 0x000000, alpha: 1});
          continue;
        }

        const color =
          t.kind === 'wall' ? 0x222222 :
            t.kind === 'floor' ? 0x444444 :
              t.kind === 'corridor' ? 0x3a3a3a :
                t.kind === 'door' ? 0x8b5a2b :
                  0x111111;

        this.tileLayer.rect(px, py, this.tileSize, this.tileSize);
        this.tileLayer.fill({color, alpha: 1});
      }
    }

    // grilla ligera arriba
    this.gridLayer.stroke({width: 1, color: 0x2a2a2a, alpha: 0.6});
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

    // player
    const pad = 5;
    const pp = s.player.pos;
    this.playerLayer.rect(pp.x * this.tileSize + pad, pp.y * this.tileSize + pad, this.tileSize - pad * 2, this.tileSize - pad * 2);
    this.playerLayer.fill({color: 0x4ade80, alpha: 1});
  }

  ngOnDestroy() {
    this.app?.destroy(true);
  }
}
