// What waits where the code will go while there is nothing to show: the name
// of the app in Morse, as the tree draws it (round dots, long dashes, in
// their colours), with a slow wave of light running along it, as if it were
// being sent. The same in every mode (app.css); only seen.
import { t } from '../i18n/index.ts';
import { symbolsOf } from '../morse/alphabet.ts';
import { tokenize } from '../morse/text.ts';
import { el } from './dom.ts';

export function createOrnament(codeOf: (char: string) => string | undefined): HTMLElement {
  const ornament = el('div', { className: 'ornament' });
  ornament.setAttribute('aria-hidden', 'true');
  let step = 0;
  for (const token of tokenize(t('app.name'), codeOf)) {
    if (token.kind !== 'letter') continue;
    const letter = el('span', { className: 'ornament-letter' });
    for (const symbol of symbolsOf(token.code)) {
      const mark = el('span', { className: `ornament-${symbol}` });
      mark.style.setProperty('--step', String(step++));
      letter.append(mark);
    }
    ornament.append(letter);
  }
  ornament.style.setProperty('--steps', String(step));
  return ornament;
}
