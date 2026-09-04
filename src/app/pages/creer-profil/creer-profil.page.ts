import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonInput, IonButton, IonIcon, IonButtons, 
  IonBackButton, ToastController, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkOutline, personOutline, shieldCheckmarkOutline, 
  sparklesOutline, lockClosedOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { ProfilService } from '../../core/services/profil.service';

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
    addIcons({ 
      checkmarkOutline, personOutline, shieldCheckmarkOutline, 
      sparklesOutline, lockClosedOutline, checkmarkCircleOutline
    });
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
      if (p) {
        this.prenom = this.formaterPrenom(p.prenom || '');
        this.nom = (p.nom || '').toUpperCase();
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
    return this.profilExiste ? 'Modifier mon profil' : 'Créer mon profil';
  }

  get texteBouton(): string {
    return this.profilExiste ? 'Mettre à jour le profil' : 'Enregistrer mon profil';
  }

  get formulaireValide(): boolean {
    return this.prenom.trim().length > 0 && this.nom.trim().length > 0;
  }

  // Formatage : 1ère lettre en majuscule, reste en minuscules pour chaque mot (ex: Jean-Marc, Fabrice)
  formaterPrenom(valeur: string): string {
    if (!valeur) return '';
    return valeur
      .toLowerCase()
      .replace(/(?:^|[\s-])\S/g, (char) => char.toUpperCase());
  }

  // Événement déclenché à la saisie du prénom
  surChangementPrenom(event: Event) {
    const customEvent = event as CustomEvent;
    const val = (customEvent?.detail?.value || (event.target as HTMLInputElement)?.value || '') as string;
    this.prenom = this.formaterPrenom(val);
  }

  // Événement déclenché à la saisie du nom (tout en majuscules)
  surChangementNom(event: Event) {
    const customEvent = event as CustomEvent;
    const val = (customEvent?.detail?.value || (event.target as HTMLInputElement)?.value || '') as string;
    this.nom = (val || '').toUpperCase();
  }

  // Calcul des initiales pour l'avatar dynamique
  get initiales(): string {
    const pInit = this.prenom.trim() ? this.prenom.trim().charAt(0).toUpperCase() : '';
    const nInit = this.nom.trim() ? this.nom.trim().charAt(0).toUpperCase() : '';
    return (pInit + nInit) || '';
  }

  get nomComplet(): string {
    const p = this.prenom.trim();
    const n = this.nom.trim().toUpperCase();
    if (p && n) return `${p} ${n}`;
    if (p) return p;
    if (n) return n;
    return 'Votre Nom & Prénom';
  }

  async enregistrer() {
    if (!this.formulaireValide) {
      const toast = await this.toastCtrl.create({
        message: 'Veuillez renseigner votre prénom et votre nom.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const prenomFinal = this.formaterPrenom(this.prenom.trim());
    const nomFinal = this.nom.trim().toUpperCase();

    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement de votre profil...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.profilSvc.sauvegarderProfil({
        prenom: prenomFinal,
        nom: nomFinal
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
