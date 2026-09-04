import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../data/firebase/firebase-client';
import { Profil } from '../models/profil.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfilService {
  private STORAGE_KEY = 'utilisateur_id';
  
  private profilCache: Profil | null = null;
  private profilSubject = new BehaviorSubject<Profil | null>(null);
  public profil$: Observable<Profil | null> = this.profilSubject.asObservable();
  
  private ecouteActive = false;
  private desabonnementFirestore?: () => void;

  constructor() {}

  // Récupère l'ID de l'utilisateur connecté sur cet appareil
  get currentUserId(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  estConnecte(): boolean {
    return !!this.currentUserId;
  }

  // Crée un nouvel utilisateur ou met à jour le profil actuel
   async sauvegarderProfil(profil: Profil): Promise<string> {
    // Sécurité : si le profil est vide, on refuse de le sauvegarder
    if (!profil.nom || !profil.prenom) {
      throw new Error("Le profil est incomplet");
    }

    let userId = this.currentUserId;
    
    if (!userId) {
      userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    const profilFormate = this.formaterProfil(profil);
    const ref = doc(db, 'utilisateurs', userId);
    
    // 1. On enregistre D'ABORD dans Firebase
    await setDoc(ref, profilFormate, { merge: true });
    
    // 2. PUIS on stocke l'ID dans le téléphone
    localStorage.setItem(this.STORAGE_KEY, userId);
    
    this.initEcoute();
    return userId;
  }

  // Fonction utilitaire pour formater le nom et le prénom
  private formaterProfil(profil: Profil): Profil {
    // Pour le nom : tout en majuscules
    const nomFormate = (profil.nom || '').trim().toUpperCase();

    // Pour le prénom : 1ère lettre en majuscule, le reste en minuscules
    const prenomTrim = (profil.prenom || '').trim().toLowerCase();
    const prenomFormate = prenomTrim.charAt(0).toUpperCase() + prenomTrim.slice(1);

    return {
      nom: nomFormate,
      prenom: prenomFormate
    };
  }

  private initEcoute(): void {
    const userId = this.currentUserId;
    if (!userId) return;
    
    if (this.ecouteActive) return;
    this.ecouteActive = true;

    try {
      const ref = doc(db, 'utilisateurs', userId);
      this.desabonnementFirestore = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Profil;
          // On s'assure que les données écoutées sont aussi formatées à l'affichage
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

  ecouterProfil(): Observable<Profil | null> {
    return this.profil$;
  }

  async getProfil(forceRefresh = false): Promise<Profil | null> {
    const userId = this.currentUserId;
    if (!userId) return null;

    if (this.profilCache !== null && !forceRefresh) {
      return this.profilCache;
    }
    
    const snap = await getDoc(doc(db, 'utilisateurs', userId));
    if (!snap.exists()) {
      return null;
    }
    
    const data = snap.data() as Profil;
    const p: Profil = {
      prenom: data.prenom || '',
      nom: data.nom || ''
    };
    
    this.profilCache = p;
    this.profilSubject.next(p);
    this.initEcoute();
    return p;
  }

  // Déconnexion de l'utilisateur
  deconnexion() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.profilCache = null;
    this.profilSubject.next(null);
    if (this.desabonnementFirestore) {
      this.desabonnementFirestore();
      this.ecouteActive = false;
    }
  }
}