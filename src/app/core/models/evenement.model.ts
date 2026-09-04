export interface Evenement {
  id?: string;
  equipeADomicileId: string;
  equipeExterieurId: string;
  championnatId: string;
  dateHeure: string; // ISO
  seuilTotal: number;
  sens: 'plus' | 'moins';
  cote: number;
  scoreFinal: { a: number; b: number } | null;
  statutEvenement: 'a_venir' | 'termine';
}