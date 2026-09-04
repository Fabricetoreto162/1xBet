import { Injectable } from '@angular/core';
import { collection, addDoc, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Combiner } from '../models/combiner.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CombinersService {
  private ref = collection(db, 'combiners');
  private combinersCache: Combiner[] | null = null;
  private combinersSubject = new BehaviorSubject<Combiner[]>([]);
  public combiners$: Observable<Combiner[]> = this.combinersSubject.asObservable();
  private ecouteActive = false;

  constructor() {
    this.initEcoute();
  }

  ecouterCombiners(): Observable<Combiner[]> {
    return this.combiners$;
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    this.ecouteActive = true;
    try {
      const q = query(this.ref, orderBy('dateCreation', 'desc'));
      onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Combiner));
        this.combinersCache = list;
        this.combinersSubject.next(list);
      }, (err) => console.warn('Erreur écoute combiners', err));
    } catch (e) {
      console.warn('Erreur init écoute combiners', e);
    }
  }

  async creer(combiner: Combiner): Promise<string> {
    const docRef = await addDoc(this.ref, combiner);
    const nouveau = { ...combiner, id: docRef.id };
    if (this.combinersCache) {
      this.combinersCache = [nouveau, ...this.combinersCache];
      this.combinersSubject.next(this.combinersCache);
    }
    return docRef.id;
  }

  async listerTous(forceRefresh = false): Promise<Combiner[]> {
    if (this.combinersCache !== null && !forceRefresh) {
      return this.combinersCache;
    }
    const q = query(this.ref, orderBy('dateCreation', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Combiner));
    this.combinersCache = list;
    this.combinersSubject.next(list);
    return list;
  }

  async getParCode(code: string): Promise<Combiner | null> {
    const codeClean = code.trim().toUpperCase();
    if (this.combinersCache) {
      const found = this.combinersCache.find(c => c.code.trim().toUpperCase() === codeClean);
      if (found) return found;
    }
    const q = query(this.ref, where('code', '==', codeClean));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Combiner;
  }
}