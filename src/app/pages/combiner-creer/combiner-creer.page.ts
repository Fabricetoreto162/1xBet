import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonItem, IonButton, IonIcon, 
  IonButtons, IonBackButton, IonCheckbox, IonLabel,
  LoadingController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline, copyOutline, listOutline, closeOutline } from 'ionicons/icons';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { CombinersService } from '../../core/services/combiners.service';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';

@Component({
  selector: 'app-combiner-creer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, IonIcon,
    IonButtons, IonBackButton, IonCheckbox
],
  templateUrl: './combiner-creer.page.html',
  styleUrls: ['./combiner-creer.page.scss']
})
export class CombinerCreerPage implements OnInit {
  evenements: Evenement[] = [];
  clubsMap: Record<string, Club> = {};
  selectedIds: Set<string> = new Set(); // Utilisation d'un Set pour gérer les sélections
  
  coteTotal = 1;
  showModal = false;
  codeGenere = '';

  constructor(
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private combinersSvc: CombinersService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkOutline, copyOutline, listOutline, closeOutline });
  }

  async ngOnInit() {
    await this.chargerDonnees();
  }

  async ionViewWillEnter() {
    await this.chargerDonnees();
  }

  private async chargerDonnees() {
    try {
      const [events, clubs] = await Promise.all([
        this.evenementsSvc.listerTous(),
        this.clubsSvc.listerTous()
      ]);
      clubs.forEach(c => this.clubsMap[c.id!] = c);
      this.evenements = events.filter(e => e.statutEvenement === 'a_venir');
    } catch (e) {
      console.error('Erreur', e);
    } finally {
      this.cdr.detectChanges();
    }
  }

  getNomClub(id: string): string {
    return this.clubsMap[id]?.nom || 'Inconnu';
  }

  toggleEvenement(id: string, event: any) {
    const checked = event.detail.checked;
    const ev = this.evenements.find(e => e.id === id);
    if (!ev) return;

    if (checked) {
      this.selectedIds.add(id);
      this.coteTotal *= ev.cote;
    } else {
      this.selectedIds.delete(id);
      this.coteTotal /= ev.cote;
    }
    this.cdr.detectChanges();
  }

  genererCode(): string {
    const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chiffres = '0123456789';
    let code = '';
    
    for (let i = 0; i < 4; i++) {
      code += lettres.charAt(Math.floor(Math.random() * lettres.length));
    }
    code += chiffres.charAt(Math.floor(Math.random() * chiffres.length));
    
    return code.split('').sort(() => 0.5 - Math.random()).join('');
  }

  async creerCombiner() {
    if (this.selectedIds.size === 0) {
      const toast = await this.toastCtrl.create({ message: 'Sélectionnez au moins un événement', color: 'danger', duration: 2000 });
      await toast.present();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Création du combiner...', spinner: 'crescent' });
    await loading.present();

    try {
      this.codeGenere = this.genererCode();
      
      const combiner = {
        code: this.codeGenere,
        evenementIds: Array.from(this.selectedIds),
        coteTotal: parseFloat(this.coteTotal.toFixed(2)),
        dateCreation: new Date().toISOString()
      };

      await this.combinersSvc.creer(combiner);
      this.showModal = true; // Affiche le modal
    } catch (e) {
      console.error('Erreur', e);
    } finally {
      await loading.dismiss();
    }
  }

  async copierCode() {
    await navigator.clipboard.writeText(this.codeGenere);
    const toast = await this.toastCtrl.create({ message: 'Code copié !', duration: 1500, color: 'success', position: 'top' });
    await toast.present();
  }

  allerAuCoupon() {
    this.showModal = false;
    this.router.navigateByUrl('/tabs/coupon');
  }

  fermerModal() {
    this.showModal = false;
    //Optionnel : rediriger vers la liste des combiners
    this.router.navigateByUrl('/combiner-listes');
  }


    allerVersListe() {
    this.router.navigateByUrl('/combiner-listes');
  }
}