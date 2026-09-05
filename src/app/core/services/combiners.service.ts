import { Injectable } from '@angular/core';
import { collection, addDoc, getDocs, query, orderBy, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Combiner } from '../models/combiner.model';
import { ProfilService } from './profil.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CombinersService {
  private ref = collection(db, 'combiners');
  private combinersCache: Combiner[] | null = null;
  private combinersSubject = new BehaviorSubject<Combiner[]>([]);
  public combiners$: Observable<Combiner[]> = this.combinersSubject.asObservable();
  private ecouteActive = false;

  constructor(private profilSvc: ProfilService) {
    this.initEcoute();
  }

  ecouterCombiners(): Observable<Combiner[]> {
    return this.combiners$;
  }

  private initEcoute(): void {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return;
    if (this.ecouteActive) return;

    this.ecouteActive = true;
    try {
      const q = query(this.ref, where('userId', '==', userId));
      onSnapshot(q, (snap) => {
        const map = new Map<string, Combiner>();
        snap.docs.forEach(d => {
          map.set(d.id, { id: d.id, ...d.data() } as Combiner);
        });
        const list = Array.from(map.values());
        list.sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
        this.combinersCache = list;
        this.combinersSubject.next(list);
      }, (err) => console.warn('Erreur écoute combiners', err));
    } catch (e) {
      console.warn('Erreur init écoute combiners', e);
    }
  }

  async creer(combiner: Combiner): Promise<string> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return '';

    const combinerAvecUserId = { ...combiner, userId: userId };
    const docRef = await addDoc(this.ref, combinerAvecUserId);
    const nouveau = { ...combinerAvecUserId, id: docRef.id };
    
    // Déduplication stricte par ID pour éviter les doublons avec onSnapshot
    const cacheExistant = (this.combinersCache || []).filter(c => c.id !== docRef.id);
    const updated = [nouveau, ...cacheExistant];
    updated.sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
    this.combinersCache = updated;
    this.combinersSubject.next(this.combinersCache);
    
    return docRef.id;
  }

  async listerTous(forceRefresh = false): Promise<Combiner[]> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return [];

    this.initEcoute();

    if (this.combinersCache !== null && !forceRefresh) {
      return this.combinersCache;
    }
    try {
      const q = query(this.ref, where('userId', '==', userId));
      const snap = await getDocs(q);
      const map = new Map<string, Combiner>();
      snap.docs.forEach(d => {
        map.set(d.id, { id: d.id, ...d.data() } as Combiner);
      });
      const list = Array.from(map.values());
      list.sort((a, b) => (b.dateCreation || '').localeCompare(a.dateCreation || ''));
      this.combinersCache = list;
      this.combinersSubject.next(list);
      return list;
    } catch (e) {
      console.warn('Erreur getDocs combiners:', e);
      return this.combinersCache || [];
    }
  }

  async getParCode(code: string): Promise<Combiner | null> {
    const codeClean = code.trim().toUpperCase();
    if (this.combinersCache) {
      const found = this.combinersCache.find(c => c.code.trim().toUpperCase() === codeClean);
      if (found) return found;
    }

    const userId = this.profilSvc.currentUserId;
    if (userId) {
      try {
        const q = query(this.ref, where('code', '==', codeClean), where('userId', '==', userId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          return { id: d.id, ...d.data() } as Combiner;
        }
      } catch (_) {}
    }

    try {
      const qGlobal = query(this.ref, where('code', '==', codeClean));
      const snapGlobal = await getDocs(qGlobal);
      if (!snapGlobal.empty) {
        const d = snapGlobal.docs[0];
        return { id: d.id, ...d.data() } as Combiner;
      }
    } catch (_) {}

    return null;
  }

  async supprimer(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'combiners', id));
      if (this.combinersCache) {
        this.combinersCache = this.combinersCache.filter(c => c.id !== id);
        this.combinersSubject.next(this.combinersCache);
      }
    } catch (e) {
      console.warn('Erreur suppression combiner', e);
    }
  }
}