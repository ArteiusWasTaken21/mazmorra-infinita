import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PixiStage } from './pixi-stage';

describe('PixiStage', () => {
  let component: PixiStage;
  let fixture: ComponentFixture<PixiStage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PixiStage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PixiStage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
