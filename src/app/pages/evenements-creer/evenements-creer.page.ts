import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonItem, IonSelect, IonSelectOption, IonInput, IonButton,
  IonSegment, IonSegmentButton, IonLabel, IonIcon, IonButtons, IonBackButton, LoadingController,IonFooter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';

@Component({
  selector: 'app-evenements-creer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonSelect, IonSelectOption, 
    IonInput, IonButton, IonSegment, IonSegmentButton, IonLabel, IonIcon, 
    IonButtons, IonBackButton,IonFooter
  ],
  templateUrl: './evenements-creer.page.html',
  styleUrls: ['./evenements-creer.page.scss']
})
export class EvenementsCreerPage implements OnInit {
  clubs: Club[] = [];
  championnats: Championnat[] = [];

  isEditMode = false;
  evenementId: string | null = null;

  equipeADomicileId = '';
  equipeExterieurId = '';
  championnatId = '';
  dateHeure = '';
  
  // Variables en type "number" pour éviter les bugs de texte
  seuilTotal: number | null = null;
  cote: number | null = null;
  
  sens: 'plus' | 'moins' = 'plus';
  enregistrement = false;

  constructor(
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private evenementsSvc: EvenementsService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ checkmarkOutline });
  }

  async ngOnInit() {
    try {
      this.evenementId = this.route.snapshot.paramMap.get('id');
      this.isEditMode = !!this.evenementId;

      [this.clubs, this.championnats] = await Promise.all([
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous()
      ]);

      if (this.isEditMode && this.evenementId) {
        const event = await this.evenementsSvc.getParId(this.evenementId);
        if (event) {
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
      console.error("Erreur", e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  get formulaireValide(): boolean {
    return !!(
      this.equipeADomicileId &&
      this.equipeExterieurId &&
      this.equipeADomicileId !== this.equipeExterieurId &&
      this.championnatId &&
      this.dateHeure &&
      this.seuilTotal && this.seuilTotal > 0 &&
      this.cote && this.cote > 1
    );
  }

  allerVersListe() {
    this.router.navigateByUrl('/evenements'); 
  }

  async sauvegarder() {
    if (!this.formulaireValide) return;
    this.enregistrement = true;
    
    const loading = await this.loadingCtrl.create({
      message: this.isEditMode ? 'Modification...' : 'Création...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const payload = {
        equipeADomicileId: this.equipeADomicileId,
        equipeExterieurId: this.equipeExterieurId,
        championnatId: this.championnatId,
        dateHeure: this.dateHeure,
        seuilTotal: this.seuilTotal!,
        sens: this.sens,
        cote: this.cote!
      };

      if (this.isEditMode && this.evenementId) {
        await this.evenementsSvc.modifier(this.evenementId, payload);
      } else {
        await this.evenementsSvc.ajouter(payload);
      }
      
      this.router.navigateByUrl('/populaire', { replaceUrl: true });
    } catch (e) {
      console.error("Erreur", e);
    } finally {
      this.enregistrement = false;
      await loading.dismiss();
    }
  }
}