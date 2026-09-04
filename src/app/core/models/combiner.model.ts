export interface Combiner {
  id?: string;
  userId?: string; // <-- AJOUTÉ
  code: string;
  evenementIds: string[];
  coteTotal: number;
  dateCreation: string;
}