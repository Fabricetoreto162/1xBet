import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPariPage } from './details-pari.page';

describe('DetailsPariPage', () => {
  let component: DetailsPariPage;
  let fixture: ComponentFixture<DetailsPariPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsPariPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
