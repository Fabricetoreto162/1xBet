import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ParisService } from '../../core/services/paris.service';
import { EvenementsService } from '../../core/services/evenements.service';
import { ClubsService } from '../../core/services/clubs.service';
import { ChampionnatsService } from '../../core/services/championnats.service';
import { Pari, JambePari } from '../../core/models/pari.model';
import { Evenement } from '../../core/models/evenement.model';
import { Club } from '../../core/models/club.model';
import { Championnat } from '../../core/models/championnat.model';

interface JambeAffichage {
  jambe: JambePari;
  evenement: Evenement | null;
  clubDomicile: Club | null;
  clubExterieur: Club | null;
  championnat: Championnat | null;
}

@Component({
  selector: 'app-details-pari',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner],
  templateUrl: './details-pari.page.html',
  styleUrls: ['./details-pari.page.scss']
})
export class DetailsPariPage implements OnInit {
  pari: Pari | null = null;
  jambesAffichage: JambeAffichage[] = [];

   chargementEnCours = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parisSvc: ParisService,
    private evenementsSvc: EvenementsService,
    private clubsSvc: ClubsService,
    private championnatsSvc: ChampionnatsService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
     this.chargementEnCours = true;
    await this.chargerDetails();

     this.chargementEnCours = false;
  }

  async ionViewWillEnter() {
    await this.chargerDetails();
  }

  private async chargerDetails() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    try {
      const [pari, clubs, championnats] = await Promise.all([
        this.parisSvc.getParId(id),
        this.clubsSvc.listerTous(),
        this.championnatsSvc.listerTous()
      ]);

      this.pari = pari;
      const clubsParId = new Map(clubs.map(c => [c.id, c]));
      const championnatsParId = new Map(championnats.map(c => [c.id, c]));

      if (this.pari) {
        const evenements = await Promise.all(
          this.pari.jambes.map(j => this.evenementsSvc.getParId(j.evenementId))
        );

        this.jambesAffichage = this.pari.jambes.map((jambe, i) => {
          const evenement = evenements[i];
          return {
            jambe,
            evenement,
            clubDomicile: evenement ? clubsParId.get(evenement.equipeADomicileId) ?? null : null,
            clubExterieur: evenement ? clubsParId.get(evenement.equipeExterieurId) ?? null : null,
            championnat: evenement ? championnatsParId.get(evenement.championnatId) ?? null : null
          };
        });
      }
    } catch (err) {
      console.error('Erreur chargement détails du pari :', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  retour() {
    this.router.navigateByUrl('/tabs/historique');
  }

  ouvrirMenu() {
    // TODO: menu d'actions (partager, annuler, etc.)
  }

  dupliquer() {
    // TODO: relancer un nouveau coupon avec les mêmes evenementIds
  }

  get nombreEvenements(): number {
    return this.pari?.jambes?.length ?? 0;
  }

  get evenementsTermines(): number {
    return this.jambesAffichage.filter(j => j.evenement?.statutEvenement === 'termine').length;
  }

   get gainsAffiches(): string {
    if (!this.pari) return '0';
    // On ne fait plus le Math.round ici pour garder les vraies décimales (ex: 5927.12)
    const gains = this.pari.statut === 'accepte'
      ? this.pari.mise * this.pari.coteCombinee
      : this.pari.gains;
      
    return this.formatterNombre(gains);
  }

    // Fonction utilitaire de formatage
  private formatterNombre(valeur: number, forcerDecimales: boolean = false): string {
    if (valeur == null || isNaN(valeur)) valeur = 0;
    
    // On arrondit à 2 décimales pour corriger les bugs de calcul (ex: 5927.12000001)
    valeur = Math.round(valeur * 100) / 100; 
    
    const estEntier = Number.isInteger(valeur);
    const decimales = estEntier && !forcerDecimales ? 0 : 2;
    
    let str = valeur.toFixed(decimales);
    const parties = str.split('.');
    let partieEntiere = parties[0];
    const partieDecimale = parties[1] ? '.' + parties[1] : '';
    
    const estNegatif = partieEntiere.startsWith('-');
    if (estNegatif) partieEntiere = partieEntiere.substring(1);
    
    // Ajoute les espaces pour les milliers (ex: 5927 -> 5 927)
    partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    return (estNegatif ? '-' : '') + partieEntiere + partieDecimale;
  }

  libelleGains(): string {
    return this.pari?.statut === 'accepte' ? 'Gains potentiels :' : 'Gains :';
  }

  libellePronostic(j: JambePari): string {
    return j.sens === 'plus' ? `Total. (${j.seuilTotal}) Plus de ` : `Total. ${j.seuilTotal} Moins de`;
  }

 

  libelleStatutPari(): string {
    if (!this.pari) return '';
    if (this.pari.statut === 'gagne') return  'Payé' ;
    if (this.pari.statut === 'perdu') return 'Perdu';
    return 'Accepté';
  }

  classeStatutPari(): string {
    if (!this.pari) return 'accepte';
    if (this.pari.statut === 'gagne') return this.pari.paye ? 'paye' : 'gagne';
    if (this.pari.statut === 'perdu') return 'perdu';
    return 'accepte';
  }

  libelleStatutJambe(statut: string): string {
    if (statut === 'gagne') return 'Gagné';
    if (statut === 'perdu') return 'Perdu';
    return 'Accepté';
  }

  classeStatutJambe(statut: string): string {
    if (statut === 'gagne') return 'gagne';
    if (statut === 'perdu') return 'perdu';
    return 'en-attente';
  }

  iconeStatut(classe: string): string {
    if (classe === 'perdu') return 'close-circle';
    if (classe === 'en-attente') return 'checkmark-circle';
    return 'checkmark-circle';
  }


  onErreurLogo(event: Event) {
  (event.target as HTMLImageElement).src = 'assets/icons/logo-defaut.png';
}
}