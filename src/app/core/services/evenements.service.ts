import { Injectable } from '@angular/core';
import { 
  collection, getDocs, addDoc, query, 
  doc, getDoc, updateDoc, deleteDoc, onSnapshot, where, Unsubscribe 
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
  private unsubscribeListener?: Unsubscribe;

  constructor(private profilSvc: ProfilService) {
    this.initEcoute();
  }

  ecouterEvenements(): Observable<Evenement[]> {
    this.initEcoute();
    return this.evenements$;
  }

  private initEcoute(): void {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return;
    if (this.ecouteActive) return;

    this.ecouteActive = true;
    try {
      // NOTE : on ne combine PAS where('userId') avec orderBy('dateHeure') dans Firestore
      // car cela nécessite un index composite manuel. On filtre par userId et on trie en JS.
      const q = query(this.ref, where('userId', '==', userId));
      this.unsubscribeListener = onSnapshot(q, (snap) => {
        const map = new Map<string, Evenement>();
        snap.docs.forEach(d => {
          map.set(d.id, { id: d.id, ...d.data() } as Evenement);
        });
        const events = Array.from(map.values());
        events.sort((a, b) => (a.dateHeure || '').localeCompare(b.dateHeure || ''));
        this.evenementsCache = events;
        this.evenementsSubject.next(events);
      }, (err) => {
        console.warn('Erreur écoute evenements:', err);
      });
    } catch (e) {
      console.warn('Erreur init écoute evenements', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Evenement[]> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return [];

    this.initEcoute();

    if (this.evenementsCache !== null && !forceRefresh) {
      return this.evenementsCache;
    }

    try {
      const q = query(this.ref, where('userId', '==', userId));
      const snap = await getDocs(q);
      const map = new Map<string, Evenement>();
      snap.docs.forEach(d => {
        map.set(d.id, { id: d.id, ...d.data() } as Evenement);
      });
      const events = Array.from(map.values());
      events.sort((a, b) => (a.dateHeure || '').localeCompare(b.dateHeure || ''));
      this.evenementsCache = events;
      this.evenementsSubject.next(events);
      return events;
    } catch (e) {
      console.warn('Erreur getDocs evenements:', e);
      return this.evenementsCache || [];
    }
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
    const userId = this.profilSvc.currentUserId;
    const nouveauSansId = {
      ...evenement,
      userId: userId || undefined,
      scoreFinal: null,
      statutEvenement: 'a_venir' as const
    };
    const docRef = await addDoc(this.ref, nouveauSansId);
    const nouvelEvent: Evenement = { id: docRef.id, ...nouveauSansId };

    const cacheSansNouveau = (this.evenementsCache || []).filter(e => e.id !== docRef.id);
    const listeActuelle = [nouvelEvent, ...cacheSansNouveau];
    listeActuelle.sort((a, b) => (a.dateHeure || '').localeCompare(b.dateHeure || ''));
    this.evenementsCache = listeActuelle;
    this.evenementsSubject.next(this.evenementsCache);

    return docRef.id;
  }

  async modifier(id: string, modifications: Partial<Evenement>): Promise<void> {
    const refDoc = doc(db, 'evenements', id);
    await updateDoc(refDoc, modifications);

    if (this.evenementsCache) {
      this.evenementsCache = this.evenementsCache.map(e => {
        if (e.id === id) {
          return { ...e, ...modifications };
        }
        return e;
      });
      this.evenementsCache.sort((a, b) => (a.dateHeure || '').localeCompare(b.dateHeure || ''));
      this.evenementsSubject.next(this.evenementsCache);
    }
  }

  async supprimer(id: string): Promise<void> {
    await deleteDoc(doc(db, 'evenements', id));

    if (this.evenementsCache) {
      this.evenementsCache = this.evenementsCache.filter(e => e.id !== id);
      this.evenementsSubject.next(this.evenementsCache);
    }
  }
}