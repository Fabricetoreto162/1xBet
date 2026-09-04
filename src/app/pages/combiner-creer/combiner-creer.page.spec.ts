import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombinerCreerPage } from './combiner-creer.page';

describe('CombinerCreerPage', () => {
  let component: CombinerCreerPage;
  let fixture: ComponentFixture<CombinerCreerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CombinerCreerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
