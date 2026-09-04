import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreerProfilPage } from './creer-profil.page';

describe('CreerProfilPage', () => {
  let component: CreerProfilPage;
  let fixture: ComponentFixture<CreerProfilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreerProfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
