/**
 * Story dialogues, character lore, and campaign cutscenes featuring
 * El Frijolito (The Bean) and La Pulguita (The Flea) climbing the 3 Sombreros
 * to defeat Ernesto, El Macho, and Huesos!
 */

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  portraitIndex: number;
  spanishText: string;
  englishSub: string;
}

export const STORY_DATA: Record<string, {
  level1Intro: DialogueLine[];
  level2Intro: DialogueLine[];
  level3Intro: DialogueLine[];
  epilogue: DialogueLine[];
}> = {
  bean: {
    level1Intro: [
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 0,
        spanishText: '¡Por los tamales de la abuela! El portal sagrado del Día de Muertos está en peligro.',
        englishSub: 'By grandma’s sacred tamales! The Day of the Dead portal is in grave danger.',
      },
      {
        speakerId: 'ernesto',
        speakerName: 'Ernesto',
        portraitIndex: 0,
        spanishText: '¡Un frijolito con capa! ¿Crees que puedes cruzar El Gran Sombrero Dorado sin afinar tus pasos?',
        englishSub: 'A tiny bean with a cape! You think you can cross The Golden Sombrero without tuning your steps?',
      },
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 2,
        spanishText: '¡Soy pequeño pero picoso, Don Mariachi! ¡Que suene la música y que vuelen los puños!',
        englishSub: 'I am small but spicy, Don Mariachi! Let the music strike and the fists fly!',
      },
    ],
    level2Intro: [
      {
        speakerId: 'elmacho',
        speakerName: 'El Macho',
        portraitIndex: 0,
        spanishText: '¡JAJAJA! ¿Un frijol llegó al Sombrero Agrietado? ¡Aquí el suelo se parte bajo mis botas!',
        englishSub: 'HAHAHA! A bean made it to The Cracked Sombrero? The floor splits under my boots here!',
      },
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 1,
        spanishText: '¡Tu tamaño no me asusta, Macho! ¡La fuerza de mis ancestros cabe en esta pequeña vaina verde!',
        englishSub: 'Your size does not scare me, Macho! The strength of my ancestors fits inside this green pod!',
      },
      {
        speakerId: 'elmacho',
        speakerName: 'El Macho',
        portraitIndex: 3,
        spanishText: '¡A ver si esquivas mi lariat volcánico, pequeñín! ¡A DOS DE TRES CAÍDAS SIN LÍMITE!',
        englishSub: 'Let us see if you can dodge my volcanic lariat, little one! TWO OUT OF THREE FALLS!',
      },
    ],
    level3Intro: [
      {
        speakerId: 'huesos',
        speakerName: 'Huesos',
        portraitIndex: 0,
        spanishText: '¿Cómo se atreve una simple semilla a pisar las ruinas de Mictlán? El sombrero está roto para siempre.',
        englishSub: 'How dare a mere seed tread upon the ruins of Mictlán? The sombrero is shattered forever.',
      },
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 2,
        spanishText: '¡Huesos! De las semillas rotas nacen los campos más verdes. ¡Romperé tus cadenas espectrales!',
        englishSub: 'Huesos! From broken seeds sprout the greenest fields. I will shatter your spectral chains!',
      },
      {
        speakerId: 'huesos',
        speakerName: 'Huesos',
        portraitIndex: 1,
        spanishText: '¡Silencio insolente! ¡Tu alma será cosechada en este Sombrero Destrozado!',
        englishSub: 'Insolent silence! Your soul shall be reaped on this Shattered Sombrero!',
      },
    ],
    epilogue: [
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 5,
        spanishText: '¡Las cadenas de Mictlán se rompieron en un estallido de pétalos dorados de cempasúchil!',
        englishSub: 'The chains of Mictlán shattered in an explosion of golden marigold petals!',
      },
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 6,
        spanishText: 'En todos los altares de México, las veladoras brillaron con una luz esmeralda y alegre.',
        englishSub: 'Across all the altars in Mexico, the candles glowed with a joyful emerald warmth.',
      },
      {
        speakerId: 'bean',
        speakerName: 'El Frijolito',
        portraitIndex: 0,
        spanishText: '¡El Frijolito cumplió su misión! Las ánimas están en casa... ¡Que siga la gran fiesta!',
        englishSub: 'El Frijolito fulfilled his quest! The spirits are home... let the grand fiesta continue!',
      },
    ],
  },

  flea: {
    level1Intro: [
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 0,
        spanishText: '¡Vaya Sombrero tan elegante! Pero no tengo tiempo para admirar el terciopelo, debo subir.',
        englishSub: 'What an elegant Sombrero! But I have no time to admire the velvet, I must climb up.',
      },
      {
        speakerId: 'ernesto',
        speakerName: 'Ernesto',
        portraitIndex: 0,
        spanishText: '¡Una pulga brava en mi escenario! Veamos si puedes brincar al compás de mis notas de ultratumba.',
        englishSub: 'A feisty flea on my stage! Let us see if you can leap to the tempo of my underworld chords.',
      },
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 2,
        spanishText: '¡Mi salto derriba gigantes, Don Mariachi! ¡Guarda tu guitarra o te la rompo en la mandíbula!',
        englishSub: 'My leap topples giants, Don Mariachi! Stash your guitar or I will snap it on your jaw!',
      },
    ],
    level2Intro: [
      {
        speakerId: 'elmacho',
        speakerName: 'El Macho',
        portraitIndex: 0,
        spanishText: '¡Una pulga que quiere luchar en el Sombrero Agrietado! ¡Te aplastaré con una sola mano!',
        englishSub: 'A flea wanting to brawl on the Cracked Sombrero! I will crush you with one hand!',
      },
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 1,
        spanishText: '¡Inténtalo, gigantón! ¡Soy más rápida que un relámpago en noche de muertos!',
        englishSub: 'Just try it, big boy! I am faster than lightning on the Night of the Dead!',
      },
      {
        speakerId: 'elmacho',
        speakerName: 'El Macho',
        portraitIndex: 2,
        spanishText: '¡Me gusta tu coraje, bicho! ¡A VER QUIÉN TIENE MÁS CORAZÓN EN EL RING!',
        englishSub: 'I love your courage, little bug! LET US SEE WHO HAS MORE HEART IN THE RING!',
      },
    ],
    level3Intro: [
      {
        speakerId: 'huesos',
        speakerName: 'Huesos',
        portraitIndex: 0,
        spanishText: 'Un insecto que osa desafiar al Segador de Mictlán. Te pulverizaré en polvo de hueso.',
        englishSub: 'An insect daring to defy the Reaper of Mictlán. I will pulverize you into bone dust.',
      },
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 2,
        spanishText: '¡Podrás tener guadaña y fuego morado, pero no puedes picar a quien salta a la velocidad del sonido!',
        englishSub: 'You may have a scythe and purple fire, but you cannot strike one who leaps at the speed of sound!',
      },
      {
        speakerId: 'huesos',
        speakerName: 'Huesos',
        portraitIndex: 1,
        spanishText: '¡Este Sombrero Destrozado será tu fin! ¡MUERE EN LAS SOMBRAS!',
        englishSub: 'This Shattered Sombrero shall be your end! PERISH IN THE SHADOWS!',
      },
    ],
    epilogue: [
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 5,
        spanishText: '¡De un cabezazo meteórico, La Pulguita destrozó la guadaña de Huesos en mil chispas!',
        englishSub: 'With a meteoric headbutt, La Pulguita shattered Huesos’ scythe into a thousand sparks!',
      },
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 6,
        spanishText: 'El portal del cielo se abrió y un río de pan de muerto y cempasúchil cayó sobre las plazas.',
        englishSub: 'The sky portal opened and a river of sweet bread and marigolds showered the plazas.',
      },
      {
        speakerId: 'flea',
        speakerName: 'La Pulguita',
        portraitIndex: 0,
        spanishText: '¡La Pulguita alzó sus puños en la cima del sombrero! ¡El campeón indiscutible de las ánimas!',
        englishSub: 'La Pulguita raised his fists atop the sombrero! The undisputed champion of the souls!',
      },
    ],
  },
};
