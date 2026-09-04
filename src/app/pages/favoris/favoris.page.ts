import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import { CarteRaccourciComponent } from '../../shared/components/carte-raccourci/carte-raccourci.component';
import { ProfilService } from '../../core/services/profil.service';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule, IonContent, CarteRaccourciComponent],
  templateUrl: './favoris.page.html',
  styleUrls: ['./favoris.page.scss']
})
export class FavorisPage implements OnInit, OnDestroy {
  profil: Profil | null = null; // <-- Autorise le null
  private sub = new Subscription();

  constructor(
    private router: Router,
    private profilSvc: ProfilService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.sub.add(
      this.profilSvc.ecouterProfil().subscribe((p: Profil | null) => { // <-- Ajout de | null
        if (p) {
          this.profil = p;
          this.cdr.detectChanges();
        }
      })
    );
    
    const profilRecupere = await this.profilSvc.getProfil();
    this.profil = profilRecupere ? profilRecupere : { prenom: '', nom: '' }; // <-- Gestion du null
    this.cdr.detectChanges();
  }

  async ionViewWillEnter() {
    const profilRecupere = await this.profilSvc.getProfil();
    this.profil = profilRecupere ? profilRecupere : { prenom: '', nom: '' }; // <-- Gestion du null
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  get profilExiste(): boolean {
    if (!this.profil) return false; // <-- Sécurité
    return !!((this.profil.prenom && this.profil.prenom.trim()) || (this.profil.nom && this.profil.nom.trim()));
  }

  get titreBoutonProfil(): string {
    return this.profilExiste ? 'Modifier votre profil' : 'Ajouter votre profil';
  }

  get sousTitreBoutonProfil(): string {
    if (this.profilExiste && this.profil) {
      const complet = `${this.profil.prenom} ${this.profil.nom}`.trim();
      return `Modifier vos informations (${complet})`;
    }
    return 'Renseigner votre prénom et nom';
  }

  allerProfil() {
    this.router.navigateByUrl('/creer-profil');
  }

  creerCoupon() { 
    this.router.navigateByUrl('/combiner/creer'); 
  }

  saisirScores() { 
    this.router.navigateByUrl('/scores'); 
  }
}