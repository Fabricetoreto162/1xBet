import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DefinirProfilPage } from './definir-profil.page';

describe('DefinirProfilPage', () => {
  let component: DefinirProfilPage;
  let fixture: ComponentFixture<DefinirProfilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DefinirProfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
