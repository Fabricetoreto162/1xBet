import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonInput, IonButton, IonAvatar, IonIcon, 
  IonButtons, IonBackButton, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, checkmarkOutline, closeOutline, cameraOutline } from 'ionicons/icons';
import { ClubsService } from '../../core/services/clubs.service';
import { Club } from '../../core/models/club.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, 
    IonAvatar, IonIcon, IonButtons, IonBackButton
  ],
  templateUrl: './clubs.page.html',
  styleUrls: ['./clubs.page.scss']
})
export class ClubsPage implements OnInit, OnDestroy {
  clubs: Club[] = [];
  nom = '';
  enregistrement = false;

  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  clubEnEdition: Club | null = null;
  nomEdit = '';
  selectedFileEdit: File | null = null;
  previewUrlEdit: string | ArrayBuffer | null = null;

  private clubSub!: Subscription;

  // Référence à l'input file pour pouvoir le vider
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private clubsSvc: ClubsService, 
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ createOutline, trashOutline, checkmarkOutline, closeOutline, cameraOutline });
  }

  ngOnInit() {
    this.clubSub = this.clubsSvc.ecouterClubs().subscribe({
      next: (clubs: Club[]) => {
        this.clubs = clubs;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur d'écoute", err)
    });
  }

  ngOnDestroy() {
    if (this.clubSub) {
      this.clubSub.unsubscribe();
    }
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
    if (!this.nom.trim() || !this.previewUrl) return;
    
    this.enregistrement = true;
    const loading = await this.loadingCtrl.create({
      message: 'Ajout du club en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const logoBase64 = this.previewUrl as string;
      
      await this.clubsSvc.ajouter({ 
        nom: this.nom.trim(), 
        logoUrl: logoBase64 
      });
      
      // 1. Vider les variables Angular
      this.nom = '';
      this.selectedFile = null;
      this.previewUrl = null;
      
      // 2. Vider le champ HTML de sélection de fichier
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
      // 3. Forcer la mise à jour visuelle immédiate
      this.cdr.detectChanges();
      
    } catch (e) {
      console.error("Erreur lors de l'ajout", e);
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
        logoUrl: this.previewUrlEdit as string
      };

      await this.clubsSvc.modifier(clubModifie);
      this.clubEnEdition = null;
      
    } catch (e) {
      console.error("Erreur lors de la modification", e);
    } finally {
      await loading.dismiss();
    }
  }

  async supprimer(club: Club) {
    await this.clubsSvc.supprimer(club.id);
    if (this.clubEnEdition?.id === club.id) {
      this.clubEnEdition = null;
    }
  }
}