import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  star, starOutline, sparklesOutline, walletOutline, personCircleOutline, 
  chevronForwardOutline, addCircleOutline, ticketOutline, footballOutline, 
  shieldOutline, trophyOutline, calendarOutline, layersOutline, 
  checkmarkCircleOutline, alertCircleOutline, arrowForwardOutline, flashOutline,
  personOutline, createOutline
} from 'ionicons/icons';
import { ProfilService } from '../../core/services/profil.service';
import { SoldeService } from '../../core/services/solde.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { CombinersService } from '../../core/services/combiners.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, IonIcon],
  templateUrl: './favoris.page.html',
  styleUrls: ['./favoris.page.scss']
})
export class FavorisPage implements OnInit, OnDestroy {
  profil: Profil | null = null;
  userId: string | null = null;
  solde = 0;

  // Statistiques dynamiques pour les badges et cartes
  nombreCombiners = 0;
  nombreEvenements = 0;
  nombreMatchsSansScore = 0;
  nombreClubs = 0;
  nombreChampionnats = 0;

  private subs = new Subscription();

  constructor(
    private router: Router,
    private profilSvc: ProfilService,
    private soldeSvc: SoldeService,
    private evenementsSvc: EvenementsService,
    private combinersSvc: CombinersService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      star, starOutline, sparklesOutline, walletOutline, personCircleOutline, 
      chevronForwardOutline, addCircleOutline, ticketOutline, footballOutline, 
      shieldOutline, trophyOutline, calendarOutline, layersOutline, 
      checkmarkCircleOutline, alertCircleOutline, arrowForwardOutline, flashOutline,
      personOutline, createOutline
    });
  }

  async ngOnInit() {
    this.userId = this.profilSvc.currentUserId;

    // Profil
    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe((p: Profil | null) => {
        if (p) {
          this.profil = p;
        } else {
          this.profil = { prenom: '', nom: '' };
        }
        this.cdr.detectChanges();
      })
    );

    // Solde
    this.subs.add(
      this.soldeSvc.ecouterSolde().subscribe((s: number) => {
        this.solde = s || 0;
        this.cdr.detectChanges();
      })
    );

    // Combinés
    this.subs.add(
      this.combinersSvc.ecouterCombiners().subscribe(combiners => {
        this.nombreCombiners = (combiners || []).length;
        this.cdr.detectChanges();
      })
    );

    // Événements & matchs à scorer
    this.subs.add(
      this.evenementsSvc.ecouterEvenements().subscribe(events => {
        const evList = events || [];
        this.nombreEvenements = evList.length;
        this.nombreMatchsSansScore = evList.filter(e => !e.scoreFinal).length;
        this.cdr.detectChanges();
      })
    );

    // Clubs
    this.subs.add(
      this.clubsSvc.clubs$.subscribe(clubs => {
        this.nombreClubs = (clubs || []).length;
        this.cdr.detectChanges();
      })
    );

    // Championnats
    this.subs.add(
      this.championnatsSvc.championnats$.subscribe(champs => {
        this.nombreChampionnats = (champs || []).length;
        this.cdr.detectChanges();
      })
    );

    const profilRecupere = await this.profilSvc.getProfil();
    if (profilRecupere) {
      this.profil = profilRecupere;
    }
    this.cdr.detectChanges();
  }

  async ionViewWillEnter() {
    this.userId = this.profilSvc.currentUserId;
    const profilRecupere = await this.profilSvc.getProfil();
    if (profilRecupere) {
      this.profil = profilRecupere;
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get profilExiste(): boolean {
    if (!this.profil) return false;
    return !!((this.profil.prenom && this.profil.prenom.trim()) || (this.profil.nom && this.profil.nom.trim()));
  }

  get nomAffiche(): string {
    if (!this.profilExiste || !this.profil) return 'Mon Profil Joueur';
    const prenom = this.profil.prenom?.trim() || '';
    const nom = this.profil.nom?.trim()?.toUpperCase() || '';
    return `${prenom} ${nom}`.trim();
  }

  get initiales(): string {
    if (!this.profil) return '1X';
    const p = this.profil.prenom?.trim().charAt(0) || '';
    const n = this.profil.nom?.trim().charAt(0) || '';
    const init = (p + n).toUpperCase();
    return init || '1X';
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

  voirCombiners() {
    this.router.navigateByUrl('/combiner-listes');
  }

  saisirScores() { 
    this.router.navigateByUrl('/scores'); 
  }

  allerClubs() {
    this.router.navigateByUrl('/clubs');
  }

  allerChampionnats() {
    this.router.navigateByUrl('/championnats');
  }

  allerEvenements() {
    this.router.navigateByUrl('/evenements');
  }

  allerSolde() {
    this.router.navigateByUrl('/solde');
  }
}