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
import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';

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
export class PariMiserPage implements OnInit, OnDestroy {
  @ViewChild('sheetModal') sheetModal!: IonModal;

  combiner: Combiner | null = null;
  lignes: LigneCoupon[] = [];
  solde = 0;
  onglet: 'mise' | 'promo' | 'reference' = 'mise';
  optionsOuvertes = false;
  
  modalOuvert = false;
  clavierOuvert = false; // <-- NOUVELLE VARIABLE pour la modale

  mise = 500;
  miseMin = 90;
  confirmationSuppressionOuverte = false;

  private keyboardShowHandle?: PluginListenerHandle;
  private keyboardHideHandle?: PluginListenerHandle;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private combinersSvc: CombinersService,
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private parisSvc: ParisService,
    private soldeSvc: SoldeService,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.chargerPariMiser();
    
    // Écouteurs pour agrandir la modale quand le clavier s'ouvre
    this.keyboardShowHandle = await Keyboard.addListener('keyboardWillShow', () => {
      this.clavierOuvert = true;
      this.sheetModal.setCurrentBreakpoint(0.90); 
    });
    this.keyboardHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
      this.clavierOuvert = false;
      this.sheetModal.setCurrentBreakpoint(0.22);
    });

    
  }

  async ionViewWillEnter() {
    await this.chargerPariMiser();
  }

  private async chargerPariMiser() {
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
      this.router.navigateByUrl('/tabs/coupon');
      return;
    }
    this.combiner = combiner;

    const [tousEvenements, tousClubs, tousChampionnats] = await Promise.all([
      this.evenementsSvc.listerTous(),
      this.clubsSvc.listerTous(),
      this.championnatsSvc.listerTous()
    ]);
    const clubsMap: Record<string, Club> = {};
    tousClubs.forEach(c => clubsMap[c.id!] = c);
    const championnatsMap: Record<string, Championnat> = {};
    tousChampionnats.forEach(c => championnatsMap[c.id!] = c);

    this.lignes = combiner.evenementIds
      .map(id => tousEvenements.find(e => e.id === id))
      .filter((e): e is Evenement => !!e)
      .map(e => ({
        evenement: e,
        nomDomicile: clubsMap[e.equipeADomicileId]?.nom || 'Inconnu',
        nomExterieur: clubsMap[e.equipeExterieurId]?.nom || 'Inconnu',
        logoDomicile: clubsMap[e.equipeADomicileId]?.logoUrl || '',
        logoExterieur: clubsMap[e.equipeExterieurId]?.logoUrl || '',
        championnatNom: championnatsMap[e.championnatId]?.nom || ''
      }));

     // 1. ON OUVRE LE MODAL D'ABORD
    this.modalOuvert = true;
    
    // 2. PUIS ON FORCE ANGULAR À METTRE À JOUR L'ÉCRAN
    this.cdr.detectChanges();
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

  retirerEvenement(id: string) {
    this.lignes = this.lignes.filter(l => l.evenement.id !== id);
  }

  ouvrirOptions() {
    this.optionsOuvertes = true;
    this.sheetModal.setCurrentBreakpoint(0.70);
  }

  onBreakpointChange(event: CustomEvent<{ breakpoint: number }>) {
    this.optionsOuvertes = event.detail.breakpoint >= 0.70;
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

  confirmerSuppression() {
    this.confirmationSuppressionOuverte = false;
    this.router.navigateByUrl('/tabs/coupon');
  }

  ionViewWillLeave() {
    this.modalOuvert = false;
    if (this.sheetModal) {
      this.sheetModal.dismiss();
    }
  }

  ngOnDestroy() {
    this.modalOuvert = false;
    if (this.sheetModal) {
      this.sheetModal.dismiss();
    }
    // On retire les écouteurs pour éviter les fuites de mémoire
    this.keyboardShowHandle?.remove();
    this.keyboardHideHandle?.remove();
  }
}