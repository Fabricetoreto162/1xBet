import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonInput, IonButton, IonAvatar, IonIcon, 
  IonButtons, IonBackButton, IonSearchbar, IonBadge,
  LoadingController, ToastController, AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, checkmarkOutline, closeOutline, 
  cameraOutline, searchOutline, shieldCheckmarkOutline,
  personOutline, alertCircleOutline, addCircleOutline, sparklesOutline
} from 'ionicons/icons';
import { ClubsService } from '../../core/services/clubs.service';
import { ProfilService } from '../../core/services/profil.service';
import { Club } from '../../core/models/club.model';
import { Profil } from '../../core/models/profil.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, 
    IonAvatar, IonIcon, IonButtons, IonBackButton, IonSearchbar, IonBadge
  ],
  templateUrl: './clubs.page.html',
  styleUrls: ['./clubs.page.scss']
})
export class ClubsPage implements OnInit, OnDestroy {
  clubs: Club[] = [];
  recherche = '';
  nom = '';
  enregistrement = false;

  // Contexte utilisateur
  userId: string | null = null;
  profil: Profil | null = null;

  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  clubEnEdition: Club | null = null;
  nomEdit = '';
  selectedFileEdit: File | null = null;
  previewUrlEdit: string | ArrayBuffer | null = null;

  private subs = new Subscription();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputEdit') fileInputEdit?: ElementRef<HTMLInputElement>;

  constructor(
    private clubsSvc: ClubsService,
    private profilSvc: ProfilService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      createOutline, trashOutline, checkmarkOutline, closeOutline, 
      cameraOutline, searchOutline, shieldCheckmarkOutline,
      personOutline, alertCircleOutline, addCircleOutline, sparklesOutline
    });
  }

  async ngOnInit() {
    this.verifierUtilisateur();

    // Écouter le profil utilisateur
    this.subs.add(
      this.profilSvc.ecouterProfil().subscribe(p => {
        this.profil = p;
        this.cdr.detectChanges();
      })
    );

    // Écouter les clubs de l'utilisateur
    this.subs.add(
      this.clubsSvc.ecouterClubs().subscribe({
        next: (clubs: Club[]) => {
          this.clubs = clubs;
          this.cdr.detectChanges();
        },
        error: (err) => console.error("Erreur d'écoute clubs", err)
      })
    );

    // Chargement initial
    await this.clubsSvc.listerTous();
  }

  ionViewWillEnter() {
    this.verifierUtilisateur();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private verifierUtilisateur(): boolean {
    this.userId = this.profilSvc.currentUserId;
    if (!this.userId) {
      this.afficherToast('Veuillez vous connecter pour gérer vos clubs.', 'warning');
      this.router.navigate(['/definir-profil']);
      return false;
    }
    return true;
  }

  get clubsFiltres(): Club[] {
    if (!this.recherche.trim()) {
      return this.clubs;
    }
    const q = this.recherche.trim().toLowerCase();
    return this.clubs.filter(c => c.nom.toLowerCase().includes(q));
  }

  private compresserImage(file: File, maxDim = 160, qualite = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', qualite));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    this.selectedFile = input.files[0];
    try {
      this.previewUrl = await this.compresserImage(this.selectedFile);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
    this.cdr.detectChanges();
  }

  async ajouter() {
    if (!this.verifierUtilisateur()) return;
    if (!this.nom.trim()) {
      this.afficherToast('Veuillez saisir le nom du club.', 'warning');
      return;
    }
    if (!this.previewUrl) {
      this.afficherToast('Veuillez choisir un logo pour le club.', 'warning');
      return;
    }
    
    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement du club...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const logoBase64 = this.previewUrl as string;
      
      await this.clubsSvc.ajouter({ 
        nom: this.nom.trim(), 
        logoUrl: logoBase64,
        userId: this.userId!
      });
      
      const nomAjoute = this.nom.trim();
      this.nom = '';
      this.selectedFile = null;
      this.previewUrl = null;
      
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
      this.afficherToast(`Club "${nomAjoute}" ajouté à votre compte !`, 'success');
      this.cdr.detectChanges();
    } catch (e) {
      console.error("Erreur lors de l'ajout", e);
      this.afficherToast("Erreur lors de l'enregistrement du club.", 'danger');
    } finally {
      this.enregistrement = false;
      await loading.dismiss();
    }
  }

  demarrerEdition(club: Club) {
    this.clubEnEdition = club;
    this.nomEdit = club.nom;
    this.previewUrlEdit = club.logoUrl; 
    this.selectedFileEdit = null;
  }

  annulerEdition() {
    this.clubEnEdition = null;
  }

  async onFileSelectedEdit(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    this.selectedFileEdit = input.files[0];
    try {
      this.previewUrlEdit = await this.compresserImage(this.selectedFileEdit);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrlEdit = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFileEdit);
    }
    this.cdr.detectChanges();
  }

  async enregistrerEdition() {
    if (!this.verifierUtilisateur()) return;
    if (!this.clubEnEdition || !this.nomEdit.trim() || !this.previewUrlEdit) return;
    
    const loading = await this.loadingCtrl.create({
      message: 'Modification en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const clubModifie: Club = {
        ...this.clubEnEdition,
        nom: this.nomEdit.trim(),
        logoUrl: this.previewUrlEdit as string,
        userId: this.userId!
      };

      await this.clubsSvc.modifier(clubModifie);
      this.afficherToast(`Club "${clubModifie.nom}" mis à jour avec succès.`, 'success');
      this.clubEnEdition = null;
    } catch (e) {
      console.error("Erreur lors de la modification", e);
      this.afficherToast("Erreur lors de la modification.", 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async confirmerSuppression(club: Club) {
    if (!this.verifierUtilisateur()) return;

    const alert = await this.alertCtrl.create({
      header: 'Supprimer le club',
      message: `Voulez-vous vraiment supprimer "${club.nom}" de votre compte ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.supprimer(club);
          }
        }
      ]
    });

    await alert.present();
  }

  private async supprimer(club: Club) {
    const loading = await this.loadingCtrl.create({
      message: 'Suppression en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.clubsSvc.supprimer(club.id);
      if (this.clubEnEdition?.id === club.id) {
        this.clubEnEdition = null;
      }
      this.afficherToast(`Club "${club.nom}" supprimé.`, 'medium');
    } catch (e) {
      console.error('Erreur suppression club', e);
      this.afficherToast('Erreur lors de la suppression.', 'danger');
    } finally {
      await loading.dismiss();
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
