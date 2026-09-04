import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, increment, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { ProfilService } from './profil.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SoldeService {
  private soldeCache: number | null = null;
  private soldeSubject = new BehaviorSubject<number>(0);
  public solde$: Observable<number> = this.soldeSubject.asObservable();
  private ecouteActive = false;
  private desabonnement?: () => void;

  constructor(private profilSvc: ProfilService) {}

  // Le chemin du document dépend de l'utilisateur connecté
  private get ref() {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return null; // <-- SÉCURITÉ : Pas d'ID, pas de document
    return doc(db, 'soldes', userId);
  }

  ecouterSolde(): Observable<number> {
    if (!this.ecouteActive) {
      this.initEcoute();
    }
    return this.solde$;
  }

  private initEcoute(): void {
    const userId = this.profilSvc.currentUserId;
    if (!userId) return; // Ne pas écouter si personne n'est connecté

    if (this.ecouteActive) return;
    this.ecouteActive = true;
    
    const docRef = this.ref;
    if (!docRef) return;

    try {
      if (this.desabonnement) this.desabonnement();
      this.desabonnement = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const montant = (snap.data()['montant'] as number) || 0;
          this.soldeCache = montant;
          this.soldeSubject.next(montant);
        } else {
          this.soldeCache = 0;
          this.soldeSubject.next(0);
        }
      }, (err) => console.warn('Erreur écoute solde', err));
    } catch (e) {
      console.warn('Erreur init écoute solde', e);
    }
  }

  async getMontant(forceRefresh = false): Promise<number> {
    const docRef = this.ref;
    if (!docRef) return 0; // <-- SÉCURITÉ : Pas de création si non connecté

    if (this.soldeCache !== null && !forceRefresh) {
      return this.soldeCache;
    }
    
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // On ne crée le document à 0 que si l'utilisateur est connecté
      if (this.profilSvc.estConnecte()) {
        await setDoc(docRef, { montant: 0 });
      }
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
    const docRef = this.ref;
    if (!docRef) return; // <-- SÉCURITÉ

    if (this.soldeCache !== null) {
      this.soldeCache += montant;
      this.soldeSubject.next(this.soldeCache);
    }
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { montant });
    } else {
      await updateDoc(docRef, { montant: increment(montant) });
    }
  }

  async debiter(montant: number): Promise<void> {
    await this.crediter(-montant);
  }
}