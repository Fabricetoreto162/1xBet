import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChampionnatsPage } from './championnats.page';

describe('ChampionnatsPage', () => {
  let component: ChampionnatsPage;
  let fixture: ComponentFixture<ChampionnatsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChampionnatsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
