import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombinerListesPage } from './combiner-listes.page';

describe('CombinerListesPage', () => {
  let component: CombinerListesPage;
  let fixture: ComponentFixture<CombinerListesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CombinerListesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
