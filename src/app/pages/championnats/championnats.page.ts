import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { Championnat } from '../../core/models/championnat.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-championnats',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, 
    IonIcon, IonButtons, IonBackButton
  ],
  templateUrl: './championnats.page.html',
  styleUrls: ['./championnats.page.scss']
})
export class ChampionnatsPage implements OnInit, OnDestroy {
  championnats: Championnat[] = [];
  nom = '';
  enregistrement = false;
  private sub = new Subscription();

  // Variables pour l'édition
  championnatEnEdition: Championnat | null = null;
  nomEdit = '';

  constructor(
    private championnatsSvc: ChampionnatsService, 
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ createOutline, trashOutline, checkmarkOutline, closeOutline });
  }

  async ngOnInit() {
    this.sub.add(
      this.championnatsSvc.ecouterChampionnats().subscribe((champs: Championnat[]) => {
        if (champs && champs.length > 0) {
          this.championnats = champs;
          this.cdr.detectChanges();
        }
      })
    );
    await this.chargerListe();
  }

  async ionViewWillEnter() {
    await this.chargerListe();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async chargerListe() {
    this.championnats = await this.championnatsSvc.listerTous();
    this.cdr.detectChanges();
  }

  async ajouter() {
    if (!this.nom.trim()) return;
    this.enregistrement = true;
    
    const loading = await this.loadingCtrl.create({
      message: 'Ajout en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.championnatsSvc.ajouter({ nom: this.nom.trim() });
      this.nom = ''; // Vide le champ
      this.cdr.detectChanges();
    } catch (e) {
      console.error("Erreur lors de l'ajout", e);
    } finally {
      this.enregistrement = false;
      await loading.dismiss();
      await this.chargerListe();
    }
  }

  demarrerEdition(championnat: Championnat) {
    this.championnatEnEdition = championnat;
    this.nomEdit = championnat.nom;
  }

  annulerEdition() {
    this.championnatEnEdition = null;
  }

  async enregistrerEdition() {
    if (!this.championnatEnEdition || !this.nomEdit.trim()) return;
    
    const loading = await this.loadingCtrl.create({
      message: 'Modification...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const modifie: Championnat = {
        ...this.championnatEnEdition,
        nom: this.nomEdit.trim()
      };
      await this.championnatsSvc.modifier(modifie);
      this.championnatEnEdition = null;
    } catch (e) {
      console.error("Erreur lors de la modification", e);
    } finally {
      await loading.dismiss();
      await this.chargerListe();
    }
  }

  async supprimer(championnat: Championnat) {
    const loading = await this.loadingCtrl.create({
      message: 'Suppression...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.championnatsSvc.supprimer(championnat.id);
      if (this.championnatEnEdition?.id === championnat.id) {
        this.championnatEnEdition = null;
      }
    } catch (e) {
      console.error("Erreur lors de la suppression", e);
    } finally {
      await loading.dismiss();
      await this.chargerListe();
    }
  }
}