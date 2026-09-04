import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonItem, IonInput, IonButton, IonIcon, 
  IonButtons, IonBackButton, IonBadge, LoadingController,
  ToastController 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkOutline, footballOutline, timeOutline, 
  informationCircleOutline, checkmarkCircleOutline, 
  calendarOutline, shieldOutline
} from 'ionicons/icons';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ParisService } from '../../core/services/paris.service'; // <-- AJOUTÉ
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';

@Component({
  selector: 'app-scores',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonContent, IonItem, IonInput, IonButton, 
    IonIcon, IonButtons, IonBackButton, IonBadge
  ],
  templateUrl: './scores.page.html',
  styleUrls: ['./scores.page.scss']
})
export class ScoresPage implements OnInit {
  evenements: Evenement[] = [];
  clubsMap: Record<string, Club> = {};
  scores: Record<string, string> = {}; // Stocke les scores saisis (ex: "2-1")

  constructor(
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private parisSvc: ParisService, // <-- AJOUTÉ
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      checkmarkOutline, footballOutline, timeOutline, 
      informationCircleOutline, checkmarkCircleOutline, 
      calendarOutline, shieldOutline 
    });
  }

  async ngOnInit() {
    await this.chargerScores();
  }

  async ionViewWillEnter() {
    await this.chargerScores();
  }

  private async chargerScores() {
    try {
      const [events, clubs] = await Promise.all([
        this.evenementsSvc.listerTous(),
        this.clubsSvc.listerTous()
      ]);
      clubs.forEach(c => this.clubsMap[c.id!] = c);
      
      // On n'affiche que les événements qui n'ont pas encore de score final
      this.evenements = events.filter(e => !e.scoreFinal);
    } catch (e) {
      console.error("Erreur", e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  getNomClub(id: string): string {
    return this.clubsMap[id]?.nom || 'Inconnu';
  }

  getLogoClub(id: string): string | undefined {
    return this.clubsMap[id]?.logoUrl;
  }

  getInitiales(nom: string): string {
    if (!nom || nom === 'Inconnu') return '?';
    const parts = nom.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  appliquerScore(eventId: string, score: string) {
    this.scores[eventId] = score;
    this.cdr.detectChanges();
  }

  async enregistrerScore(ev: Evenement) {
    const scoreStr = this.scores[ev.id!];
    
    // Vérification du format (ex: "2-1")
    if (!scoreStr || !scoreStr.includes('-')) {
      const toast = await this.toastCtrl.create({
        message: 'Format du score invalide. Utilisez le format 2-1.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const parts = scoreStr.split('-');
    const a = parseInt(parts[0].trim(), 10);
    const b = parseInt(parts[1].trim(), 10);

    if (isNaN(a) || isNaN(b)) {
      const toast = await this.toastCtrl.create({
        message: 'Veuillez entrer des chiffres valides.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Enregistrement...', spinner: 'crescent' });
    await loading.present();

    try {
      // 1. On met à jour l'événement avec le score (objet { a, b }) et on change le statut
      await this.evenementsSvc.modifier(ev.id!, { 
        scoreFinal: { a, b }, 
        statutEvenement: 'termine' 
      });
      
      // 2. On récupère tous les événements pour avoir une Map à jour pour l'évaluation
      const tousEvenements = await this.evenementsSvc.listerTous();
      const eventsMap = new Map<string, Evenement>();
      tousEvenements.forEach(e => {
        // On s'assure que l'événement modifié a bien son score dans la Map
        if (e.id === ev.id) {
          eventsMap.set(e.id!, { ...e, scoreFinal: { a, b }, statutEvenement: 'termine' });
        } else {
          eventsMap.set(e.id!, e);
        }
      });

      // 3. On évalue tous les paris pour voir s'ils sont gagnés ou perdus
      await this.parisSvc.evaluerEtMettreAJourParis(eventsMap);
      
      // 4. On retire l'événement de la liste affichée à l'écran
      this.evenements = this.evenements.filter(e => e.id !== ev.id);
      
    } catch (e) {
      console.error("Erreur", e);
    } finally {
      await loading.dismiss();
      this.cdr.detectChanges();
    }
  }
}