import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import { CarteRaccourciComponent } from '../../shared/components/carte-raccourci/carte-raccourci.component';

interface RaccourciPopulaire {
  icone: string;
  titre: string;
  sousTitre: string;
  route: string;
}

@Component({
  selector: 'app-populaire',
  standalone: true,
  imports: [CommonModule, IonContent, CarteRaccourciComponent],
  templateUrl: './populaire.page.html',
  styleUrls: ['./populaire.page.scss']
})
export class PopulairePage {
  // Les 4 routes ciblées n'existent pas encore (prochaine itération) —
  // navigation déjà câblée pour éviter à retoucher cette page ensuite.
  raccourcis: RaccourciPopulaire[] = [
    { icone: 'people-outline', titre: 'Clubs', sousTitre: 'Ajouter un club et voir la liste', route: '/clubs' },
    { icone: 'trophy-outline', titre: 'Championnats', sousTitre: 'La Liga, Ligue des Champions', route: '/championnats' },
    { icone: 'wallet-outline', titre: 'Créditer le compte', sousTitre: 'Modifier le solde', route: '/solde' },
    { icone: 'add-circle-outline', titre: 'Créer un événement', sousTitre: 'Équipes, championnat, cote', route: '/evenements/creer' }
  ];

  constructor(private router: Router) {}

  aller(route: string) {
    this.router.navigateByUrl(route);
  }
}