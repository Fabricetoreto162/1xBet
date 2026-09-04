import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'clubs',
    loadComponent: () =>
      import('./pages/clubs/clubs.page').then((m) => m.ClubsPage),
  },
  {
    path: 'championnats',
    loadComponent: () =>
      import('./pages/championnats/championnats.page').then(
        (m) => m.ChampionnatsPage
      ),
  },
  {
    path: 'solde',
    loadComponent: () =>
      import('./pages/solde/solde.page').then((m) => m.SoldePage),
  },
  {
    path: 'evenements',
    loadComponent: () =>
      import('./pages/evenements/evenements.page').then(
        (m) => m.EvenementsPage
      ),
  },
  {
    path: 'evenements/creer',
    loadComponent: () =>
      import('./pages/evenements-creer/evenements-creer.page').then(
        (m) => m.EvenementsCreerPage
      ),
  },
  {
    path: 'evenements/creer/:id',
    loadComponent: () =>
      import('./pages/evenements-creer/evenements-creer.page').then(
        (m) => m.EvenementsCreerPage
      ),
  },
  {
    path: 'scores',
    loadComponent: () =>
      import('./pages/scores/scores.page').then((m) => m.ScoresPage),
  },
  {
    path: 'combiner-listes',
    loadComponent: () =>
      import('./pages/combiner-listes/combiner-listes.page').then(
        (m) => m.CombinerListesPage
      ),
  },
  {
    path: 'combiner/creer',
    loadComponent: () =>
      import('./pages/combiner-creer/combiner-creer.page').then(
        (m) => m.CombinerCreerPage
      ),
  },
  {
    path: 'creer-profil',
    loadComponent: () =>
      import('./pages/creer-profil/creer-profil.page').then(
        (m) => m.CreerProfilPage
      ),
  },
  // 🟢 La route wildcard doit TOUJOURS être le DERNIER élément du tableau
  {
    path: '**',
    redirectTo: 'tabs',
  },
];

