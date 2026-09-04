import { Routes } from '@angular/router';
import { ProfilGuard } from './core/guards/profil.guard'; // <-- Import du Guard

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    // La page de définition de profil n'est PAS protégée
    path: 'definir-profil',
    loadComponent: () =>
      import('./pages/definir-profil/definir-profil.page').then(
        (m) => m.DefinirProfilPage
      ),
  },
  {
    // La page de modification de profil EST protégée
    path: 'creer-profil',
    canActivate: [ProfilGuard], // <-- Ajouté
    loadComponent: () =>
      import('./pages/creer-profil/creer-profil.page').then(
        (m) => m.CreerProfilPage
      ),
  },
  {
    path: 'tabs',
    canActivate: [ProfilGuard], // <-- Le guard vérifie ici
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'clubs',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/clubs/clubs.page').then((m) => m.ClubsPage),
  },
  {
    path: 'championnats',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/championnats/championnats.page').then(
        (m) => m.ChampionnatsPage
      ),
  },
  {
    path: 'solde',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/solde/solde.page').then((m) => m.SoldePage),
  },
  {
    path: 'evenements',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/evenements/evenements.page').then(
        (m) => m.EvenementsPage
      ),
  },
  {
    path: 'evenements/creer',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/evenements-creer/evenements-creer.page').then(
        (m) => m.EvenementsCreerPage
      ),
  },
  {
    path: 'evenements/creer/:id',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/evenements-creer/evenements-creer.page').then(
        (m) => m.EvenementsCreerPage
      ),
  },
  {
    path: 'scores',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/scores/scores.page').then((m) => m.ScoresPage),
  },
  {
    path: 'combiner-listes',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/combiner-listes/combiner-listes.page').then(
        (m) => m.CombinerListesPage
      ),
  },
  {
    path: 'combiner/creer',
    canActivate: [ProfilGuard],
    loadComponent: () =>
      import('./pages/combiner-creer/combiner-creer.page').then(
        (m) => m.CombinerCreerPage
      ),
  },
  // 🟢 La route wildcard doit TOUJOURS être le DERNIER élément du tableau
  {
    path: '**',
    redirectTo: 'tabs',
  },
];