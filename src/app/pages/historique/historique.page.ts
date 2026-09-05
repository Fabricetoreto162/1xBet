import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, IonHeader, IonToolbar, IonSpinner } from '@ionic/angular';
import { Router } from '@angular/router';
import { ParisService } from '../../core/services/paris.service';
import { SoldeService } from '../../core/services/solde.service';
import { Pari } from '../../core/models/pari.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonHeader, IonToolbar, IonSpinner],
  templateUrl: './historique.page.html',
  styleUrls: ['./historique.page.scss']
})
export class HistoriquePage implements OnInit, OnDestroy {
  paris: Pari[] = [];
  solde = 0;
  private subs = new Subscription();
  chargementEnCours = true; 

  constructor(
    private parisSvc: ParisService,
    private soldeSvc: SoldeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.chargementEnCours = this.paris.length === 0;

    // 1. Écoute en temps réel des paris
    this.subs.add(
      this.parisSvc.ecouterParis().subscribe((paris: Pari[]) => {
        this.paris = paris || [];
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      })
    );

    // 2. Écoute en temps réel du solde
    this.subs.add(
      this.soldeSvc.solde$.subscribe((solde: number) => {
        this.solde = solde;
        this.cdr.detectChanges();
      })
    );

    await this.actualiser();
  }

  // Se déclenche automatiquement à chaque visite de la page
  async ionViewWillEnter() {
    await this.actualiser();
  }

  async actualiser() {
    if (this.paris.length === 0) {
      this.chargementEnCours = true;
      this.cdr.detectChanges();
    }

    try {
      const [paris, solde] = await Promise.all([
        this.parisSvc.listerTous(true),
        this.soldeSvc.getMontant()
      ]);
      this.paris = paris || [];
      this.solde = solde;
    } catch (err) {
      console.warn('Erreur chargement historique:', err);
    } finally {
      this.chargementEnCours = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // Getter pour afficher le solde formaté (ex: 102 238.60)
  get texteSolde(): string {
    return this.formatterNombre(this.solde / 100, true);
  }

  // Fonction utilitaire de formatage
   // Fonction utilitaire de formatage
  formatterNombre(valeur: number, forcerDecimales: boolean = false): string {
    if (valeur == null || isNaN(valeur)) valeur = 0;
    
    // --- LIGNE AJOUTÉE ICI ---
    // On arrondit à 2 décimales pour corriger les bugs de calcul (ex: 6282.00000001 devient 6282)
    valeur = Math.round(valeur * 100) / 100; 
    
    const estEntier = Number.isInteger(valeur);
    const decimales = estEntier && !forcerDecimales ? 0 : 2;
    
    let str = valeur.toFixed(decimales);
    const parties = str.split('.');
    let partieEntiere = parties[0];
    const partieDecimale = parties[1] ? '.' + parties[1] : '';
    
    const estNegatif = partieEntiere.startsWith('-');
    if (estNegatif) partieEntiere = partieEntiere.substring(1);
    
    partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return (estNegatif ? '-' : '') + partieEntiere + partieDecimale;
  }

  ouvrir(id: string) {
    this.router.navigateByUrl('/tabs/details-pari/' + id);
  }

  ouvrirMenu(event: Event, p: Pari) {
    event.stopPropagation();
  }

  ouvrirReleve() {}
  deposer() { this.router.navigateByUrl('/depot'); }
  ouvrirVente() {}
  ouvrirFiltres() {}

  libelleStatut(p: Pari): string {
    if (p.statut === 'gagne') return  'Payé' ;
    if (p.statut === 'perdu') return 'Perdu';
    return 'Accepté';
  }

  iconeStatut(p: Pari): string {
    if (p.statut === 'perdu') return 'close-circle';
    return 'checkmark-circle';
  }
}