import { Injectable } from '@angular/core';
import { 
  collection, getDocs, addDoc, orderBy, query, 
  doc, getDoc, updateDoc, deleteDoc, onSnapshot, where 
} from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Evenement } from '../models/evenement.model';
import { ProfilService } from './profil.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EvenementsService {
  private ref = collection(db, 'evenements');
  private evenementsCache: Evenement[] | null = null;
  private evenementsSubject = new BehaviorSubject<Evenement[]>([]);
  public evenements$: Observable<Evenement[]> = this.evenementsSubject.asObservable();
  private ecouteActive = false;

  constructor(private profilSvc: ProfilService) {
    this.initEcoute();
  }

  ecouterEvenements(): Observable<Evenement[]> {
    return this.evenements$;
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    const userId = this.profilSvc.currentUserId;
    if (!userId) return;

    this.ecouteActive = true;
    try {
      const q = query(this.ref, where('userId', '==', userId), orderBy('dateHeure'));
      onSnapshot(q, (snap) => {
        const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evenement));
        this.evenementsCache = events;
        this.evenementsSubject.next(events);
      }, (err) => console.warn('Erreur écoute evenements', err));
    } catch (e) {
      console.warn('Erreur init écoute evenements', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Evenement[]> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return [];

    if (this.evenementsCache !== null && !forceRefresh) {
      return this.evenementsCache;
    }
    const q = query(this.ref, where('userId', '==', userId), orderBy('dateHeure'));
    const snap = await getDocs(q);
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evenement));
    this.evenementsCache = events;
    this.evenementsSubject.next(events);
    return events;
  }

  async getParId(id: string): Promise<Evenement | null> {
    if (this.evenementsCache) {
      const found = this.evenementsCache.find(e => e.id === id);
      if (found) return found;
    }
    const snap = await getDoc(doc(db, 'evenements', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Evenement;
    }
    return null;
  }

  async ajouter(evenement: Omit<Evenement, 'id' | 'scoreFinal' | 'statutEvenement'>): Promise<string> {
    const nouveauSansId = {
      ...evenement,
      userId: this.profilSvc.currentUserId, // <-- Lien avec l'utilisateur
      scoreFinal: null,
      statutEvenement: 'a_venir' as const
    };
    const docRef = await addDoc(this.ref, nouveauSansId);
    return docRef.id;
  }

  async modifier(id: string, modifications: Partial<Evenement>): Promise<void> {
    const ref = doc(db, 'evenements', id);
    await updateDoc(ref, modifications);
  }

  async supprimer(id: string): Promise<void> {
    await deleteDoc(doc(db, 'evenements', id));
  }
}