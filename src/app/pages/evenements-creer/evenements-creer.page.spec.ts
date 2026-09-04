import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvenementsCreerPage } from './evenements-creer.page';

describe('EvenementsCreerPage', () => {
  let component: EvenementsCreerPage;
  let fixture: ComponentFixture<EvenementsCreerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EvenementsCreerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
