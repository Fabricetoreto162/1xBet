import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonModal, ToastController, IonHeader, IonToolbar } from '@ionic/angular';
import { CombinersService } from '../../core/services/combiners.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { ParisService } from '../../core/services/paris.service';
import { SoldeService } from '../../core/services/solde.service';
import { Combiner } from '../../core/models/combiner.model';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';
import { CouponBadgeService } from '../../core/services/coupon-badge.service';
import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef, AfterViewInit } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';
import { db } from '../../data/firebase/firebase-client';
import { doc, getDoc } from 'firebase/firestore';

interface LigneCoupon {
  evenement: Evenement;
  nomDomicile: string;
  nomExterieur: string;
  logoDomicile: string;
  logoExterieur: string;
  championnatNom: string;
}

@Component({
  selector: 'app-pari-miser',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonModal, IonHeader, IonToolbar],
  templateUrl: './pari-miser.page.html',
  styleUrls: ['./pari-miser.page.scss']
})
export class PariMiserPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sheetModal') sheetModal!: IonModal;
  @ViewChild(IonContent) content?: IonContent;

  combiner: Combiner | null = null;
  lignes: LigneCoupon[] = [];
  solde = 0;
  onglet: 'mise' | 'promo' | 'reference' = 'mise';
  optionsOuvertes = false;
  
  // État de la modale de mise : ouverte automatiquement dès l'accès à la page
  modalOuvert = true;
  clavierOuvert = false;
  private peutFermerModal = false;

  mise = 500;
  miseMin = 90;
  confirmationSuppressionOuverte = false;

  private keyboardShowHandle?: PluginListenerHandle;
  private keyboardHideHandle?: PluginListenerHandle;
  private chargementEnCours = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private combinersSvc: CombinersService,
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private parisSvc: ParisService,
    private soldeSvc: SoldeService,
    private couponBadgeSvc: CouponBadgeService,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  async ngOnInit() {
    this.configurerAffichageSimultane();
    await this.chargerPariMiser();
    
    // Écouteurs pour agrandir la modale quand le clavier s'ouvre
    this.keyboardShowHandle = await Keyboard.addListener('keyboardWillShow', () => {
      this.clavierOuvert = true;
      try {
        this.sheetModal?.setCurrentBreakpoint(0.90);
      } catch (_) {}
    });
    this.keyboardHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
      this.clavierOuvert = false;
      try {
        this.sheetModal?.setCurrentBreakpoint(0.22);
      } catch (_) {}
    });
  }

  ngAfterViewInit() {
    this.configurerAffichageSimultane();
    this.forcerAffichageModal();
  }

  async ionViewWillEnter() {
    this.peutFermerModal = false;
    this.chargementEnCours = false;
    this.modalOuvert = true;
    this.restaurerVisibiliteModal();
    this.cdr.detectChanges();
    this.configurerAffichageSimultane();
    await this.chargerPariMiser();
  }

  ionViewDidEnter() {
    this.configurerAffichageSimultane();
    this.forcerAffichageModal();
  }

  private restaurerVisibiliteModal() {
    const modalEl = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
    if (modalEl) {
      modalEl.style.removeProperty('display');
    }
  }

  private forcerAffichageModal() {
    if (this.lignes.length === 0 && !this.combiner) return;
    this.modalOuvert = true;
    if (this.lignes.length > 0) {
      this.couponBadgeSvc.afficher(this.lignes.length);
    }
    this.restaurerVisibiliteModal();
    try {
      this.sheetModal?.present();
    } catch (_) {}
    try {
      if (!this.optionsOuvertes && !this.clavierOuvert) {
        this.sheetModal?.setCurrentBreakpoint(0.22);
      }
    } catch (_) {}
  }

  /**
   * Optimisation : permet à la liste d'événements et à la modale de mise
   * de s'afficher simultanément sans qu'aucune ne disparaisse ou ne bloque l'autre.
   */
  private configurerAffichageSimultane() {
    // 1. Débloque complètement ion-content pour le scroll et les clics sur la liste d'événements
    const contentEl = this.el.nativeElement.querySelector('ion-content') as HTMLElement;
    if (contentEl) {
      contentEl.style.setProperty('pointer-events', 'auto', 'important');
      contentEl.style.setProperty('--overflow', 'auto', 'important');
      contentEl.style.setProperty('touch-action', 'auto', 'important');
      (contentEl as any).scrollY = true;
    }
    if (this.content) {
      this.content.scrollY = true;
    }

    // 2. Configure la modale : autorise la fermeture si le coupon est vide ou programmé
    const autoriserFermeture = async () => {
      return this.peutFermerModal || this.lignes.length === 0;
    };

    const modalNative = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
    if (this.sheetModal) {
      this.sheetModal.canDismiss = autoriserFermeture;
      this.sheetModal.backdropDismiss = false;
      this.sheetModal.backdropBreakpoint = 0.70;
      try {
        if (!this.optionsOuvertes && !this.clavierOuvert && this.lignes.length > 0) {
          this.sheetModal.setCurrentBreakpoint(0.22);
        }
      } catch (_) {}
    }
    if (modalNative) {
      modalNative.canDismiss = autoriserFermeture;
      modalNative.backdropDismiss = false;
      modalNative.backdropBreakpoint = 0.70;
    }

    // 3. Ajuste le backdrop pour ne pas intercepter les clics sur les événements en mode 0.22
    this.ajusterBackdropEtScroll();
  }

  private ajusterBackdropEtScroll() {
    const modalNative = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
    const backdrop = modalNative?.querySelector('ion-backdrop') || modalNative?.shadowRoot?.querySelector('ion-backdrop');
    if (backdrop) {
      if (this.optionsOuvertes) {
        (backdrop as HTMLElement).style.setProperty('pointer-events', 'auto', 'important');
        (backdrop as HTMLElement).onclick = (e: MouseEvent) => {
          e.stopPropagation();
          this.optionsOuvertes = false;
          try {
            this.sheetModal?.setCurrentBreakpoint(0.22);
          } catch (_) {}
          this.ajusterBackdropEtScroll();
          this.cdr.detectChanges();
        };
      } else {
        (backdrop as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
      }
    }

    const contentEl = this.el.nativeElement.querySelector('ion-content') as HTMLElement;
    if (contentEl) {
      contentEl.style.setProperty('pointer-events', 'auto', 'important');
      contentEl.style.setProperty('--overflow', 'auto', 'important');
      contentEl.style.setProperty('touch-action', 'auto', 'important');
      (contentEl as any).scrollY = true;
    }
  }

  private async chargerPariMiser() {
    if (this.chargementEnCours) return;
    this.chargementEnCours = true;

    try {
      const code = this.route.snapshot.paramMap.get('code');
      this.solde = await this.soldeSvc.getMontant();

      if (!code) {
        this.router.navigateByUrl('/tabs/coupon');
        return;
      }

      const combiner = await this.combinersSvc.getParCode(code);
      if (!combiner) {
        const toast = await this.toastCtrl.create({ message: 'Coupon introuvable', color: 'danger', duration: 2000 });
        await toast.present();
        await this.fermerCouponVide();
        return;
      }
      this.combiner = combiner;

      const [tousEvenements, tousClubs, tousChampionnats] = await Promise.all([
        this.evenementsSvc.listerTous(),
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous()
      ]);

      const clubsMap: Record<string, Club> = {};
      tousClubs.forEach(c => { if (c.id) clubsMap[c.id] = c; });
      const championnatsMap: Record<string, Championnat> = {};
      tousChampionnats.forEach(c => { if (c.id) championnatsMap[c.id] = c; });

      // Récupère tous les événements du coupon avec fallback direct Firestore si non présents dans le cache
      const evenementsTrouves: Evenement[] = [];
      for (const id of combiner.evenementIds) {
        let ev = tousEvenements.find(e => e.id === id);
        if (!ev) {
          try {
            const snap = await getDoc(doc(db, 'evenements', id));
            if (snap.exists()) {
              ev = { id: snap.id, ...snap.data() } as Evenement;
            }
          } catch (e) {
            console.warn('Erreur récupération événement', id, e);
          }
        }
        if (ev) {
          evenementsTrouves.push(ev);
        }
      }

      // Résoudre les clubs et championnats manquants si nécessaire
      for (const ev of evenementsTrouves) {
        if (ev.equipeADomicileId && !clubsMap[ev.equipeADomicileId]) {
          try {
            const snap = await getDoc(doc(db, 'clubs', ev.equipeADomicileId));
            if (snap.exists()) clubsMap[ev.equipeADomicileId] = { id: snap.id, ...snap.data() } as Club;
          } catch (_) {}
        }
        if (ev.equipeExterieurId && !clubsMap[ev.equipeExterieurId]) {
          try {
            const snap = await getDoc(doc(db, 'clubs', ev.equipeExterieurId));
            if (snap.exists()) clubsMap[ev.equipeExterieurId] = { id: snap.id, ...snap.data() } as Club;
          } catch (_) {}
        }
        if (ev.championnatId && !championnatsMap[ev.championnatId]) {
          try {
            const snap = await getDoc(doc(db, 'championnats', ev.championnatId));
            if (snap.exists()) championnatsMap[ev.championnatId] = { id: snap.id, ...snap.data() } as Championnat;
          } catch (_) {}
        }
      }

      this.lignes = evenementsTrouves.map(e => ({
        evenement: e,
        nomDomicile: clubsMap[e.equipeADomicileId]?.nom || 'Inconnu',
        nomExterieur: clubsMap[e.equipeExterieurId]?.nom || 'Inconnu',
        logoDomicile: clubsMap[e.equipeADomicileId]?.logoUrl || '',
        logoExterieur: clubsMap[e.equipeExterieurId]?.logoUrl || '',
        championnatNom: championnatsMap[e.championnatId]?.nom || ''
      }));

      if (this.lignes.length === 0) {
        await this.fermerCouponVide();
        return;
      }

      this.modalOuvert = true;
      this.couponBadgeSvc.afficher(this.lignes.length);
      this.cdr.detectChanges();
      this.configurerAffichageSimultane();
      this.forcerAffichageModal();
    } finally {
      this.chargementEnCours = false;
    }
  }

  get coteTotal(): number {
    return this.lignes.reduce((produit, l) => produit * l.evenement.cote, 1);
  }

  get gainsPotentiels(): number {
    return this.mise * this.coteTotal;
  }

  get miseMax(): number {
    return this.solde || this.miseMin;
  }

  get miseInvalide(): boolean {
    return !!this.mise && this.mise > 0 && this.mise < this.miseMin;
  }

  get texteMisePlage(): string {
    if (this.miseInvalide) {
      return `Mise min. : ${this.miseMin} ₣`;
    }
    return `${this.miseMin} ₣ – ∞`;
  }

  // Formate le solde en divisant par 100 (car stocké en centimes) 
  // et met les espaces (ex: 102 238.60)
  get texteSolde(): string {
    return this.formatterNombre(this.solde / 100, true);
  }

  // Formate les gains (1 750 si entier, 4 462.50 si décimal)
  get texteGainsPotentiels(): string {
    if (!this.mise || this.mise < this.miseMin) return '-';
    return this.formatterNombre(this.gainsPotentiels, false) + ' ₣';
  }

  // Fonction utilitaire de formatage
  private formatterNombre(valeur: number, forcerDecimales: boolean = false): string {
    if (valeur == null || isNaN(valeur)) valeur = 0;
    
    const estEntier = Number.isInteger(valeur);
    const decimales = estEntier && !forcerDecimales ? 0 : 2;
    
    let str = valeur.toFixed(decimales);
    const parties = str.split('.');
    let partieEntiere = parties[0];
    const partieDecimale = parties[1] ? '.' + parties[1] : '';
    
    // Gérer le signe négatif s'il y en a un (pour ne pas casser l'espacement)
    const estNegatif = partieEntiere.startsWith('-');
    if (estNegatif) partieEntiere = partieEntiere.substring(1);
    
    // Ajouter les espaces pour les milliers (ex: 10223860 -> 10 223 860)
    partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return (estNegatif ? '-' : '') + partieEntiere + partieDecimale;
  }

  async retirerEvenement(id: string) {
    this.lignes = this.lignes.filter(l => l.evenement.id !== id);
    if (this.lignes.length === 0) {
      await this.fermerCouponVide();
    } else {
      if (this.combiner) {
        this.combiner.evenementIds = this.lignes.map(l => l.evenement.id!);
      }
      this.couponBadgeSvc.afficher(this.lignes.length);
      this.cdr.detectChanges();
    }
  }

  ouvrirOptions() {
    this.optionsOuvertes = true;
    try {
      this.sheetModal?.setCurrentBreakpoint(0.70);
    } catch (_) {}
    this.ajusterBackdropEtScroll();
  }

  onBreakpointChange(event: CustomEvent<{ breakpoint: number }>) {
    const bp = event.detail.breakpoint;
    if (bp <= 0.05) {
      if (!this.peutFermerModal) {
        // Empêche la feuille de se fermer par geste tactile si des événements sont présents
        try {
          this.sheetModal?.setCurrentBreakpoint(0.22);
        } catch (_) {}
        this.optionsOuvertes = false;
      } else {
        this.modalOuvert = false;
      }
    } else {
      this.optionsOuvertes = bp >= 0.70;
    }
    this.ajusterBackdropEtScroll();
    this.cdr.detectChanges();
  }

  clamperMise() {
    if (!this.mise || this.mise < this.miseMin) this.mise = this.miseMin;
    if (this.mise > this.miseMax) this.mise = this.miseMax;
  }

  choisirOnglet(onglet: 'mise' | 'promo' | 'reference') {
    this.onglet = onglet;
  }

  incrementer() {
    this.mise = Math.min(this.mise + 500, this.miseMax);
  }

  decrementer() {
    this.mise = Math.max(this.mise - 500, this.miseMin);
  }

  choisirMontant(montant: number) {
    this.mise = montant;
    this.placerPari();
  }

  async placerPari() {
    if (this.lignes.length === 0 || this.mise < this.miseMin) return;

    try {
      const evenementIds = this.lignes.map(l => l.evenement.id!);
      await this.parisSvc.creerEtPlacer(evenementIds, this.mise);
      
      this.peutFermerModal = true;
      this.modalOuvert = false;
      this.lignes = [];
      this.couponBadgeSvc.masquer();
      const modalEl = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
      if (modalEl) {
        modalEl.style.setProperty('display', 'none', 'important');
      }
      if (this.sheetModal) {
        try {
          await this.sheetModal.dismiss();
        } catch (_) {}
      }

      const toast = await this.toastCtrl.create({ message: 'Pari accepté !', color: 'success', duration: 2000 });
      await toast.present();
      this.router.navigateByUrl('/tabs/historique');
    } catch (e) {
      const message = e instanceof Error && e.message === 'SOLDE_INSUFFISANT'
        ? 'Solde insuffisant'
        : 'Une erreur est survenue';
      const toast = await this.toastCtrl.create({ message, color: 'danger', duration: 2000 });
      await toast.present();
    }
  }

  ouvrirConfirmationSuppression() {
    this.confirmationSuppressionOuverte = true;
  }

  annulerSuppression() {
    this.confirmationSuppressionOuverte = false;
  }

  async confirmerSuppression() {
    this.confirmationSuppressionOuverte = false;
    await this.fermerCouponVide();
  }

  /**
   * Vide le coupon de pari : fait disparaître simultanément et automatiquement
   * la modale pour miser et la liste des événements, sans laisser l'une ou l'autre affichée.
   */
  private async fermerCouponVide() {
    this.peutFermerModal = true;
    this.lignes = [];
    this.modalOuvert = false;
    this.couponBadgeSvc.masquer();

    // Disparition immédiate et synchronisée de la modale dans le DOM
    const modalEl = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
    if (modalEl) {
      modalEl.style.setProperty('display', 'none', 'important');
    }

    if (this.sheetModal) {
      try {
        await this.sheetModal.dismiss();
      } catch (_) {}
    }

    if (this.combiner?.id) {
      const idCombiner = this.combiner.id;
      this.combiner = null;
      try {
        await this.combinersSvc.supprimer(idCombiner);
      } catch (_) {}
    } else {
      this.combiner = null;
    }

    this.cdr.detectChanges();
    await this.router.navigateByUrl('/tabs/coupon');
  }

  ionViewWillLeave() {
    this.peutFermerModal = true;
    this.modalOuvert = false;
    this.couponBadgeSvc.masquer();
    const modalEl = (this.sheetModal as any)?.el || this.el.nativeElement.querySelector('ion-modal');
    if (modalEl) {
      modalEl.style.setProperty('display', 'none', 'important');
    }
    if (this.sheetModal) {
      try {
        this.sheetModal.dismiss();
      } catch (_) {}
    }
  }

  ngOnDestroy() {
    this.peutFermerModal = true;
    this.modalOuvert = false;
    this.couponBadgeSvc.masquer();
    if (this.sheetModal) {
      try {
        this.sheetModal.dismiss();
      } catch (_) {}
    }
    // On retire les écouteurs pour éviter les fuites de mémoire
    this.keyboardShowHandle?.remove();
    this.keyboardHideHandle?.remove();
  }
}