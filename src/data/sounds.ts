// Mirrors ShopSound in the app (SoundSynth.swift / FunStyle.swift).

export type SoundId =
  | 'rollingShutter' | 'quickShutter' | 'homeShutter' | 'shopBell'
  | 'popOpen' | 'tada' | 'boingUp' | 'bubbleUp' | 'zipOpen' | 'squeakyHello'
  | 'supercar' | 'fighterJet'
  | 'morningBirds' | 'forestMorning' | 'forestStream' | 'oceanWaves' | 'rainThunder'
  | 'lidPop' | 'bloopClose' | 'zipShut' | 'squeakClose' | 'goodnight';

export type Tint = 'gold' | 'pink' | 'coral' | 'mint' | 'lilac';

export interface Sound {
  id: SoundId;
  title: string;
  subtitle: string;
  icon: string; // Phosphor filled icon name, matching the app's SF Symbols
}

export interface SoundGroup {
  id: string;
  title: string;
  tint: Tint;
  icon: string;
  sounds: Sound[];
}

export const openGroups: SoundGroup[] = [
  {
    id: 'shutters', title: 'Shutters', tint: 'gold', icon: 'storefront',
    sounds: [
      { id: 'rollingShutter', title: 'Rolling Shutter', subtitle: 'Clackety roll-up, ka-chunk, ding!', icon: 'storefront' },
      { id: 'quickShutter', title: 'Quick Shutter', subtitle: 'A speedy roll-up and a pop', icon: 'lightning' },
      { id: 'homeShutter', title: 'Home Shutter', subtitle: 'A cozy little roll-up chime', icon: 'house' },
      { id: 'shopBell', title: 'Shop Door Bell', subtitle: 'Ding-ding as the door swings open', icon: 'bell' },
    ],
  },
  {
    id: 'playful', title: 'Playful', tint: 'pink', icon: 'confetti',
    sounds: [
      { id: 'popOpen', title: 'Pop Open', subtitle: 'Pop, swoosh up, sparkle!', icon: 'confetti' },
      { id: 'tada', title: 'Ta-Da!', subtitle: 'A happy marimba fanfare', icon: 'sparkle' },
      { id: 'boingUp', title: 'Boing Up', subtitle: 'A big cartoon spring', icon: 'arrow-circle-up' },
      { id: 'bubbleUp', title: 'Bubble Up', subtitle: 'Bubbles rising to the top', icon: 'circles-three' },
      { id: 'zipOpen', title: 'Zip & Ding', subtitle: 'Zip it open, ding!', icon: 'arrow-line-up' },
      { id: 'squeakyHello', title: 'Squeaky Hello', subtitle: 'A rubber duck says hi', icon: 'hand-waving' },
    ],
  },
  {
    id: 'fun', title: 'Fun', tint: 'coral', icon: 'flag-checkered',
    sounds: [
      { id: 'supercar', title: 'Supercar', subtitle: 'Putt-putt, VROOM, beep-beep!', icon: 'car-profile' },
      { id: 'fighterJet', title: 'Fighter Jet', subtitle: 'A cartoon jet zooms past', icon: 'airplane' },
    ],
  },
  {
    id: 'nature', title: 'Nature', tint: 'mint', icon: 'leaf',
    sounds: [
      { id: 'morningBirds', title: 'Morning Birds', subtitle: 'Tweet-tweet and a little trill', icon: 'bird' },
      { id: 'forestMorning', title: 'Forest Morning', subtitle: 'Breeze, marimba and birdsong', icon: 'tree-evergreen' },
      { id: 'forestStream', title: 'Forest Stream', subtitle: 'A bubbly little brook', icon: 'drop' },
      { id: 'oceanWaves', title: 'Ocean Waves', subtitle: 'Whoosh, splash, bubbles', icon: 'waves' },
      { id: 'rainThunder', title: 'Rain & Thunder', subtitle: 'Plinky rain and a cartoon boom', icon: 'cloud-lightning' },
    ],
  },
];

export const closeGroup: SoundGroup = {
  id: 'close', title: 'Goodbyes', tint: 'lilac', icon: 'moon',
  sounds: [
    { id: 'lidPop', title: 'Lid Pop', subtitle: 'Shoop, pop, boing!', icon: 'seal' },
    { id: 'bloopClose', title: 'Bloop', subtitle: 'A water-drop bloop', icon: 'drop-half-bottom' },
    { id: 'zipShut', title: 'Zip Shut', subtitle: 'Zip, click!', icon: 'arrow-line-down' },
    { id: 'squeakClose', title: 'Squeak', subtitle: 'A tiny rubber duck squeak', icon: 'hand-waving' },
    { id: 'goodnight', title: 'Goodnight', subtitle: 'Ding-dong, sleep tight', icon: 'moon-stars' },
  ],
};

export const allSounds: (Sound & { tint: Tint })[] = [...openGroups, closeGroup].flatMap((g) =>
  g.sounds.map((s) => ({ ...s, tint: g.tint })),
);

export const openSoundCount = openGroups.reduce((n, g) => n + g.sounds.length, 0);
export const totalSoundCount = openSoundCount + closeGroup.sounds.length;

/**
 * When the on-screen shutter should finish rolling up, in seconds from the start of
 * each open sound: the ka-chunk, final ding, splash or boom, read from SoundSynth.
 */
export const shutterHit: Partial<Record<SoundId, number>> = {
  rollingShutter: 1.2, // ratchet, then ka-chunk at 1.2 s
  quickShutter: 0.6, // pop at 0.6 s
  homeShutter: 1.08, // chime at 1.08 s
  shopBell: 0.34, // third strike
  popOpen: 0.5, // top of the swoosh
  tada: 0.32, // final chord
  boingUp: 0.6,
  bubbleUp: 0.62, // big bubble
  zipOpen: 0.4, // ding after the zip
  squeakyHello: 0.4,
  supercar: 1.3, // beep-beep after the rev
  fighterJet: 0.8, // fly-by
  morningBirds: 0.9,
  forestMorning: 0.6, // third marimba note
  forestStream: 0.8,
  oceanWaves: 0.86, // crash
  rainThunder: 0.72, // thunder
};
