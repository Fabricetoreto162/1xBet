import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ProfilService } from '../services/profil.service';

@Injectable({
  providedIn: 'root'
})
export class ProfilGuard implements CanActivate {
  constructor(private profilSvc: ProfilService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    // 1. S'il n'y a aucun ID dans le téléphone, on redirige
    if (!this.profilSvc.estConnecte()) {
      this.router.navigateByUrl('/definir-profil', { replaceUrl: true });
      return false;
    }

    // 2. On vérifie dans Firebase si le profil existe VRAIMENT et a un nom/prénom
    const profil = await this.profilSvc.getProfil(true);
    if (profil && (profil.nom || profil.prenom)) {
      return true; // Le profil est valide, l'utilisateur peut entrer
    }

    // 3. Si on arrive ici, l'ID existe mais le profil n'est pas créé. 
    // On déconnecte (efface l'ID) et on redirige.
    this.profilSvc.deconnexion();
    this.router.navigateByUrl('/definir-profil', { replaceUrl: true });
    return false;
  }
}