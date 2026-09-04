import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoldePage } from './solde.page';

describe('SoldePage', () => {
  let component: SoldePage;
  let fixture: ComponentFixture<SoldePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SoldePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
