import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonInput, IonButton, IonIcon, IonButtons, 
  IonBackButton, ToastController, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline, personOutline } from 'ionicons/icons';
import { ProfilService } from '../../core/services/profil.service';
import { Profil } from '../../core/models/profil.model';

@Component({
  selector: 'app-creer-profil',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, 
    IonButton, IonIcon, IonButtons, IonBackButton
  ],
  templateUrl: './creer-profil.page.html',
  styleUrls: ['./creer-profil.page.scss']
})
export class CreerProfilPage implements OnInit {
  prenom = '';
  nom = '';
  enregistrement = false;
  profilExiste = false;

  constructor(
    private profilSvc: ProfilService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkOutline, personOutline });
  }

  async ngOnInit() {
    await this.chargerProfil();
  }

  async ionViewWillEnter() {
    await this.chargerProfil();
  }

  private async chargerProfil() {
    try {
      const p = await this.profilSvc.getProfil();
      if (p) { // <-- Sécurité : on vérifie que p n'est pas null
        this.prenom = p.prenom || '';
        this.nom = p.nom || '';
      } else {
        this.prenom = '';
        this.nom = '';
      }
      this.profilExiste = !!(this.prenom.trim() || this.nom.trim());
    } catch (e) {
      console.error('Erreur chargement profil', e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  get titrePage(): string {
    return this.profilExiste ? 'Modifier mon profil' : 'Ajouter votre profil';
  }

  get texteBouton(): string {
    return this.profilExiste ? 'Modifier le profil' : 'Enregistrer mon profil';
  }

  get formulaireValide(): boolean {
    return this.prenom.trim().length > 0 && this.nom.trim().length > 0;
  }

  async enregistrer() {
    if (!this.formulaireValide) {
      const toast = await this.toastCtrl.create({
        message: 'Veuillez saisir votre prénom et votre nom.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement du profil...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // On utilise la nouvelle méthode sauvegarderProfil
      await this.profilSvc.sauvegarderProfil({
        prenom: this.prenom,
        nom: this.nom
      });

      const toast = await this.toastCtrl.create({
        message: 'Profil enregistré avec succès !',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      this.router.navigateByUrl('/tabs/menu');
    } catch (e) {
      console.error('Erreur enregistrement profil', e);
      const toast = await this.toastCtrl.create({
        message: "Erreur lors de l'enregistrement",
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.enregistrement = false;
      await loading.dismiss();
      this.cdr.detectChanges();
    }
  }
}