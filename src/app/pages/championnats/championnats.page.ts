import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton, 
  IonBadge, IonSearchbar, LoadingController, ToastController, AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, checkmarkOutline, closeOutline, 
  trophyOutline, searchOutline, personOutline, addCircleOutline
} from 'ionicons/icons';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { ProfilService } from '../../core/services/profil.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { Championnat } from '../../core/models/championnat.model';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-championnats',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, 
    IonIcon, IonButtons, IonBackButton, IonBadge, IonSearchbar
  ],
  templateUrl: './championnats.page.html',
  styleUrls: ['./championnats.page.scss']
})
export class ChampionnatsPage implements OnInit, OnDestroy {
  championnats: Championnat[] = [];
  recherche = '';
  nom = '';
  enregistrement = false;

  // Contexte utilisateur
  userId: string | null = null;
  profil: Profil | null = null;
  evenementsParChampionnat: Record<string, number> = {};

  // Variables pour l'édition
  championnatEnEdition: Championnat | null = null;
  nomEdit = '';

  private subs = new Subscription();

  constructor(
    private championnatsSvc: ChampionnatsService,
    private profilSvc: ProfilService,
    private evenementsSvc: EvenementsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      createOutline, trashOutline, checkmarkOutline, closeOutline, 
      trophyOutline, searchOutline, personOutline, addCircleOutline
    });
  }

  async ngOnInit() {
    this.verifierUtilisateur();

    // Écoute du profil utilisateur
    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe(p => {
        this.profil = p;
        this.cdr.detectChanges();
      })
    );

    // Écoute temps réel des championnats de l'utilisateur
    this.subs.add(
      this.championnatsSvc.ecouterChampionnats().subscribe((champs: Championnat[]) => {
        this.championnats = champs || [];
        this.cdr.detectChanges();
      })
    );

    // Écoute du nombre d'événements pour chaque championnat
    this.subs.add(
      this.evenementsSvc.ecouterEvenements().subscribe(events => {
        const counts: Record<string, number> = {};
        for (const ev of events) {
          counts[ev.championnatId] = (counts[ev.championnatId] || 0) + 1;
        }
        this.evenementsParChampionnat = counts;
        this.cdr.detectChanges();
      })
    );

    await this.chargerListe();
  }

  async ionViewWillEnter() {
    this.verifierUtilisateur();
    await this.chargerListe();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private verifierUtilisateur(): boolean {
    this.userId = this.profilSvc.currentUserId;
    if (!this.userId) {
      this.afficherToast('Veuillez vous connecter pour gérer vos championnats.', 'warning');
      this.router.navigate(['/definir-profil']);
      return false;
    }
    return true;
  }

  async chargerListe() {
    if (!this.userId) return;
    this.championnats = await this.championnatsSvc.listerTous();
    this.cdr.detectChanges();
  }

  get championnatsFiltres(): Championnat[] {
    if (!this.recherche.trim()) {
      return this.championnats;
    }
    const q = this.recherche.trim().toLowerCase();
    return this.championnats.filter(c => c.nom.toLowerCase().includes(q));
  }

  async ajouter() {
    if (!this.verifierUtilisateur()) return;
    if (!this.nom.trim()) {
      this.afficherToast('Veuillez saisir le nom du championnat.', 'warning');
      return;
    }

    const nomAjout = this.nom.trim();
    // Vérifier si existe déjà pour cet utilisateur
    const doublon = this.championnats.find(c => c.nom.toLowerCase() === nomAjout.toLowerCase());
    if (doublon) {
      this.afficherToast(`Le championnat "${nomAjout}" est déjà dans votre liste.`, 'warning');
      return;
    }

    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement du championnat...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.championnatsSvc.ajouter({ 
        nom: nomAjout,
        userId: this.userId!
      });
      this.nom = '';
      this.afficherToast(`Championnat "${nomAjout}" ajouté avec succès !`, 'success');
      this.cdr.detectChanges();
    } catch (e) {
      console.error("Erreur lors de l'ajout", e);
      this.afficherToast("Erreur lors de l'enregistrement.", 'danger');
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
    if (!this.verifierUtilisateur()) return;
    if (!this.championnatEnEdition || !this.nomEdit.trim()) return;
    
    const loading = await this.loadingCtrl.create({
      message: 'Modification en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const modifie: Championnat = {
        ...this.championnatEnEdition,
        nom: this.nomEdit.trim(),
        userId: this.userId!
      };
      await this.championnatsSvc.modifier(modifie);
      this.championnatEnEdition = null;
      this.afficherToast(`Championnat "${modifie.nom}" mis à jour.`, 'success');
    } catch (e) {
      console.error("Erreur lors de la modification", e);
      this.afficherToast("Erreur lors de la modification.", 'danger');
    } finally {
      await loading.dismiss();
      await this.chargerListe();
    }
  }

  async confirmerSuppression(championnat: Championnat) {
    if (!this.verifierUtilisateur()) return;

    const nbrMatchs = this.evenementsParChampionnat[championnat.id || ''] || 0;
    let avertissement = `Voulez-vous vraiment supprimer "${championnat.nom}" ?`;
    if (nbrMatchs > 0) {
      avertissement += ` Attention : ${nbrMatchs} événement(s) y sont rattaché(s).`;
    }

    const alert = await this.alertCtrl.create({
      header: 'Supprimer le championnat',
      message: avertissement,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.supprimer(championnat);
          }
        }
      ]
    });

    await alert.present();
  }

  private async supprimer(championnat: Championnat) {
    const loading = await this.loadingCtrl.create({
      message: 'Suppression en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.championnatsSvc.supprimer(championnat.id);
      if (this.championnatEnEdition?.id === championnat.id) {
        this.championnatEnEdition = null;
      }
      this.afficherToast(`Championnat "${championnat.nom}" supprimé.`, 'medium');
    } catch (e) {
      console.error("Erreur lors de la suppression", e);
      this.afficherToast("Erreur lors de la suppression.", 'danger');
    } finally {
      await loading.dismiss();
      await this.chargerListe();
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
