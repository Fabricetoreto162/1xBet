import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton,
  IonSegment, IonSegmentButton, IonLabel, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, checkmarkOutline } from 'ionicons/icons';
import { SoldeService } from '../../core/services/solde.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-solde',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, 
    IonIcon, IonButtons, IonBackButton, IonSegment, IonSegmentButton, IonLabel
  ],
  templateUrl: './solde.page.html',
  styleUrls: ['./solde.page.scss']
})
export class SoldePage implements OnInit, OnDestroy {
  solde = 0;
  montant: number | null = null;
  mode: 'crediter' | 'debiter' = 'crediter';
  enregistrement = false;
  private sub = new Subscription();

  constructor(
    private soldeSvc: SoldeService, 
    private cdr: ChangeDetectorRef,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ trendingUpOutline, trendingDownOutline, checkmarkOutline });
  }

  async ngOnInit() {
    this.sub.add(
      this.soldeSvc.ecouterSolde().subscribe((montant: number) => {
        this.solde = montant;
        this.cdr.detectChanges();
      })
    );
    this.solde = await this.soldeSvc.getMontant();
    this.cdr.detectChanges();
  }

  async ionViewWillEnter() {
    this.solde = await this.soldeSvc.getMontant();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async valider() {
    if (!this.montant || this.montant <= 0) return;
    this.enregistrement = true;
    
    const loading = await this.loadingCtrl.create({
      message: this.mode === 'crediter' ? 'Créditation...' : 'Débit...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      if (this.mode === 'crediter') {
        await this.soldeSvc.crediter(this.montant);
      } else {
        // Appel de la méthode modifier (débiter)
        await this.soldeSvc.debiter(this.montant);
      }
      this.solde = await this.soldeSvc.getMontant();
      this.montant = null;
    } catch (e) {
      console.error("Erreur", e);
    } finally {
      this.enregistrement = false;
      await loading.dismiss();
      this.cdr.detectChanges();
    }
  }
}