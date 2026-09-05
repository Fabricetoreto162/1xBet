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
  scores: Record<string, string> = {}; // Stocke les scores finaux (ex: "2-1")
  scoresMT1: Record<string, string> = {}; // Score 1ère mi-temps (ex: "2-0")
  scoresMT2: Record<string, string> = {}; // Score 2ème mi-temps (ex: "0-1")

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

  parserScore(val: string | undefined | null): { a: number; b: number } | null {
    if (!val) return null;
    const cleaned = val.trim().replace(':', '-').replace(/\s+/g, '-');
    const parts = cleaned.split('-');
    if (parts.length !== 2) return null;
    const a = parseInt(parts[0].trim(), 10);
    const b = parseInt(parts[1].trim(), 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return null;
    return { a, b };
  }

  surChangementMiTemps(eventId: string) {
    const mt1 = this.parserScore(this.scoresMT1[eventId]);
    const mt2 = this.parserScore(this.scoresMT2[eventId]);

    if (mt1 && mt2) {
      const a = mt1.a + mt2.a;
      const b = mt1.b + mt2.b;
      this.scores[eventId] = `${a}-${b}`;
    } else if (mt1 && !this.scoresMT2[eventId]) {
      this.scores[eventId] = `${mt1.a}-${mt1.b}`;
    }
    this.cdr.detectChanges();
  }

  surChangementScoreFinal(eventId: string) {
    this.cdr.detectChanges();
  }

  appliquerScore(eventId: string, score: string) {
    this.scores[eventId] = score;
    const parsed = this.parserScore(score);
    if (parsed) {
      const a1 = Math.ceil(parsed.a / 2);
      const a2 = parsed.a - a1;
      const b1 = Math.floor(parsed.b / 2);
      const b2 = parsed.b - b1;
      this.scoresMT1[eventId] = `${a1}-${b1}`;
      this.scoresMT2[eventId] = `${a2}-${b2}`;
    }
    this.cdr.detectChanges();
  }

  getApercuScore(eventId: string): string | null {
    const sf = this.parserScore(this.scores[eventId]);
    if (!sf) return null;
    const mt1 = this.parserScore(this.scoresMT1[eventId]);
    const mt2 = this.parserScore(this.scoresMT2[eventId]);

    if (mt1 && mt2) {
      return `${sf.a}:${sf.b} (${mt1.a}:${mt1.b},${mt2.a}:${mt2.b})`;
    }
    return `${sf.a}:${sf.b}`;
  }

  async enregistrerScore(ev: Evenement) {
    const sf = this.parserScore(this.scores[ev.id!]);
    
    // Vérification du format (ex: "2-1")
    if (!sf) {
      const toast = await this.toastCtrl.create({
        message: 'Format du score final invalide. Utilisez par exemple 2-1.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const mt1 = this.parserScore(this.scoresMT1[ev.id!]);
    const mt2 = this.parserScore(this.scoresMT2[ev.id!]);

    let scoreMiTemps: { mt1: { a: number; b: number }; mt2: { a: number; b: number } } | null = null;
    let detailMiTemps: string | null = null;

    if (mt1 && mt2) {
      scoreMiTemps = { mt1, mt2 };
      detailMiTemps = `${mt1.a}:${mt1.b},${mt2.a}:${mt2.b}`;
    } else {
      const a1 = Math.ceil(sf.a / 2);
      const a2 = sf.a - a1;
      const b1 = Math.floor(sf.b / 2);
      const b2 = sf.b - b1;
      scoreMiTemps = {
        mt1: { a: a1, b: b1 },
        mt2: { a: a2, b: b2 }
      };
      detailMiTemps = `${a1}:${b1},${a2}:${b2}`;
    }

    const loading = await this.loadingCtrl.create({ message: 'Enregistrement...', spinner: 'crescent' });
    await loading.present();

    try {
      // 1. On met à jour l'événement avec le score final, le score par mi-temps et on passe en terminé
      const modifications: Partial<Evenement> = { 
        scoreFinal: { a: sf.a, b: sf.b },
        scoreMiTemps,
        detailMiTemps,
        statutEvenement: 'termine' 
      };

      await this.evenementsSvc.modifier(ev.id!, modifications);
      
      // 2. On récupère tous les événements pour avoir une Map à jour pour l'évaluation des paris
      const tousEvenements = await this.evenementsSvc.listerTous();
      const eventsMap = new Map<string, Evenement>();
      tousEvenements.forEach(e => {
        if (e.id === ev.id) {
          eventsMap.set(e.id!, { ...e, ...modifications });
        } else {
          eventsMap.set(e.id!, e);
        }
      });

      // 3. On évalue tous les paris pour voir s'ils sont gagnés ou perdus
      await this.parisSvc.evaluerEtMettreAJourParis(eventsMap);
      
      // 4. On retire l'événement de la liste affichée à l'écran
      this.evenements = this.evenements.filter(e => e.id !== ev.id);
      
      const toast = await this.toastCtrl.create({
        message: `Score enregistré : ${sf.a}:${sf.b} (${detailMiTemps})`,
        duration: 2500,
        color: 'success'
      });
      await toast.present();

    } catch (e) {
      console.error("Erreur enregistrement score", e);
      const toast = await this.toastCtrl.create({
        message: "Erreur lors de l'enregistrement du score.",
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
      this.cdr.detectChanges();
    }
  }
}