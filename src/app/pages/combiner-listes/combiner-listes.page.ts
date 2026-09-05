import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonButton, IonIcon, IonButtons, IonBackButton, 
  ToastController 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { copyOutline, addCircleOutline, ticketOutline } from 'ionicons/icons';
import { CombinersService } from '../../core/services/combiners.service';
import { Combiner } from '../../core/models/combiner.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-combiner-listes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, IonIcon, 
    IonButtons, IonBackButton
  ],
  templateUrl: './combiner-listes.page.html',
  styleUrls: ['./combiner-listes.page.scss']
})
export class CombinerListesPage implements OnInit, OnDestroy {
  combiners: Combiner[] = [];
  private sub = new Subscription();

  constructor(
    private combinersSvc: CombinersService,
    private router: Router,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ copyOutline, addCircleOutline, ticketOutline });
  }

  async ngOnInit() {
    this.sub.add(
      this.combinersSvc.ecouterCombiners().subscribe((list: Combiner[]) => {
        this.combiners = this.dedupliquer(list || []);
        this.cdr.detectChanges();
      })
    );
    const initial = await this.combinersSvc.listerTous();
    this.combiners = this.dedupliquer(initial || []);
    this.cdr.detectChanges();
  }

  async ionViewWillEnter() {
    const list = await this.combinersSvc.listerTous();
    this.combiners = this.dedupliquer(list || []);
    this.cdr.detectChanges();
  }

  private dedupliquer(list: Combiner[]): Combiner[] {
    const map = new Map<string, Combiner>();
    for (const c of list) {
      const key = c.id || c.code;
      if (key && !map.has(key)) {
        map.set(key, c);
      }
    }
    return Array.from(map.values());
  }

  trackByCombiner(index: number, item: Combiner): string {
    return item.id || item.code || index.toString();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }


  async copierCode(code: string) {
    await navigator.clipboard.writeText(code);
    const toast = await this.toastCtrl.create({
      message: `Code ${code} copié !`,
      duration: 1500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  allerCreer() {
    this.router.navigateByUrl('/combiner/creer');
  }


    allerVersListe() {
    this.router.navigateByUrl('/combiner-listes');
  }
}