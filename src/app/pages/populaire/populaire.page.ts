import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonButton, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, trophyOutline, walletOutline, addCircleOutline, 
  footballOutline, calendarOutline, timeOutline, personOutline, 
  flameOutline, trendingUpOutline, chevronForwardOutline, shieldOutline,
  sparklesOutline, refreshOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { ProfilService } from '../../core/services/profil.service';
import { SoldeService } from '../../core/services/solde.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { Profil } from '../../core/models/profil.model';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-populaire',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonButton],
  templateUrl: './populaire.page.html',
  styleUrls: ['./populaire.page.scss']
})
export class PopulairePage implements OnInit, OnDestroy {
  // Contexte utilisateur
  userId: string | null = null;
  profil: Profil | null = null;
  solde = 0;

  // Données utilisateur
  evenements: Evenement[] = [];
  clubsMap: Record<string, Club> = {};
  championnatsMap: Record<string, Championnat> = {};
  
  nombreClubs = 0;
  nombreChampionnats = 0;
  chargement = false;

  private subs = new Subscription();

  constructor(
    private router: Router,
    private profilSvc: ProfilService,
    private soldeSvc: SoldeService,
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      peopleOutline, trophyOutline, walletOutline, addCircleOutline, 
      footballOutline, calendarOutline, timeOutline, personOutline, 
      flameOutline, trendingUpOutline, chevronForwardOutline, shieldOutline,
      sparklesOutline, refreshOutline, checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    this.verifierUtilisateur();

    // Écoute du profil en temps réel
    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe(p => {
        this.profil = p;
        this.cdr.detectChanges();
      })
    );

    // Écoute du solde en temps réel
    this.subs.add(
      this.soldeSvc.ecouterSolde().subscribe(montant => {
        this.solde = montant;
        this.cdr.detectChanges();
      })
    );

    // Écoute des événements de l'utilisateur en temps réel
    this.subs.add(
      this.evenementsSvc.ecouterEvenements().subscribe(events => {
        this.evenements = events || [];
        this.cdr.detectChanges();
      })
    );

    await this.chargerDonnees();
  }

  async ionViewWillEnter() {
    this.verifierUtilisateur();
    await this.chargerDonnees();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private verifierUtilisateur(): boolean {
    this.userId = this.profilSvc.currentUserId;
    if (!this.userId) {
      this.router.navigate(['/definir-profil']);
      return false;
    }
    return true;
  }

  async chargerDonnees() {
    if (!this.userId) return;
    this.chargement = true;

    try {
      const [clubs, championnats, montantSolde, evenements] = await Promise.all([
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous(),
        this.soldeSvc.getMontant(),
        this.evenementsSvc.listerTous()
      ]);

      this.evenements = evenements || [];
      this.nombreClubs = clubs.length;
      this.nombreChampionnats = championnats.length;
      this.solde = montantSolde;

      const cMap: Record<string, Club> = {};
      clubs.forEach(c => { if (c.id) cMap[c.id] = c; });
      this.clubsMap = cMap;

      const chMap: Record<string, Championnat> = {};
      championnats.forEach(ch => { if (ch.id) chMap[ch.id] = ch; });
      this.championnatsMap = chMap;

      this.cdr.detectChanges();
    } catch (e) {
      console.warn("Erreur chargement données dashboard populaire", e);
    } finally {
      this.chargement = false;
      this.cdr.detectChanges();
    }
  }

  getNomClub(id: string): string {
    return this.clubsMap[id]?.nom || 'Club inconnu';
  }

  getLogoClub(id: string): string | undefined {
    return this.clubsMap[id]?.logoUrl;
  }

  getNomChampionnat(id: string): string {
    return this.championnatsMap[id]?.nom || 'Championnat';
  }

  aller(route: string) {
    this.router.navigateByUrl(route);
  }

  allerCreerMatch() {
    this.router.navigateByUrl('/evenements/creer');
  }

  allerListeMatchs() {
    this.router.navigateByUrl('/evenements');
  }

  allerModifierMatch(id: string) {
    this.router.navigateByUrl(`/evenements/creer/${id}`);
  }

  async placerPariRapide(ev: Evenement) {
    const pick = ev.sens === 'plus' ? `Plus de ${ev.seuilTotal}` : `Moins de ${ev.seuilTotal}`;
    const toast = await this.toastCtrl.create({
      message: `Pari sélectionné : ${pick} @ ${ev.cote}. Consultez votre coupon !`,
      duration: 2500,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
    this.router.navigateByUrl('/tabs/coupon');
  }
}
