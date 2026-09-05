import { Injectable } from '@angular/core';
import { 
  collection, getDocs, addDoc, orderBy, query, 
  doc, updateDoc, deleteDoc, onSnapshot, getDoc, where
} from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Championnat } from '../models/championnat.model';
import { ProfilService } from './profil.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChampionnatsService {
  private ref = collection(db, 'championnats');
  private championnatsCache: Championnat[] | null = null;
  private championnatsSubject = new BehaviorSubject<Championnat[]>([]);
  public championnats$: Observable<Championnat[]> = this.championnatsSubject.asObservable();
  private ecouteActive = false;

  constructor(private profilSvc: ProfilService) {
    this.initEcoute();
  }

  ecouterChampionnats(): Observable<Championnat[]> {
    return this.championnats$;
  }

  private initEcoute(): void {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return;
    if (this.ecouteActive) return;

    this.ecouteActive = true;
    try {
      const q = query(this.ref, where('userId', '==', userId));
      onSnapshot(q, (snap) => {
        const map = new Map<string, Championnat>();
        snap.docs.forEach(d => {
          map.set(d.id, { id: d.id, ...d.data() } as Championnat);
        });
        const championnats = Array.from(map.values());
        championnats.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        this.championnatsCache = championnats;
        this.championnatsSubject.next(championnats);
      }, (err) => console.warn('Erreur écoute championnats', err));
    } catch (e) {
      console.warn('Erreur init écoute championnats', e);
    }
  }

  async listerTous(forceRefresh = false): Promise<Championnat[]> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return [];

    this.initEcoute();

    if (this.championnatsCache !== null && !forceRefresh) {
      return this.championnatsCache;
    }
    try {
      const q = query(this.ref, where('userId', '==', userId));
      const snap = await getDocs(q);
      const map = new Map<string, Championnat>();
      snap.docs.forEach(d => {
        map.set(d.id, { id: d.id, ...d.data() } as Championnat);
      });
      const championnats = Array.from(map.values());
      championnats.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      this.championnatsCache = championnats;
      this.championnatsSubject.next(championnats);
      return championnats;
    } catch (e) {
      console.warn('Erreur getDocs championnats:', e);
      return this.championnatsCache || [];
    }
  }

  async getParId(id: string): Promise<Championnat | null> {
    if (this.championnatsCache) {
      const found = this.championnatsCache.find(c => c.id === id);
      if (found) return found;
    }
    const snap = await getDoc(doc(db, 'championnats', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Championnat) : null;
  }

    async ajouter(championnat: Championnat): Promise<string> {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return '';

    const championnatAvecUserId = { ...championnat, userId: userId };
    const docRef = await addDoc(this.ref, championnatAvecUserId);
    const nouveau = { ...championnatAvecUserId, id: docRef.id };
    
    const sansNouveau = (this.championnatsCache || []).filter(c => c.id !== docRef.id);
    this.championnatsCache = [...sansNouveau, nouveau].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    this.championnatsSubject.next(this.championnatsCache);
    
    return docRef.id;
  }

  async modifier(championnatModifie: Championnat): Promise<void> {
    if (!championnatModifie.id) return;
    const championnatRef = doc(db, 'championnats', championnatModifie.id);
    await updateDoc(championnatRef, {
      nom: championnatModifie.nom
    });
    if (this.championnatsCache) {
      this.championnatsCache = this.championnatsCache.map(c => c.id === championnatModifie.id ? championnatModifie : c);
      this.championnatsSubject.next(this.championnatsCache);
    }
  }

  async supprimer(id: string | undefined): Promise<void> {
    if (!id) return;
    await deleteDoc(doc(db, 'championnats', id));
    if (this.championnatsCache) {
      this.championnatsCache = this.championnatsCache.filter(c => c.id !== id);
      this.championnatsSubject.next(this.championnatsCache);
    }
  }
}