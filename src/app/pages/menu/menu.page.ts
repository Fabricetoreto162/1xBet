import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { Router } from '@angular/router';
import { SoldeService } from '../../core/services/solde.service';
import { ProfilService } from '../../core/services/profil.service';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner],
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss']
})
export class MenuPage implements OnInit, OnDestroy {
  solde = 0;
  profil: Profil = { prenom: '', nom: '' };
  ongletActif: 'populaires' | 'sports' | 'casino' | '1xgames' | 'autre' = 'populaires';
  private subs = new Subscription();
  chargementEnCours = true;

  constructor(
    private soldeSvc: SoldeService,
    private profilSvc: ProfilService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.subs.add(
      this.soldeSvc.ecouterSolde().subscribe((montant: number) => {
        this.chargementEnCours = true;
        this.solde = montant;
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe((p: Profil) => {
        if (p) {
          this.profil = p;
          this.cdr.detectChanges();
        }
      })
    );

    [this.solde, this.profil] = await Promise.all([
      this.soldeSvc.getMontant(),
      this.profilSvc.getProfil()
    ]);
    this.cdr.detectChanges();
  }

  async ionViewWillEnter() {
    [this.solde, this.profil] = await Promise.all([
      this.soldeSvc.getMontant(),
      this.profilSvc.getProfil()
    ]);
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // Getter pour afficher le solde formaté (ex: 102 238.60)
  get texteSolde(): string {
    return this.formatterNombre(this.solde / 100, true);
  }

  // Fonction utilitaire de formatage (publique pour être utilisée dans le HTML)
  formatterNombre(valeur: number, forcerDecimales: boolean = false): string {
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

  get nomComplet(): string {
    const p = (this.profil.prenom || '').trim();
    const n = (this.profil.nom || '').trim();
    if (p || n) {
      return `${p} ${n}`.trim();
    }
    return 'Mon Profil';
  }

  choisirOnglet(onglet: typeof this.ongletActif) {
    this.ongletActif = onglet;
  }

  ouvrirProfil() {
    this.router.navigateByUrl('/creer-profil');
  }

  ouvrirMessages() {
    // TODO: navigation vers la messagerie
  }

  ouvrirParametres() {
    // TODO: navigation vers les paramètres
  }

  deposer() {
    this.router.navigateByUrl('/depot');
  }

  ouvrirCategorie(cle: string) {
    // TODO: navigation selon la catégorie cliquée
  }
}