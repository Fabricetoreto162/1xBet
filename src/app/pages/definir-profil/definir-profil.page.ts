import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, IonIcon, LoadingController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personAddOutline } from 'ionicons/icons';
import { ProfilService } from '../../core/services/profil.service';
import { Profil } from '../../core/models/profil.model';

@Component({
  selector: 'app-definir-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, IonIcon],
  templateUrl: './definir-profil.page.html',
  styleUrls: ['./definir-profil.page.scss']
})
export class DefinirProfilPage {
  profil: Profil = { prenom: '', nom: '' };

  constructor(
    private profilSvc: ProfilService,
    private router: Router,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ personAddOutline });

    // Si l'utilisateur a déjà un profil sur cet appareil, on le saute directement vers l'app
    if (this.profilSvc.estConnecte()) {
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    }
  }

  async valider() {
    const loading = await this.loadingCtrl.create({ message: 'Création du profil...', spinner: 'crescent' });
    await loading.present();

    try {
      // Le service génère l'ID, le stocke localement et l'enregistre dans Firebase
      await this.profilSvc.sauvegarderProfil(this.profil);
      this.router.navigateByUrl('/tabs', { replaceUrl: true });
    } catch (e) {
      console.error(e);
    } finally {
      await loading.dismiss();
    }
  }
}