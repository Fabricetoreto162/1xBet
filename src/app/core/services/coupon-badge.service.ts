import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CouponBadgeService {
  readonly count = signal<number>(0);
  readonly visible = signal<boolean>(false);

  /**
   * Affiche le badge rouge sur le bouton flottant Coupon
   * uniquement lorsque la liste d'événements et la modale sont visibles.
   */
  afficher(nombreEvenements: number): void {
    if (nombreEvenements > 0) {
      this.count.set(nombreEvenements);
      this.visible.set(true);
    } else {
      this.masquer();
    }
  }

  /**
   * Masque immédiatement le badge au même moment
   * où la modale et les événements disparaissent.
   */
  masquer(): void {
    this.count.set(0);
    this.visible.set(false);
  }
}
