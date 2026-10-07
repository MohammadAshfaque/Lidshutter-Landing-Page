// Wires every [data-play] button on the page to the audio player.
// "@open" and "@close" mean "whatever sound the visitor picked".

import { getState, subscribe, toggle } from './audio';
import type { SoundId } from '../data/sounds';
import { allSounds } from '../data/sounds';

export function resolveSound(value: string): SoundId {
  const { openSound, closeSound } = getState();
  if (value === '@open') return openSound;
  if (value === '@close') return closeSound;
  return value as SoundId;
}

const titleOf = (id: SoundId) => allSounds.find((s) => s.id === id)?.title ?? id;

document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-play]');
  if (!button) return;
  event.stopPropagation();
  toggle(resolveSound(button.dataset.play!));
});

subscribe(({ nowPlaying }) => {
  document.querySelectorAll<HTMLElement>('[data-play]').forEach((button) => {
    const id = resolveSound(button.dataset.play!);
    const playing = nowPlaying === id;
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-label', `${playing ? 'Stop' : 'Play'} ${titleOf(id)}`);
  });
});
