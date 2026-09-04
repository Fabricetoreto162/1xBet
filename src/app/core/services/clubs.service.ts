import { Injectable } from '@angular/core';
import { 
  collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc,
  getDocs, getDoc
} from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Club } from '../models/club.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClubsService {
  private ref = collection(db, 'clubs');
  private clubsCache: Club[] | null = null;
  private clubsSubject = new BehaviorSubject<Club[]>([]);
  public clubs$: Observable<Club[]> = this.clubsSubject.asObservable();
  private ecouteActive = false;

  constructor() {
    this.initEcoute();
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    this.ecouteActive = true;
    try {
      const q = query(this.ref, orderBy('nom'));
      onSnapshot(q, (snap) => {
        const clubs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
        this.clubsCache = clubs;
        this.clubsSubject.next(clubs);
      }, (err) => console.warn('Erreur écoute clubs', err));
    } catch (e) {
      console.warn('Erreur init écoute clubs', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Club[]> {
    if (this.clubsCache !== null && !forceRefresh) {
      return this.clubsCache;
    }
    const q = query(this.ref, orderBy('nom'));
    const snap = await getDocs(q);
    const clubs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Club));
    this.clubsCache = clubs;
    this.clubsSubject.next(clubs);
    return clubs;
  }

  ecouterClubs(): Observable<Club[]> {
    return this.clubs$;
  }

  async getParId(id: string): Promise<Club | null> {
    if (this.clubsCache) {
      const found = this.clubsCache.find(c => c.id === id);
      if (found) return found;
    }
    const snap = await getDoc(doc(db, 'clubs', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Club) : null;
  }

  async ajouter(club: Club): Promise<string> {
    const docRef = await addDoc(this.ref, club);
    const nouveau = { ...club, id: docRef.id };
    if (this.clubsCache) {
      this.clubsCache = [...this.clubsCache, nouveau].sort((a, b) => a.nom.localeCompare(b.nom));
      this.clubsSubject.next(this.clubsCache);
    }
    return docRef.id;
  }

  async modifier(clubModifie: Club): Promise<void> {
    if (!clubModifie.id) return;
    const clubRef = doc(db, 'clubs', clubModifie.id);
    await updateDoc(clubRef, {
      nom: clubModifie.nom,
      logoUrl: clubModifie.logoUrl
    });
    if (this.clubsCache) {
      this.clubsCache = this.clubsCache.map(c => c.id === clubModifie.id ? clubModifie : c);
      this.clubsSubject.next(this.clubsCache);
    }
  }

  async supprimer(id: string | undefined): Promise<void> {
    if (!id) return;
    await deleteDoc(doc(db, 'clubs', id));
    if (this.clubsCache) {
      this.clubsCache = this.clubsCache.filter(c => c.id !== id);
      this.clubsSubject.next(this.clubsCache);
    }
  }
}