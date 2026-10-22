/**
 * The five fighters as the menus see them: names, stats and colours. Combat numbers live in
 * moves.ts, art lives in assets.ts; this file is only what the player reads.
 */

export interface Fighter {
  id: string;
  name: string;
  title: string;
  style: string;
  reach: string;
  power: number;
  speed: number;
  defense: number;
  color: string;
  accent: string;
  /** Special move name shown on the select screen. */
  special: string;
}

export const ROSTER: Record<string, Fighter> = {
  bean: {
    id: 'bean',
    name: 'El Frijolito',
    title: 'El Héroe de la Semilla Sagrada',
    style: 'Velocidad',
    reach: 'Corto',
    power: 3,
    speed: 5,
    defense: 4,
    color: '#2e8c3a',
    accent: '#a6ea6e',
    special: 'Hoja Cortante',
  },
  flea: {
    id: 'flea',
    name: 'La Pulguita',
    title: 'La Luchadora de las Ofrendas',
    style: 'Fuerza',
    reach: 'Medio',
    power: 5,
    speed: 4,
    defense: 4,
    color: '#f2822a',
    accent: '#ffd88a',
    special: 'Cabezazo Meteoro',
  },
  ernesto: {
    id: 'ernesto',
    name: 'Ernesto',
    title: 'El Mariachi Calavera',
    style: 'Músico',
    reach: 'Largo',
    power: 4,
    speed: 3,
    defense: 3,
    color: '#a45cf0',
    accent: '#ffd856',
    special: 'Serenata de Ultratumba',
  },
  elmacho: {
    id: 'elmacho',
    name: 'El Macho',
    title: 'El Coloso Calavera',
    style: 'Llaves y fuerza',
    reach: 'Medio',
    power: 5,
    speed: 2,
    defense: 5,
    color: '#e8303c',
    accent: '#ff8a76',
    special: 'Lariat Volcánico',
  },
  huesos: {
    id: 'huesos',
    name: 'Huesos',
    title: 'El Segador de Mictlán',
    style: 'Guadaña',
    reach: 'Muy largo',
    power: 5,
    speed: 4,
    defense: 3,
    color: '#8a46d8',
    accent: '#ff9a3a',
    special: 'Almas Errantes',
  },
};

/** Heroes the player may choose in story mode, and the boss waiting on each sombrero. */
export const HEROES = ['bean', 'flea'];
export const BOSSES = ['ernesto', 'elmacho', 'huesos'];

/** Name flashed during a super's cinematic. */
export const SUPER_NAMES: Record<string, string> = {
  bean: 'Tormenta de Hojas',
  flea: 'Terremoto Pulga',
  ernesto: 'Coro de Ultratumba',
  elmacho: 'Erupción del Coloso',
  huesos: 'Cosecha de Almas',
};
