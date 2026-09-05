import { Injectable } from '@angular/core';
import {
  collection, getDocs, getDoc, addDoc, doc, orderBy, query, onSnapshot, updateDoc, deleteDoc, where
} from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Pari, JambePari } from '../models/pari.model';
import { Evenement } from '../models/evenement.model';
import { SoldeService } from './solde.service';
import { EvenementsService } from './evenements.service';
import { ProfilService } from './profil.service';
import { BehaviorSubject, Observable } from 'rxjs';

function genererNumeroCoupon(): string {
  return Math.floor(10_000_000_000 + Math.random() * 90_000_000_000).toString();
}

@Injectable({ providedIn: 'root' })
export class ParisService {
  private ref = collection(db, 'paris');
  private parisCache: Pari[] | null = null;
  private parisSubject = new BehaviorSubject<Pari[]>([]);
  public paris$: Observable<Pari[]> = this.parisSubject.asObservable();
  private ecouteActive = false;
  private unsubscribeListener?: () => void;
  private dernierUserIdEcoute: string | null = null;

  constructor(
    private soldeSvc: SoldeService,
    private evenementsSvc: EvenementsService,
    private profilSvc: ProfilService
  ) {
    this.initEcoute();
  }

  ecouterParis(): Observable<Pari[]> {
    this.initEcoute();
    return this.paris$;
  }

  initEcoute(force = false): void {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return;
    if (this.ecouteActive && this.dernierUserIdEcoute === userId && !force) return;

    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = undefined;
    }

    this.ecouteActive = true;
    this.dernierUserIdEcoute = userId;
    try {
      const q = query(this.ref, where('userId', '==', userId));
      this.unsubscribeListener = onSnapshot(q, (snap) => {
        const map = new Map<string, Pari>();
        snap.docs.forEach(d => {
          map.set(d.id, { id: d.id, ...d.data() } as Pari);
        });
        const list = Array.from(map.values());
        list.sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
        this.parisCache = list;
        this.parisSubject.next(list);
      }, (err) => console.warn('Erreur écoute paris', err));
    } catch (e) {
      console.warn('Erreur init écoute paris', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Pari[]> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return [];

    this.initEcoute();

    if (this.parisCache !== null && !forceRefresh) {
      return this.parisCache;
    }
    try {
      const q = query(this.ref, where('userId', '==', userId));
      const snap = await getDocs(q);
      const map = new Map<string, Pari>();
      snap.docs.forEach(d => {
        map.set(d.id, { id: d.id, ...d.data() } as Pari);
      });
      let list = Array.from(map.values());

      if (list.length === 0) {
        try {
          const allSnap = await getDocs(this.ref);
          allSnap.docs.forEach(d => {
            const data = d.data() as any;
            if (!data.userId || data.userId === userId) {
              map.set(d.id, { id: d.id, ...data } as Pari);
            }
          });
          list = Array.from(map.values());
        } catch (_) {}
      }

      list.sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
      this.parisCache = list;
      this.parisSubject.next(list);
      return list;
    } catch (e) {
      console.warn('Erreur getDocs paris:', e);
      return this.parisCache || [];
    }
  }

  async getParId(id: string): Promise<Pari | null> {
    if (this.parisCache) {
      const found = this.parisCache.find(p => p.id === id);
      if (found) return found;
    }
    const snap = await getDoc(doc(db, 'paris', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Pari) : null;
  }

   async creerEtPlacer(evenementIds: string[], mise: number): Promise<Pari> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) {
      throw new Error('UTILISATEUR_NON_CONNECTE');
    }

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
      jambes,
      userId: userId // <-- Plus d'erreur car on a vérifié le null au-dessus
    };

    const docRef = await addDoc(this.ref, nouveauPari);
    const pariCree: Pari = { id: docRef.id, ...nouveauPari };

    const sansNouveau = (this.parisCache || []).filter(p => p.id !== docRef.id);
    this.parisCache = [pariCree, ...sansNouveau].sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
    this.parisSubject.next(this.parisCache);

    await this.soldeSvc.debiter(mise);

    return pariCree;
  }

  async modifier(id: string, modifications: Partial<Pari>): Promise<void> {
    const ref = doc(db, 'paris', id);
    await updateDoc(ref, modifications);
  }

  async supprimer(id: string): Promise<void> {
    await deleteDoc(doc(db, 'paris', id));
  }

  async evaluerEtMettreAJourParis(eventsMap: Map<string, Evenement>): Promise<void> {
    const paris = await this.listerTous(true);
    
    for (const pari of paris) {
      if (pari.statut !== 'accepte') continue;

      let toutesJambesGagnees = true;
      let uneJambePerdue = false;

      const jambesMisesAJour = pari.jambes.map(jambe => {
        const event = eventsMap.get(jambe.evenementId);
        
        if (!event || event.statutEvenement !== 'termine' || !event.scoreFinal) {
          toutesJambesGagnees = false;
          return jambe;
        }

        const scoreTotal = event.scoreFinal.a + event.scoreFinal.b;
        let statutJambe: 'gagne' | 'perdu' | 'en_attente' = 'perdu'; 

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

      if (uneJambePerdue) {
        await this.modifier(pari.id!, {
          statut: 'perdu',
          gains: 0,
          jambes: jambesMisesAJour
        });
      } else if (toutesJambesGagnees) {
        const gains = Math.round(pari.mise * pari.coteCombinee);
        await this.modifier(pari.id!, {
          statut: 'gagne',
          gains: gains,
          jambes: jambesMisesAJour
        });
      }
    }
  }
}