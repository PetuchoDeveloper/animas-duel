/**
 * Sprite definitions, frame bounding coordinates, and transparent canvas caching
 * for The Bean (El Frijolito), The Flea (La Pulguita), Ernesto, El Macho, and Huesos.
 * Frame coordinates are tightly calibrated to eliminate borders and text labels.
 */

export interface FrameRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  originX?: number; // anchor point X relative to width
  originY?: number; // anchor point Y relative to height
}

export interface AnimationClip {
  fps: number;
  loop: boolean;
  frames: FrameRect[];
}

export interface CharacterSpriteConfig {
  id: string;
  name: string;
  title: string;
  spritesheetPath: string;
  style: string;
  reach: string;
  power: number;
  speed: number;
  defense: number;
  themeColor: string;
  accentColor: string;
  animations: Record<string, AnimationClip>;
  portraits: FrameRect[];
  heroArtRect: FrameRect;
}

// Helper to construct frame rectangles with bottom-center anchor
function fr(sx: number, sy: number, sw: number, sh: number, originY: number = 0.95): FrameRect {
  return { sx, sy, sw, sh, originX: 0.5, originY };
}

// 1. EL FRIJOLITO ("THE BEAN" - PLAYER 1)
export const BEAN_CONFIG: CharacterSpriteConfig = {
  id: 'bean',
  name: 'El Frijolito',
  title: 'El Héroe de la Semilla Sagrada',
  spritesheetPath: '/assets/aistudio/Retro_Arcade_Fighters_Sprite_Sheet_23c3bcd8.png',
  style: 'Speed / Tech',
  reach: 'Short',
  power: 3,
  speed: 5,
  defense: 4,
  themeColor: '#22c55e',
  accentColor: '#86efac',
  heroArtRect: { sx: 10, sy: 10, sw: 740, sh: 230 },
  portraits: [
    { sx: 16, sy: 885, sw: 98, sh: 95 },
    { sx: 120, sy: 885, sw: 98, sh: 95 },
    { sx: 224, sy: 885, sw: 98, sh: 95 },
    { sx: 328, sy: 885, sw: 98, sh: 95 },
    { sx: 432, sy: 885, sw: 98, sh: 95 },
    { sx: 536, sy: 885, sw: 98, sh: 95 },
    { sx: 640, sy: 885, sw: 98, sh: 95 },
  ],
  animations: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        fr(18, 270, 52, 82),
        fr(88, 270, 50, 82),
        fr(157, 270, 53, 82),
      ],
    },
    walk: {
      fps: 8,
      loop: true,
      frames: [
        fr(246, 268, 52, 84),
        fr(312, 268, 52, 84),
        fr(368, 268, 52, 84),
        fr(421, 268, 52, 84),
      ],
    },
    run: {
      fps: 11,
      loop: true,
      frames: [
        fr(482, 270, 62, 82),
        fr(546, 275, 70, 77),
        fr(618, 275, 66, 77),
        fr(685, 275, 60, 77),
      ],
    },
    lightAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(12, 380, 80, 90),
        fr(95, 380, 80, 90),
        fr(178, 380, 80, 90),
        fr(261, 380, 80, 90),
      ],
    },
    heavyAttack: {
      fps: 9,
      loop: false,
      frames: [
        fr(351, 380, 98, 90),
        fr(452, 380, 98, 90),
        fr(553, 380, 98, 90),
        fr(654, 380, 98, 90),
      ],
    },
    jump: {
      fps: 6,
      loop: false,
      frames: [
        fr(12, 495, 60, 94),
        fr(73, 495, 60, 94),
        fr(134, 495, 60, 94),
      ],
    },
    airAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(202, 495, 84, 94),
        fr(288, 495, 84, 94),
        fr(374, 495, 84, 94),
      ],
    },
    special1: {
      fps: 8,
      loop: false,
      frames: [
        fr(467, 495, 95, 94),
        fr(563, 495, 95, 94),
        fr(660, 495, 95, 94),
      ],
    },
    special2: {
      fps: 7,
      loop: false,
      frames: [
        fr(12, 620, 95, 138),
        fr(108, 620, 95, 138),
        fr(205, 620, 95, 138),
      ],
    },
    super: {
      fps: 6,
      loop: false,
      frames: [
        fr(308, 620, 145, 138),
        fr(457, 620, 145, 138),
        fr(607, 620, 145, 138),
      ],
    },
    hit: {
      fps: 8,
      loop: false,
      frames: [
        fr(12, 785, 78, 84),
        fr(92, 785, 78, 84),
        fr(172, 785, 78, 84),
        fr(252, 785, 78, 84),
      ],
    },
    ko: {
      fps: 5,
      loop: false,
      frames: [
        fr(339, 785, 100, 84),
        fr(443, 785, 100, 84),
        fr(547, 785, 100, 84),
        fr(651, 785, 100, 84),
      ],
    },
  },
};

// 2. LA PULGUITA ("THE FLEA" - PLAYER 2)
export const FLEA_CONFIG: CharacterSpriteConfig = {
  id: 'flea',
  name: 'La Pulguita',
  title: 'El Brawler de las Ofrendas',
  spritesheetPath: '/assets/aistudio/Retro_Arcade_Fighters_Sprite_Sheet_23c3bcd8.png',
  style: 'Power / Rush',
  reach: 'Medium',
  power: 5,
  speed: 4,
  defense: 4,
  themeColor: '#d97706',
  accentColor: '#fde047',
  heroArtRect: { sx: 775, sy: 10, sw: 740, sh: 230 },
  portraits: [
    { sx: 780, sy: 885, sw: 98, sh: 95 },
    { sx: 884, sy: 885, sw: 98, sh: 95 },
    { sx: 988, sy: 885, sw: 98, sh: 95 },
    { sx: 1092, sy: 885, sw: 98, sh: 95 },
    { sx: 1196, sy: 885, sw: 98, sh: 95 },
    { sx: 1300, sy: 885, sw: 98, sh: 95 },
    { sx: 1404, sy: 885, sw: 98, sh: 95 },
  ],
  animations: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        fr(790, 270, 56, 82),
        fr(859, 272, 57, 80),
        fr(932, 272, 61, 80),
      ],
    },
    walk: {
      fps: 8,
      loop: true,
      frames: [
        fr(1015, 268, 54, 84),
        fr(1079, 268, 54, 84),
        fr(1142, 268, 54, 84),
        fr(1202, 268, 54, 84),
      ],
    },
    run: {
      fps: 10,
      loop: true,
      frames: [
        fr(1278, 270, 68, 82),
        fr(1349, 278, 65, 74),
        fr(1416, 278, 65, 74),
      ],
    },
    lightAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(775, 380, 88, 90),
        fr(867, 380, 88, 90),
        fr(960, 380, 88, 90),
        fr(1052, 380, 88, 90),
      ],
    },
    heavyAttack: {
      fps: 9,
      loop: false,
      frames: [
        fr(1150, 380, 92, 90),
        fr(1245, 380, 92, 90),
        fr(1340, 380, 92, 90),
        fr(1435, 380, 92, 90),
      ],
    },
    jump: {
      fps: 6,
      loop: false,
      frames: [
        fr(775, 495, 64, 94),
        fr(841, 495, 64, 94),
        fr(907, 495, 64, 94),
      ],
    },
    airAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(980, 495, 80, 94),
        fr(1063, 495, 80, 94),
        fr(1146, 495, 80, 94),
      ],
    },
    special1: {
      fps: 8,
      loop: false,
      frames: [
        fr(1235, 495, 96, 94),
        fr(1333, 495, 96, 94),
        fr(1431, 495, 96, 94),
      ],
    },
    special2: {
      fps: 7,
      loop: false,
      frames: [
        fr(775, 620, 115, 138),
        fr(895, 620, 115, 138),
        fr(1015, 620, 115, 138),
      ],
    },
    super: {
      fps: 6,
      loop: false,
      frames: [
        fr(1142, 620, 125, 138),
        fr(1271, 620, 125, 138),
        fr(1400, 620, 125, 138),
      ],
    },
    hit: {
      fps: 8,
      loop: false,
      frames: [
        fr(775, 785, 82, 84),
        fr(860, 785, 82, 84),
        fr(946, 785, 82, 84),
        fr(1032, 785, 82, 84),
      ],
    },
    ko: {
      fps: 5,
      loop: false,
      frames: [
        fr(1125, 785, 98, 84),
        fr(1226, 785, 98, 84),
        fr(1327, 785, 98, 84),
        fr(1428, 785, 98, 84),
      ],
    },
  },
};

// 3. ERNESTO ("BOSS LEVEL 1: EL GRAN SOMBRERO DORADO")
export const ERNESTO_CONFIG: CharacterSpriteConfig = {
  id: 'ernesto',
  name: 'Ernesto',
  title: 'El Mariachi Calavera · Jefe Nivel 1',
  spritesheetPath: '/assets/aistudio/Ernesto_s_Retro_Fighting_Game_Sprite_Sheet_de693d2e.png',
  style: 'Music / Trickster',
  reach: 'Long',
  power: 4,
  speed: 3,
  defense: 3,
  themeColor: '#c084fc',
  accentColor: '#fbbf24',
  heroArtRect: { sx: 510, sy: 12, sw: 920, sh: 260 },
  portraits: [
    { sx: 20, sy: 975, sw: 140, sh: 90 },
    { sx: 175, sy: 975, sw: 140, sh: 90 },
    { sx: 330, sy: 975, sw: 140, sh: 90 },
    { sx: 490, sy: 975, sw: 140, sh: 90 },
    { sx: 650, sy: 975, sw: 140, sh: 90 },
    { sx: 810, sy: 975, sw: 140, sh: 90 },
    { sx: 970, sy: 975, sw: 140, sh: 90 },
  ],
  animations: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        fr(20, 301, 105, 84),
        fr(135, 301, 105, 84),
        fr(255, 301, 105, 84),
        fr(365, 301, 105, 84),
      ],
    },
    walk: {
      fps: 8,
      loop: true,
      frames: [
        fr(495, 301, 110, 84),
        fr(612, 301, 110, 84),
        fr(730, 301, 110, 84),
        fr(848, 301, 110, 84),
      ],
    },
    run: {
      fps: 10,
      loop: true,
      frames: [
        fr(975, 301, 145, 84),
        fr(1130, 301, 145, 84),
        fr(1285, 301, 145, 84),
      ],
    },
    lightAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(20, 426, 135, 89),
        fr(160, 426, 135, 89),
        fr(300, 426, 135, 89),
        fr(445, 426, 135, 89),
        fr(585, 426, 135, 89),
      ],
    },
    heavyAttack: {
      fps: 9,
      loop: false,
      frames: [
        fr(738, 426, 135, 89),
        fr(878, 426, 135, 89),
        fr(1018, 426, 135, 89),
        fr(1158, 426, 135, 89),
        fr(1298, 426, 135, 89),
      ],
    },
    jump: {
      fps: 6,
      loop: false,
      frames: [
        fr(20, 555, 130, 90),
        fr(155, 555, 130, 90),
        fr(290, 555, 130, 90),
      ],
    },
    airAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(445, 555, 135, 90),
        fr(585, 555, 135, 90),
        fr(725, 555, 135, 90),
      ],
    },
    special1: {
      fps: 8,
      loop: false,
      frames: [
        fr(875, 555, 135, 90),
        fr(1015, 555, 135, 90),
        fr(1155, 555, 135, 90),
      ],
    },
    special2: {
      fps: 7,
      loop: false,
      frames: [
        fr(20, 685, 160, 125),
        fr(185, 685, 160, 125),
        fr(350, 685, 160, 125),
      ],
    },
    super: {
      fps: 6,
      loop: false,
      frames: [
        fr(710, 685, 175, 125),
        fr(890, 685, 175, 125),
        fr(1070, 685, 175, 125),
      ],
    },
    hit: {
      fps: 8,
      loop: false,
      frames: [
        fr(20, 850, 125, 80),
        fr(150, 850, 125, 80),
        fr(280, 850, 125, 80),
        fr(410, 850, 125, 80),
      ],
    },
    ko: {
      fps: 5,
      loop: false,
      frames: [
        fr(695, 850, 140, 80),
        fr(840, 850, 140, 80),
        fr(985, 850, 140, 80),
        fr(1130, 850, 140, 80),
      ],
    },
  },
};

// 4. EL MACHO ("BOSS LEVEL 2: EL SOMBRERO AGRIETADO")
export const EL_MACHO_CONFIG: CharacterSpriteConfig = {
  id: 'elmacho',
  name: 'El Macho',
  title: 'El Coloso Calavera · Jefe Nivel 2',
  spritesheetPath: '/assets/aistudio/El_Macho_Pixel_Fighter_Sprite_Sheet_46dd7bdc.png',
  style: 'Power / Grapple',
  reach: 'Medium',
  power: 5,
  speed: 2,
  defense: 5,
  themeColor: '#ef4444',
  accentColor: '#f97316',
  heroArtRect: { sx: 360, sy: 12, sw: 1070, sh: 260 },
  portraits: [
    { sx: 20, sy: 975, sw: 140, sh: 90 },
    { sx: 175, sy: 975, sw: 140, sh: 90 },
    { sx: 330, sy: 975, sw: 140, sh: 90 },
    { sx: 490, sy: 975, sw: 140, sh: 90 },
    { sx: 650, sy: 975, sw: 140, sh: 90 },
    { sx: 810, sy: 975, sw: 140, sh: 90 },
    { sx: 970, sy: 975, sw: 140, sh: 90 },
  ],
  animations: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        fr(20, 301, 105, 84),
        fr(135, 301, 105, 84),
        fr(255, 301, 105, 84),
        fr(365, 301, 105, 84),
      ],
    },
    walk: {
      fps: 7,
      loop: true,
      frames: [
        fr(495, 301, 110, 84),
        fr(612, 301, 110, 84),
        fr(730, 301, 110, 84),
        fr(848, 301, 110, 84),
      ],
    },
    run: {
      fps: 9,
      loop: true,
      frames: [
        fr(975, 301, 145, 84),
        fr(1130, 301, 145, 84),
        fr(1285, 301, 145, 84),
      ],
    },
    lightAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(20, 426, 135, 89),
        fr(160, 426, 135, 89),
        fr(300, 426, 135, 89),
        fr(445, 426, 135, 89),
      ],
    },
    heavyAttack: {
      fps: 9,
      loop: false,
      frames: [
        fr(738, 426, 135, 89),
        fr(878, 426, 135, 89),
        fr(1018, 426, 135, 89),
        fr(1158, 426, 135, 89),
      ],
    },
    jump: {
      fps: 6,
      loop: false,
      frames: [
        fr(20, 555, 130, 90),
        fr(155, 555, 130, 90),
        fr(290, 555, 130, 90),
      ],
    },
    airAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(445, 555, 135, 90),
        fr(585, 555, 135, 90),
        fr(725, 555, 135, 90),
      ],
    },
    special1: {
      fps: 8,
      loop: false,
      frames: [
        fr(875, 555, 135, 90),
        fr(1015, 555, 135, 90),
        fr(1155, 555, 135, 90),
      ],
    },
    special2: {
      fps: 7,
      loop: false,
      frames: [
        fr(20, 685, 160, 125),
        fr(185, 685, 160, 125),
        fr(350, 685, 160, 125),
      ],
    },
    super: {
      fps: 6,
      loop: false,
      frames: [
        fr(710, 685, 175, 125),
        fr(890, 685, 175, 125),
        fr(1070, 685, 175, 125),
      ],
    },
    hit: {
      fps: 8,
      loop: false,
      frames: [
        fr(20, 850, 125, 80),
        fr(150, 850, 125, 80),
        fr(280, 850, 125, 80),
        fr(410, 850, 125, 80),
      ],
    },
    ko: {
      fps: 5,
      loop: false,
      frames: [
        fr(695, 850, 140, 80),
        fr(840, 850, 140, 80),
        fr(985, 850, 140, 80),
        fr(1130, 850, 140, 80),
      ],
    },
  },
};

// 5. HUESOS ("BOSS LEVEL 3: EL SOMBRERO DE MICTLÁN")
export const HUESOS_CONFIG: CharacterSpriteConfig = {
  id: 'huesos',
  name: 'Huesos',
  title: 'El Segador de Mictlán · Jefe Nivel 3',
  spritesheetPath: '/assets/aistudio/Huesos__Pixel_Reaper_Fighter_Sprite_Sheet_e4457e18.png',
  style: 'Scythe / Reaper',
  reach: 'Long',
  power: 5,
  speed: 4,
  defense: 3,
  themeColor: '#9333ea',
  accentColor: '#38bdf8',
  heroArtRect: { sx: 350, sy: 12, sw: 1080, sh: 260 },
  portraits: [
    { sx: 20, sy: 975, sw: 140, sh: 90 },
    { sx: 175, sy: 975, sw: 140, sh: 90 },
    { sx: 330, sy: 975, sw: 140, sh: 90 },
    { sx: 490, sy: 975, sw: 140, sh: 90 },
    { sx: 650, sy: 975, sw: 140, sh: 90 },
    { sx: 810, sy: 975, sw: 140, sh: 90 },
    { sx: 970, sy: 975, sw: 140, sh: 90 },
  ],
  animations: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        fr(20, 301, 105, 84),
        fr(135, 301, 105, 84),
        fr(255, 301, 105, 84),
        fr(365, 301, 105, 84),
      ],
    },
    walk: {
      fps: 8,
      loop: true,
      frames: [
        fr(495, 301, 110, 84),
        fr(612, 301, 110, 84),
        fr(730, 301, 110, 84),
        fr(848, 301, 110, 84),
      ],
    },
    run: {
      fps: 10,
      loop: true,
      frames: [
        fr(975, 301, 145, 84),
        fr(1130, 301, 145, 84),
        fr(1285, 301, 145, 84),
      ],
    },
    lightAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(20, 426, 135, 89),
        fr(160, 426, 135, 89),
        fr(300, 426, 135, 89),
        fr(445, 426, 135, 89),
      ],
    },
    heavyAttack: {
      fps: 9,
      loop: false,
      frames: [
        fr(738, 426, 135, 89),
        fr(878, 426, 135, 89),
        fr(1018, 426, 135, 89),
        fr(1158, 426, 135, 89),
      ],
    },
    jump: {
      fps: 6,
      loop: false,
      frames: [
        fr(20, 555, 130, 90),
        fr(155, 555, 130, 90),
        fr(290, 555, 130, 90),
      ],
    },
    airAttack: {
      fps: 10,
      loop: false,
      frames: [
        fr(445, 555, 135, 90),
        fr(585, 555, 135, 90),
        fr(725, 555, 135, 90),
      ],
    },
    special1: {
      fps: 8,
      loop: false,
      frames: [
        fr(875, 555, 135, 90),
        fr(1015, 555, 135, 90),
        fr(1155, 555, 135, 90),
      ],
    },
    special2: {
      fps: 7,
      loop: false,
      frames: [
        fr(20, 685, 160, 125),
        fr(185, 685, 160, 125),
        fr(350, 685, 160, 125),
      ],
    },
    super: {
      fps: 6,
      loop: false,
      frames: [
        fr(710, 685, 175, 125),
        fr(890, 685, 175, 125),
        fr(1070, 685, 175, 125),
      ],
    },
    hit: {
      fps: 8,
      loop: false,
      frames: [
        fr(20, 850, 125, 80),
        fr(150, 850, 125, 80),
        fr(280, 850, 125, 80),
        fr(410, 850, 125, 80),
      ],
    },
    ko: {
      fps: 5,
      loop: false,
      frames: [
        fr(695, 850, 140, 80),
        fr(840, 850, 140, 80),
        fr(985, 850, 140, 80),
        fr(1130, 850, 140, 80),
      ],
    },
  },
};

export const CHARACTER_ROSTER: Record<string, CharacterSpriteConfig> = {
  bean: BEAN_CONFIG,
  flea: FLEA_CONFIG,
  ernesto: ERNESTO_CONFIG,
  elmacho: EL_MACHO_CONFIG,
  huesos: HUESOS_CONFIG,
};

const processedCanvasCache = new Map<string, HTMLCanvasElement>();

export function getCleanSpritesheetCanvas(
  srcPath: string,
  onLoaded?: () => void
): HTMLCanvasElement | null {
  if (processedCanvasCache.has(srcPath)) {
    return processedCanvasCache.get(srcPath)!;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = srcPath;

  img.onload = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 10) continue;

      // Dark background: threshold under 28 in all channels
      if (r < 28 && g < 28 && b < 28) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    processedCanvasCache.set(srcPath, offscreen);
    if (onLoaded) onLoaded();
  };

  return null;
}
