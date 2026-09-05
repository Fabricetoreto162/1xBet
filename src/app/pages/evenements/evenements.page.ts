import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonButton, IonIcon, IonButtons, IonBackButton, 
  IonSearchbar, IonSpinner, LoadingController, ToastController, AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, addCircleOutline, trophyOutline, 
  calendarOutline, timeOutline, searchOutline, shieldOutline,
  personOutline, filterOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { ProfilService } from '../../core/services/profil.service';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, IonIcon, 
    IonButtons, IonBackButton, IonSearchbar, IonSpinner
  ],
  templateUrl: './evenements.page.html',
  styleUrls: ['./evenements.page.scss']
})
export class EvenementsPage implements OnInit, OnDestroy {
  evenements: Evenement[] = [];
  clubsMap: Record<string, Club> = {};
  championnatsMap: Record<string, Championnat> = {};
  championnatsListe: Championnat[] = [];
  chargement = false;
  
  // Recherche et filtres
  recherche = '';
  filtreChampionnatId = 'tous';

  // Contexte utilisateur
  userId: string | null = null;
  profil: Profil | null = null;

  private subs = new Subscription();

  constructor(
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private profilSvc: ProfilService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      createOutline, trashOutline, addCircleOutline, trophyOutline, 
      calendarOutline, timeOutline, searchOutline, shieldOutline,
      personOutline, filterOutline, checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    this.verifierUtilisateur();

    // Écoute du profil
    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe(p => {
        this.profil = p;
        this.cdr.detectChanges();
      })
    );

    // Écoute en temps réel des événements de l'utilisateur
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
      this.afficherToast('Veuillez vous connecter pour voir vos événements.', 'warning');
      this.router.navigate(['/definir-profil']);
      return false;
    }
    return true;
  }

  async chargerDonnees() {
    if (!this.userId) return;

    this.chargement = true;
    try {
      const [clubs, championnats, evenements] = await Promise.all([
        this.clubsSvc.listerTous(true),
        this.championnatsSvc.listerTous(true),
        this.evenementsSvc.listerTous(true)
      ]);
      
      this.evenements = evenements || [];
      
      const newClubsMap: Record<string, Club> = {};
      clubs.forEach(c => {
        if (c.id) newClubsMap[c.id] = c;
      });
      this.clubsMap = newClubsMap;

      const newChampsMap: Record<string, Championnat> = {};
      championnats.forEach(c => {
        if (c.id) newChampsMap[c.id] = c;
      });
      this.championnatsMap = newChampsMap;
      this.championnatsListe = championnats;

      this.cdr.detectChanges();
    } catch (e) {
      console.error("Erreur chargement données événements", e);
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

  get evenementsFiltres(): Evenement[] {
    let liste = this.evenements;

    // Filtre par championnat
    if (this.filtreChampionnatId !== 'tous') {
      liste = liste.filter(e => e.championnatId === this.filtreChampionnatId);
    }

    // Filtre par recherche texte
    if (this.recherche.trim()) {
      const q = this.recherche.trim().toLowerCase();
      liste = liste.filter(e => {
        const dom = this.getNomClub(e.equipeADomicileId).toLowerCase();
        const ext = this.getNomClub(e.equipeExterieurId).toLowerCase();
        const champ = this.getNomChampionnat(e.championnatId).toLowerCase();
        return dom.includes(q) || ext.includes(q) || champ.includes(q);
      });
    }

    return liste;
  }

  setFiltreChampionnat(champId: string) {
    this.filtreChampionnatId = champId;
  }

  allerCreer() {
    this.router.navigateByUrl('/evenements/creer');
  }

  allerModifier(event: Evenement) {
    this.router.navigateByUrl(`/evenements/creer/${event.id}`);
  }

  async confirmerSuppression(event: Evenement) {
    if (!this.verifierUtilisateur()) return;

    const matchName = `${this.getNomClub(event.equipeADomicileId)} vs ${this.getNomClub(event.equipeExterieurId)}`;
    const alert = await this.alertCtrl.create({
      header: 'Supprimer ce match',
      message: `Voulez-vous vraiment retirer la rencontre "${matchName}" ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.supprimer(event);
          }
        }
      ]
    });

    await alert.present();
  }

  private async supprimer(event: Evenement) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Suppression...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      await this.evenementsSvc.supprimer(event.id!);
      this.afficherToast("Événement supprimé avec succès.", 'medium');
    } catch (e) {
      console.error("Erreur suppression match", e);
      this.afficherToast("Erreur lors de la suppression.", 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async afficherToast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' | 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
