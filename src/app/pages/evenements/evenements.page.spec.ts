import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvenementsPage } from './evenements.page';

describe('EvenementsPage', () => {
  let component: EvenementsPage;
  let fixture: ComponentFixture<EvenementsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EvenementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
