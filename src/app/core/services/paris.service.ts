import { Injectable } from '@angular/core';
import {
  collection, getDocs, getDoc, addDoc, doc, orderBy, query, onSnapshot, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Pari, JambePari } from '../models/pari.model';
import { Evenement } from '../models/evenement.model';
import { SoldeService } from './solde.service';
import { EvenementsService } from './evenements.service';
import { BehaviorSubject, Observable } from 'rxjs';

function genererNumeroCoupon(): string {
  // Nombre à 11 chiffres, dans le même esprit que les tickets 1xBet (ex. 76854180949)
  return Math.floor(10_000_000_000 + Math.random() * 90_000_000_000).toString();
}

@Injectable({ providedIn: 'root' })
export class ParisService {
  private ref = collection(db, 'paris');
  private parisCache: Pari[] | null = null;
  private parisSubject = new BehaviorSubject<Pari[]>([]);
  public paris$: Observable<Pari[]> = this.parisSubject.asObservable();
  private ecouteActive = false;

  constructor(
    private soldeSvc: SoldeService,
    private evenementsSvc: EvenementsService
  ) {
    this.initEcoute();
  }

  ecouterParis(): Observable<Pari[]> {
    return this.paris$;
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    this.ecouteActive = true;
    try {
      const q = query(this.ref, orderBy('dateCreation', 'desc'));
      onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pari));
        this.parisCache = list;
        this.parisSubject.next(list);
      }, (err) => console.warn('Erreur écoute paris', err));
    } catch (e) {
      console.warn('Erreur init écoute paris', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Pari[]> {
    if (this.parisCache !== null && !forceRefresh) {
      return this.parisCache;
    }
    const q = query(this.ref, orderBy('dateCreation', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pari));
    this.parisCache = list;
    this.parisSubject.next(list);
    return list;
  }

  async getParId(id: string): Promise<Pari | null> {
    if (this.parisCache) {
      const found = this.parisCache.find(p => p.id === id);
      if (found) return found;
    }
    const snap = await getDoc(doc(db, 'paris', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Pari) : null;
  }

  /**
   * Compose un coupon à partir d'événements sélectionnés, débite le
   * solde de la mise, et génère automatiquement le numéro de coupon
   * (affiché ensuite dans l'historique et le détail du pari).
   */
  async creerEtPlacer(evenementIds: string[], mise: number): Promise<Pari> {
    const soldeActuel = await this.soldeSvc.getMontant();
    if (mise > soldeActuel) {
      throw new Error('SOLDE_INSUFFISANT');
    }

    const events = await Promise.all(
      evenementIds.map(id => this.evenementsSvc.getParId(id))
    );

    const jambes: JambePari[] = events
      .filter((e): e is NonNullable<typeof e> => !!e)
      .map(e => ({
        evenementId: e.id!,
        cote: e.cote,
        seuilTotal: e.seuilTotal,
        sens: e.sens,
        statutJambe: 'en_attente'
      }));

    const coteCombinee = jambes.reduce((produit, j) => produit * j.cote, 1);

    const nouveauPari: Omit<Pari, 'id'> = {
      numero: genererNumeroCoupon(),
      dateCreation: new Date().toISOString(),
      mise,
      coteCombinee,
      statut: 'accepte',
      paye: false,
      gains: 0,
      evenementIds,
      jambes
    };

    // 1. On enregistre dans Firebase. L'écouteur (onSnapshot) va 
    // détecter l'ajout et mettre à jour l'historique tout seul !
    const docRef = await addDoc(this.ref, nouveauPari);
    const pariCree: Pari = { id: docRef.id, ...nouveauPari };

    // (On a retiré la mise à jour manuelle de parisCache ici pour éviter le doublon)

    // 2. On débite le solde du joueur
    await this.soldeSvc.debiter(mise);

    return pariCree;
  }

  // NOUVELLE MÉTHODE : Met à jour un pari dans Firebase
  async modifier(id: string, modifications: Partial<Pari>): Promise<void> {
    const ref = doc(db, 'paris', id);
    await updateDoc(ref, modifications);
  }

  // NOUVELLE MÉTHODE : Supprime un pari
  async supprimer(id: string): Promise<void> {
    await deleteDoc(doc(db, 'paris', id));
  }

  // NOUVELLE MÉTHODE : Vérifie et met à jour le statut des paris (Gagné/Perdu) en fonction des scores
  async evaluerEtMettreAJourParis(eventsMap: Map<string, Evenement>): Promise<void> {
    // On récupère tous les paris existants
    const paris = await this.listerTous(true); // forceRefresh = true
    
    for (const pari of paris) {
      // On ne vérifie que les paris qui sont encore "accepte"
      if (pari.statut !== 'accepte') continue;

      let toutesJambesGagnees = true;
      let uneJambePerdue = false;

      const jambesMisesAJour = pari.jambes.map(jambe => {
        const event = eventsMap.get(jambe.evenementId);
        
        // Si l'événement n'est pas encore terminé, la jambe reste en attente
        if (!event || event.statutEvenement !== 'termine' || !event.scoreFinal) {
          toutesJambesGagnees = false;
          return jambe;
        }

        const scoreTotal = event.scoreFinal.a + event.scoreFinal.b;
          // ON FORCE LE TYPE ICI pour que TypeScript accepte
        let statutJambe: 'gagne' | 'perdu' | 'en_attente' = 'perdu'; 

        // Vérification du pronostic (Plus de / Moins de)
        if (jambe.sens === 'plus' && scoreTotal > jambe.seuilTotal) {
          statutJambe = 'gagne';
        } else if (jambe.sens === 'moins' && scoreTotal < jambe.seuilTotal) {
          statutJambe = 'gagne';
        }

        if (statutJambe === 'perdu') {
          uneJambePerdue = true;
          toutesJambesGagnees = false;
        }

        return { ...jambe, statutJambe };
      });

      // Si on a perdu une jambe, le pari est perdu
      if (uneJambePerdue) {
        await this.modifier(pari.id!, {
          statut: 'perdu',
          gains: 0,
          jambes: jambesMisesAJour
        });
      } 
      // Si toutes les jambes sont gagnées, le pari est gagné
      else if (toutesJambesGagnees) {
        const gains = Math.round(pari.mise * pari.coteCombinee);
        await this.modifier(pari.id!, {
          statut: 'gagne',
          gains: gains,
          jambes: jambesMisesAJour
        });
      }
      // Sinon, le pari est toujours "accepte" (en attente des autres matchs)
    }
  }
}