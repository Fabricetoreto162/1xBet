import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-carte-raccourci',
  standalone: true,
  imports: [IonIcon],
  template: `
    <button class="carte" (click)="clic.emit()">
      <div class="icone-rond" [style.background]="couleurFond || '#EAF2FB'">
        <ion-icon [name]="icone"></ion-icon>
      </div>
      <div class="textes">
        <strong>{{ titre }}</strong>
        <span>{{ sousTitre }}</span>
      </div>
    </button>
  `,
  styleUrls:['./carte-raccourci.component.scss']
})
export class CarteRaccourciComponent {
  @Input() icone!: string;
  @Input() titre!: string;
  @Input() sousTitre!: string;
  @Input() couleurFond?: string;
  @Output() clic = new EventEmitter<void>();
}