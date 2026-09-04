import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, increment, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SoldeService {
  private ref = doc(db, 'solde', 'unique');
  private soldeCache: number | null = null;
  private soldeSubject = new BehaviorSubject<number>(0);
  public solde$: Observable<number> = this.soldeSubject.asObservable();
  private ecouteActive = false;

  constructor() {
    this.initEcoute();
  }

  ecouterSolde(): Observable<number> {
    return this.solde$;
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    this.ecouteActive = true;
    try {
      onSnapshot(this.ref, (snap) => {
        if (snap.exists()) {
          const montant = (snap.data()['montant'] as number) || 0;
          this.soldeCache = montant;
          this.soldeSubject.next(montant);
        }
      }, (err) => console.warn('Erreur écoute solde', err));
    } catch (e) {
      console.warn('Erreur init écoute solde', e);
    }
  }

  async getMontant(forceRefresh = false): Promise<number> {
    if (this.soldeCache !== null && !forceRefresh) {
      return this.soldeCache;
    }
    const snap = await getDoc(this.ref);
    if (!snap.exists()) {
      await setDoc(this.ref, { montant: 0 });
      this.soldeCache = 0;
      this.soldeSubject.next(0);
      return 0;
    }
    const montant = (snap.data()['montant'] as number) || 0;
    this.soldeCache = montant;
    this.soldeSubject.next(montant);
    return montant;
  }

  async crediter(montant: number): Promise<void> {
    if (this.soldeCache !== null) {
      this.soldeCache += montant;
      this.soldeSubject.next(this.soldeCache);
    }
    const snap = await getDoc(this.ref);
    if (!snap.exists()) {
      await setDoc(this.ref, { montant });
    } else {
      await updateDoc(this.ref, { montant: increment(montant) });
    }
  }

  async debiter(montant: number): Promise<void> {
    // Débiter de X revient à créditer -X
    await this.crediter(-montant);
  }
}