import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import { flame, star, ticket, time, grid } from 'ionicons/icons';
import { Keyboard } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
    RouterLink, RouterLinkActive
  ],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss']
})
export class TabsPage implements OnInit, OnDestroy {
  clavierOuvert = false;
  
  // Variables pour stocker les écouteurs et pouvoir les retirer proprement
  private keyboardShowHandle?: PluginListenerHandle;
  private keyboardHideHandle?: PluginListenerHandle;

  constructor() {
    addIcons({ flame, star, ticket, time, grid });
  }

  async ngOnInit() {
    // Cacher la tabs quand le clavier s'ouvre
    this.keyboardShowHandle = await Keyboard.addListener('keyboardWillShow', () => {
      this.clavierOuvert = true;
    });

    // Réafficher la tabs quand le clavier se ferme
    this.keyboardHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
      this.clavierOuvert = false;
    });
  }

  ngOnDestroy() {
    // On retire uniquement nos écouteurs pour éviter les fuites de mémoire
    this.keyboardShowHandle?.remove();
    this.keyboardHideHandle?.remove();
  }
}