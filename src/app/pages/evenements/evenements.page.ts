import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonButton, IonIcon, IonButtons, IonBackButton, 
  IonBadge, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, addCircleOutline } from 'ionicons/icons';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, IonIcon, 
    IonButtons, IonBackButton, IonBadge, // Ajout de IonItem qui manquait dans tes imports
  ],
  templateUrl: './evenements.page.html',
  styleUrls: ['./evenements.page.scss']
})
export class EvenementsPage implements OnInit, OnDestroy {
  evenements: Evenement[] = [];
  clubsMap: Record<string, Club> = {};
  championnatsMap: Record<string, Championnat> = {};
  private sub!: Subscription;

  constructor(
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ createOutline, trashOutline, addCircleOutline });
  }

  async ngOnInit() {
    const loading = await this.loadingCtrl.create({ 
      message: 'Chargement des événements...', 
      spinner: 'crescent' 
    });
    await loading.present();

    try {
      // On charge d'abord les clubs et championnats
      const [clubs, championnats] = await Promise.all([
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous()
      ]);
      clubs.forEach(c => this.clubsMap[c.id!] = c);
      championnats.forEach(c => this.championnatsMap[c.id!] = c);

      // ÉCOUTE EN TEMPS RÉEL : la liste se mettra à jour toute seule
      this.sub = this.evenementsSvc.ecouterEvenements().subscribe(events => {
        this.evenements = events;
        this.cdr.detectChanges();
      });

    } catch (e) {
      console.error("Erreur", e);
    } finally {
      await loading.dismiss();
    }
  }

  ngOnDestroy() {
    // On arrête d'écouter quand on quitte la page
    if (this.sub) this.sub.unsubscribe();
  }

  getNomClub(id: string): string {
    return this.clubsMap[id]?.nom || 'Club inconnu';
  }

  getNomChampionnat(id: string): string {
    return this.championnatsMap[id]?.nom || 'Championnat inconnu';
  }

  allerCreer() {
    this.router.navigateByUrl('/evenements/creer');
  }

  allerModifier(event: Evenement) {
    this.router.navigateByUrl(`/evenements/creer/${event.id}`);
  }

  async supprimer(event: Evenement) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Suppression...', 
      spinner: 'crescent' 
    });
    await loading.present();
    try {
      // On supprime, l'écouteur mettra à jour la liste tout seul
      await this.evenementsSvc.supprimer(event.id!);
    } catch (e) {
      console.error("Erreur", e);
    } finally {
      await loading.dismiss();
    }
  }
}