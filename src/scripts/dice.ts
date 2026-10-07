// The roll animation for DiceButton: a spin plus six quick face changes,
// one roll at a time, like the app.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const spins = new WeakMap<HTMLElement, number>();

/** Animates the roll. Returns false if a roll is already in progress. */
export function roll(button: HTMLElement): boolean {
  if (button.dataset.rolling) return false;
  button.dataset.rolling = 'true';
  setTimeout(() => delete button.dataset.rolling, 450);
  if (reduceMotion()) return true;
  const spin = (spins.get(button) ?? 0) + 360;
  spins.set(button, spin);
  button.querySelector<HTMLElement>('.dice-spin')!.style.transform = `rotate(${spin}deg)`;
  for (let step = 0; step < 6; step++) {
    setTimeout(() => (button.dataset.face = String(1 + Math.floor(Math.random() * 6))), step * 60);
  }
  return true;
}

/** A different random item from `choices`. */
export function pickOther<T>(choices: T[], current: T): T {
  const others = choices.filter((c) => c !== current);
  return others[Math.floor(Math.random() * others.length)];
}
