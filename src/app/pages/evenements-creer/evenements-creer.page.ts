import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonItem, IonSelect, IonSelectOption, IonInput, IonButton,
  IonSegment, IonSegmentButton, IonLabel, IonIcon, IonButtons, IonBackButton, 
  LoadingController, ToastController, AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkOutline, calendarOutline, trophyOutline, shieldOutline, 
  flashOutline, personOutline, alertCircleOutline, arrowForwardOutline,
  timeOutline, trendingUpOutline, listOutline
} from 'ionicons/icons';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { ProfilService } from '../../core/services/profil.service';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-evenements-creer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonSelect, IonSelectOption, 
    IonInput, IonButton, IonSegment, IonSegmentButton, IonLabel, IonIcon, 
    IonButtons, IonBackButton
  ],
  templateUrl: './evenements-creer.page.html',
  styleUrls: ['./evenements-creer.page.scss']
})
export class EvenementsCreerPage implements OnInit, OnDestroy {
  clubs: Club[] = [];
  championnats: Championnat[] = [];

  isEditMode = false;
  evenementId: string | null = null;

  // Contexte utilisateur
  userId: string | null = null;
  profil: Profil | null = null;

  equipeADomicileId = '';
  equipeExterieurId = '';
  championnatId = '';
  dateHeure = '';
  
  seuilTotal: number | null = 2.5;
  cote: number | null = 1.85;
  sens: 'plus' | 'moins' = 'plus';
  enregistrement = false;

  private subs = new Subscription();

  constructor(
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private evenementsSvc: EvenementsService,
    private profilSvc: ProfilService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      checkmarkOutline, calendarOutline, trophyOutline, shieldOutline, 
      flashOutline, personOutline, alertCircleOutline, arrowForwardOutline,
      timeOutline, trendingUpOutline, listOutline
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

    // Initialisation date par défaut : demain à 20h45 si création
    if (!this.dateHeure) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(20, 45, 0, 0);
      this.dateHeure = this.formaterDateLocale(d);
    }

    try {
      this.evenementId = this.route.snapshot.paramMap.get('id');
      this.isEditMode = !!this.evenementId;

      await this.chargerDonnees();

      if (this.isEditMode && this.evenementId) {
        const event = await this.evenementsSvc.getParId(this.evenementId);
        if (event) {
          // Vérification sécurité : l'événement appartient-il à cet utilisateur ?
          if (event.userId && event.userId !== this.userId) {
            this.afficherToast("Vous n'êtes pas autorisé à modifier cet événement.", 'danger');
            this.router.navigate(['/evenements']);
            return;
          }
          this.equipeADomicileId = event.equipeADomicileId;
          this.equipeExterieurId = event.equipeExterieurId;
          this.championnatId = event.championnatId;
          this.dateHeure = event.dateHeure;
          this.seuilTotal = event.seuilTotal;
          this.cote = event.cote;
          this.sens = event.sens;
        }
      }
    } catch (e) {
      console.error("Erreur initialisation evenements-creer", e);
    } finally {
      this.cdr.detectChanges();
    }
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
      this.afficherToast('Veuillez vous connecter pour gérer vos événements.', 'warning');
      this.router.navigate(['/definir-profil']);
      return false;
    }
    return true;
  }

  async chargerDonnees() {
    if (!this.userId) return;
    try {
      [this.clubs, this.championnats] = await Promise.all([
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous()
      ]);
      this.cdr.detectChanges();
    } catch (e) {
      console.warn("Erreur chargement clubs/championnats", e);
    }
  }

  private formaterDateLocale(d: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : '' + n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Raccourcis de date
  appliquerDatePreset(decalageJours: number, heure: number, minute: number) {
    const d = new Date();
    d.setDate(d.getDate() + decalageJours);
    d.setHours(heure, minute, 0, 0);
    this.dateHeure = this.formaterDateLocale(d);
  }

  // Raccourcis de cote
  appliquerCote(val: number) {
    this.cote = val;
  }

  // Raccourcis de seuil
  appliquerSeuil(val: number) {
    this.seuilTotal = val;
  }

  get clubDomicile(): Club | undefined {
    return this.clubs.find(c => c.id === this.equipeADomicileId);
  }

  get clubExterieur(): Club | undefined {
    return this.clubs.find(c => c.id === this.equipeExterieurId);
  }

  get championnatSelectionne(): Championnat | undefined {
    return this.championnats.find(c => c.id === this.championnatId);
  }

  get formulaireValide(): boolean {
    return !!(
      this.equipeADomicileId &&
      this.equipeExterieurId &&
      this.equipeADomicileId !== this.equipeExterieurId &&
      this.championnatId &&
      this.dateHeure &&
      this.seuilTotal && this.seuilTotal > 0 && this.seuilTotal <= 5.5 &&
      this.cote && this.cote > 1
    );
  }

  allerVersClubs() {
    this.router.navigateByUrl('/clubs');
  }

  allerVersChampionnats() {
    this.router.navigateByUrl('/championnats');
  }

  allerVersListe() {
    this.router.navigateByUrl('/evenements'); 
  }

  async sauvegarder() {
    if (!this.verifierUtilisateur()) return;

    if (!this.formulaireValide) {
      if (this.equipeADomicileId === this.equipeExterieurId) {
        this.afficherToast("L'équipe à domicile et à l'extérieur doivent être différentes.", 'warning');
      } else if (this.seuilTotal && this.seuilTotal > 5.5) {
        this.afficherToast("Le seuil de buts (plus/moins) ne peut pas dépasser 5.5.", 'warning');
      } else {
        this.afficherToast("Veuillez remplir tous les champs obligatoires.", 'warning');
      }
      return;
    }

    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: this.isEditMode ? 'Modification du match...' : 'Création du match...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const payload = {
        equipeADomicileId: this.equipeADomicileId,
        equipeExterieurId: this.equipeExterieurId,
        championnatId: this.championnatId,
        dateHeure: this.dateHeure,
        seuilTotal: Number(this.seuilTotal),
        sens: this.sens,
        cote: Number(this.cote),
        userId: this.userId!
      };

      if (this.isEditMode && this.evenementId) {
        await this.evenementsSvc.modifier(this.evenementId, payload);
        this.afficherToast("Match modifié avec succès !", 'success');
      } else {
        await this.evenementsSvc.ajouter(payload);
        this.afficherToast("Match créé avec succès !", 'success');
      }
      
      this.router.navigateByUrl('/evenements', { replaceUrl: true });
    } catch (e) {
      console.error("Erreur enregistrement événement", e);
      this.afficherToast("Erreur lors de l'enregistrement.", 'danger');
    } finally {
      this.enregistrement = false;
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
