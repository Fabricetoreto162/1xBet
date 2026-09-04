import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonModal, ToastController, IonSpinner } from '@ionic/angular';
import { Router } from '@angular/router';
import { SoldeService } from '../../core/services/solde.service';
import { CombinersService } from '../../core/services/combiners.service';

@Component({
  selector: 'app-coupon',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonModal, IonSpinner],
  templateUrl: './coupon.page.html',
  styleUrls: ['./coupon.page.scss']
})
export class CouponPage implements OnInit {
  solde = 0;

  // Chargement du coupon par code
  modalChargerOuvert = false;
  codeSaisi = '';
  chargementEnCours = false;

  constructor(
    private soldeSvc: SoldeService,
    private combinersSvc: CombinersService,
    private router: Router,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    
    this.solde = await this.soldeSvc.getMontant();
    // Nécessaire ici : les callbacks Firestore ne déclenchent pas
    // toujours un cycle de détection de changement (point de
    // vigilance 4.2 du skill).
    this.chargementEnCours = false;
    this.cdr.detectChanges();
  }

  // Getter pour afficher le solde formaté (ex: 102 238.60)
  get texteSolde(): string {
    return this.formatterNombre(this.solde / 100, true);
  }

  // Fonction utilitaire de formatage
  private formatterNombre(valeur: number, forcerDecimales: boolean = false): string {
    if (valeur == null || isNaN(valeur)) valeur = 0;
    
    const estEntier = Number.isInteger(valeur);
    const decimales = estEntier && !forcerDecimales ? 0 : 2;
    
    let str = valeur.toFixed(decimales);
    const parties = str.split('.');
    let partieEntiere = parties[0];
    const partieDecimale = parties[1] ? '.' + parties[1] : '';
    
    // Gérer le signe négatif s'il y en a un
    const estNegatif = partieEntiere.startsWith('-');
    if (estNegatif) partieEntiere = partieEntiere.substring(1);
    
    // Ajouter les espaces pour les milliers (ex: 102238 -> 102 238)
    partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return (estNegatif ? '-' : '') + partieEntiere + partieDecimale;
  }

  aller(route: string) {
    this.router.navigateByUrl(route);
  }

  ouvrirModalCharger() {
    this.modalChargerOuvert = true;
  }

  fermerModalCharger() {
    this.modalChargerOuvert = false;
    this.codeSaisi = '';
  }

  async telecharger() {
    const code = this.codeSaisi.trim().toUpperCase();
    if (!code) return;

    this.chargementEnCours = true;
    try {
      const combiner = await this.combinersSvc.getParCode(code);
      if (!combiner) {
        const toast = await this.toastCtrl.create({
          message: 'Code introuvable',
          color: 'danger',
          duration: 2000
        });
        await toast.present();
        return;
      }

      this.modalChargerOuvert = false;
      this.codeSaisi = '';
      // pari-miser est imbriquée sous /tabs (pour garder la tab bar
      // visible, comme sur tes captures) et lit :code depuis l'URL.
      this.router.navigateByUrl('/tabs/pari-miser/' + code);
    } finally {
      this.chargementEnCours = false;
      this.cdr.detectChanges();
    }
  }
}