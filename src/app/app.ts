import {Component} from '@angular/core';
import {PixiStage} from './game/pixi-stage/pixi-stage';

@Component({
  selector: 'app-root',
  imports: [PixiStage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
