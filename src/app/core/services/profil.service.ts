import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Profil } from '../models/profil.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfilService {
  private ref = doc(db, 'profil', 'unique');
  private profilDefaut: Profil = { prenom: 'Fabrice', nom: 'TOWANOU' };
  private profilCache: Profil | null = null;
  private profilSubject = new BehaviorSubject<Profil>(this.profilDefaut);
  public profil$: Observable<Profil> = this.profilSubject.asObservable();
  private ecouteActive = false;

  constructor() {
    this.initEcoute();
  }

  private initEcoute(): void {
    if (this.ecouteActive) return;
    this.ecouteActive = true;
    try {
      onSnapshot(this.ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Profil;
          const p: Profil = {
            prenom: data.prenom || '',
            nom: data.nom || ''
          };
          this.profilCache = p;
          this.profilSubject.next(p);
        }
      }, (err) => console.warn('Erreur écoute profil', err));
    } catch (e) {
      console.warn('Erreur init écoute profil', e);
    }
  }

  ecouterProfil(): Observable<Profil> {
    return this.profil$;
  }

  async getProfil(forceRefresh = false): Promise<Profil> {
    if (this.profilCache !== null && !forceRefresh) {
      return this.profilCache;
    }
    const snap = await getDoc(this.ref);
    if (!snap.exists()) {
      await setDoc(this.ref, this.profilDefaut);
      this.profilCache = this.profilDefaut;
      this.profilSubject.next(this.profilDefaut);
      return this.profilDefaut;
    }
    const data = snap.data() as Profil;
    const p: Profil = {
      prenom: data.prenom || '',
      nom: data.nom || ''
    };
    this.profilCache = p;
    this.profilSubject.next(p);
    return p;
  }

  async enregistrerProfil(profil: Profil): Promise<void> {
    const payload: Profil = {
      prenom: profil.prenom.trim(),
      nom: profil.nom.trim()
    };
    this.profilCache = payload;
    this.profilSubject.next(payload);
    await setDoc(this.ref, payload, { merge: true });
  }
}
