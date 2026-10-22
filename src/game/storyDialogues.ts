/**
 * Story cutscenes: El Frijolito or La Pulguita climb the three sombreros against Ernesto, Huesos and,
 * waiting at the top, El Macho, who steals a marigold petal after each fight and sabotages the arenas.
 * Spanish lines with English subtitles; the hero's own lines differ per hero.
 */

/** Which portrait expression to show; the speaker's name comes from the roster. */
export type Mood = 'neutral' | 'shout' | 'hurt' | 'smug';

export interface DialogueLine {
  speakerId: string;
  mood: Mood;
  spanishText: string;
  englishSub: string;
}

export type SceneId = 'level1Intro' | 'level1Outro' | 'level2Intro' | 'level2Outro' | 'level3Intro' | 'epilogue';

type Text = [es: string, en: string];
type Raw = [speaker: string, mood: Mood, text: Text | Record<string, Text>];

const SCENES: Record<SceneId, Raw[]> = {
  level1Intro: [
    ['hero', 'neutral', {
      bean: ['¡Por los tamales de la abuela! Alguien robó los pétalos del portal sagrado del Día de Muertos.', 'By grandma’s sacred tamales! Someone stole the petals of the sacred Day of the Dead portal.'],
      flea: ['¡Vaya Sombrero tan elegante! Pero no tengo tiempo para admirar el terciopelo, debo subir.', 'What an elegant sombrero! But I have no time to admire the velvet, I must climb.'],
    }],
    ['ernesto', 'smug', {
      bean: ['¡Un frijolito con capa! ¿Crees que puedes cruzar El Gran Sombrero Dorado sin afinar tus pasos?', 'A tiny bean with a cape! You think you can cross The Golden Sombrero without tuning your steps?'],
      flea: ['¡Una pulga brava en mi escenario! Veamos si puedes brincar al compás de mis notas de ultratumba.', 'A feisty flea on my stage! Let us see if you can hop to the beat of my notes from beyond the grave.'],
    }],
    ['hero', 'shout', {
      bean: ['¡Soy pequeño pero picoso, Don Mariachi! ¡Que suene la música y que vuelen los puños!', 'I am small but spicy, Don Mariachi! Let the music strike and the fists fly!'],
      flea: ['¡Mi salto derriba gigantes, Don Mariachi! ¡Guarda tu guitarra o te la rompo en la mandíbula!', 'My leap topples giants, Don Mariachi! Put away your guitar or I will break it on your jaw!'],
    }],
    ['elmacho', 'smug', ['¡JA, JA, JA! Sigue cantando, Ernesto. Yo me encargo de que esta fiesta tenga... barriles de sorpresa.', 'HA, HA, HA! Keep singing, Ernesto. I will make sure this party has... barrels of surprises.']],
  ],
  level1Outro: [
    ['ernesto', 'hurt', ['Ay, mis cuerdas... El Macho me prometió el último huapango con mi bisnieta si te detenía. Me mintió.', 'Ay, my strings... El Macho promised me one last huapango with my great-granddaughter if I stopped you. He lied.']],
    ['elmacho', 'smug', ['¡Gracias por ablandarlo! Este pétalo dorado ya es mío. ¡Qué ricas están las ofrendas ajenas!', 'Thanks for softening him up! This golden petal is mine now. How tasty other people’s offerings are!']],
    ['hero', 'shout', {
      bean: ['¡Macho! ¡Devuelve ese pétalo, o te lo saco a puñetazos!', 'Macho! Give that petal back, or I will punch it out of you!'],
      flea: ['¡Macho! ¡Devuélvelo o te muerdo hasta que se te caiga la máscara!', 'Macho! Give it back or I will bite you until your mask falls off!'],
    }],
    ['elmacho', 'smug', ['¡Alcánzame en El Sombrero Agrietado, pequeñín! Te dejaré unos cuantos regalitos en el camino.', 'Catch me at The Cracked Sombrero, little one! I will leave a few little gifts for you along the way.']],
  ],
  level2Intro: [
    ['huesos', 'neutral', ['El Macho me liberó de las cadenas a cambio de tu alma. Aquí arriba, hasta el cielo obedece a la guadaña.', 'El Macho freed me from my chains in exchange for your soul. Up here, even the sky obeys the scythe.']],
    ['hero', 'shout', {
      bean: ['¡Huesos! ¡Él te está usando! De las semillas rotas nacen los campos más verdes, y yo no me voy a romper!', 'Huesos! He is using you! The greenest fields grow from broken seeds, and I will not break!'],
      flea: ['¡Podrás tener guadaña y fuego morado, pero no puedes picar a quien salta a la velocidad del sonido!', 'You may have a scythe and purple fire, but you cannot strike one who leaps at the speed of sound!'],
    }],
    ['huesos', 'shout', ['¡Silencio! ¡Tu alma será cosechada en este Sombrero Agrietado! ¡Que caiga el hierro!', 'Silence! Your soul shall be reaped on this Cracked Sombrero! Let the iron fall!']],
    ['elmacho', 'smug', ['¡Yunques, yunques, yunques! Cuidado con el cielo, Huesos... ¡Ups! No me importa a quién le caigan!', 'Anvils, anvils, anvils! Watch the sky, Huesos... Oops! I do not care who they land on!']],
  ],
  level2Outro: [
    ['huesos', 'hurt', ['Las almas... él las encadenó para obligarme a pelear. Lo siento, pequeño. Estaba cansado de las sombras.', 'The souls... he chained them to force me to fight. I am sorry, little one. I was tired of the shadows.']],
    ['elmacho', 'smug', ['¡Qué bien, qué bien! Con este segundo pétalo solo me falta el último: ¡el que cuelga de MI cinturón de campeón!', 'Splendid, splendid! With this second petal I only need the last one: the one hanging from MY champion belt!']],
    ['hero', 'shout', {
      bean: ['¡Se acabó el juego, Macho! ¡Pequeño, pero con todas las ánimas detrás de mí!', 'The game is over, Macho! Small, but with every soul behind me!'],
      flea: ['¡Se acabó, Macho! ¡Prepárate, porque ahora voy por tu cinturón y por tu máscara!', 'It is over, Macho! Get ready, because now I am going for your belt and your mask!'],
    }],
    ['elmacho', 'shout', ['¡Te espero en El Sombrero de Mictlán! ¡Ahí el cuadrilátero es mío y las reglas también!', 'I will be waiting at The Sombrero of Mictlán! The ring is mine there, and so are the rules!']],
  ],
  level3Intro: [
    ['elmacho', 'smug', ['¡Damas y caballeros, ánimas y calacas! ¡En esta esquina, el campeón invicto de Mictlán... EL MACHO!', 'Ladies and gentlemen, spirits and skeletons! In this corner, the undefeated champion of Mictlán... EL MACHO!']],
    ['hero', 'shout', {
      bean: ['¡Tres sombreros, tres pétalos y un solo frijol! ¡La fuerza de mis ancestros cabe en esta pequeña vaina verde!', 'Three sombreros, three petals and a single bean! The strength of my ancestors fits inside this green pod!'],
      flea: ['¡Soy más rápida que un relámpago en noche de muertos, gigantón! ¡Hoy te bajo del ring!', 'I am faster than lightning on the night of the dead, big guy! Today I knock you out of the ring!'],
    }],
    ['elmacho', 'shout', ['¡A DOS DE TRES CAÍDAS SIN LÍMITE! ¡Que tiemble el abismo y que suene mi música!', 'TWO OUT OF THREE FALLS, NO LIMIT! Let the abyss tremble and my music play!']],
  ],
  epilogue: [
    ['hero', 'smug', {
      bean: ['¡El Macho cayó y las cadenas de Mictlán se rompieron en un estallido de pétalos dorados de cempasúchil!', 'El Macho fell and the chains of Mictlán shattered in an explosion of golden marigold petals!'],
      flea: ['¡De un cabezazo meteórico, La Pulguita mandó a El Macho fuera del ring en mil chispas!', 'With a meteoric headbutt, La Pulguita sent El Macho out of the ring in a thousand sparks!'],
    }],
    ['hero', 'smug', {
      bean: ['Los tres pétalos volvieron al portal y, en todos los altares de México, las veladoras brillaron con luz alegre.', 'The three petals returned to the portal and, on every altar in Mexico, the candles glowed with joyful light.'],
      flea: ['El portal del cielo se abrió y un río de pan de muerto y cempasúchil cayó sobre las plazas.', 'The sky portal opened and a river of sweet bread and marigolds showered the plazas.'],
    }],
    ['hero', 'neutral', {
      bean: ['¡El Frijolito cumplió su misión! Las ánimas están en casa... ¡Que siga la gran fiesta!', 'El Frijolito fulfilled his quest! The spirits are home... let the grand fiesta continue!'],
      flea: ['¡La Pulguita alzó sus puños en la cima del sombrero! ¡La campeona indiscutible de las ánimas!', 'La Pulguita raised both fists atop the sombrero! The undisputed champion of the souls!'],
    }],
  ],
};

/** The lines of one cutscene for the chosen hero. */
export function storyScene(id: SceneId, hero: string): DialogueLine[] {
  return SCENES[id].map(([who, mood, text]) => {
    const [spanishText, englishSub] = Array.isArray(text) ? text : text[hero];
    return { speakerId: who === 'hero' ? hero : who, mood, spanishText, englishSub };
  });
}

/** The trouble El Macho causes on each sombrero while the hero fights its boss; the last has none because he is the boss. */
export const TROUBLE: ('barrels' | 'anvils' | null)[] = ['barrels', 'anvils', null];
