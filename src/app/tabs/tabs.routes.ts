import { Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'populaire',
        loadComponent: () =>
          import('../pages/populaire/populaire.page').then(
            (m) => m.PopulairePage
          ),
      },
      {
        path: 'favoris',
        loadComponent: () =>
          import('../pages/favoris/favoris.page').then(
            (m) => m.FavorisPage
          ),
      },
      {
        path: 'coupon',
        loadComponent: () =>
          import('../pages/coupon/coupon.page').then(
            (m) => m.CouponPage
          ),
      },
      {
        path: 'historique',
        loadComponent: () =>
          import('../pages/historique/historique.page').then(
            (m) => m.HistoriquePage
          ),
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('../pages/menu/menu.page').then(
            (m) => m.MenuPage
          ),
      },
      { path: 'pari-miser/:code', loadComponent: () => import('../pages/pari-miser/pari-miser.page').then(m => m.PariMiserPage) },
      {
        path: 'details-pari/:id',
        loadComponent: () =>
          import('../pages/details-pari/details-pari.page').then(
            (m) => m.DetailsPariPage
          ),
      },
      {
        path: '',
        redirectTo: 'populaire',
        pathMatch: 'full',
      },
    ],
  },
];