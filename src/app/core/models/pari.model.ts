export interface JambePari {
  evenementId: string;
  cote: number;
  seuilTotal: number;
  sens: 'plus' | 'moins';
  statutJambe: 'en_attente' | 'gagne' | 'perdu';
}

export interface Pari {
  id?: string;
  userId?: string; // <-- AJOUTÉ
  numero: string; 
  dateCreation: string; 
  mise: number;
  coteCombinee: number;
  statut: 'accepte' | 'gagne' | 'perdu';
  paye: boolean;
  gains: number;
  evenementIds: string[];
  jambes: JambePari[];
}