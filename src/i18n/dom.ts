// Translated text in the DOM: each element remembers its key in data-i18n*
// attributes, so that a change of language only has to walk the document
// (relocalize) instead of rebuilding it.
import { t, type MessageKey, type Params } from './index.ts';

type Target = HTMLElement | SVGElement;
type Attribute = 'aria-label' | 'title' | 'placeholder';

function setParams(node: Target, params?: Params): void {
  if (params) node.dataset.i18nParams = JSON.stringify(params);
  else delete node.dataset.i18nParams;
}

/** Sets the text of the node to the message, and keeps it translated. */
export function tText(node: Target, key: MessageKey, params?: Params): void {
  node.dataset.i18n = key;
  setParams(node, params);
  node.textContent = t(key, params);
}

/** Sets an attribute of the node to the message, and keeps it translated. */
export function tAttr(node: Target, attribute: Attribute, key: MessageKey, params?: Params): void {
  node.setAttribute(`data-i18n-${attribute}`, key);
  setParams(node, params);
  node.setAttribute(attribute, t(key, params));
}

/** Translates again every node under root, after a change of language. */
export function relocalize(root: ParentNode = document): void {
  const nodes = root.querySelectorAll<Target>(
    '[data-i18n], [data-i18n-aria-label], [data-i18n-title], [data-i18n-placeholder]',
  );
  for (const node of nodes) {
    const params = node.dataset.i18nParams
      ? (JSON.parse(node.dataset.i18nParams) as Params)
      : undefined;
    const text = node.dataset.i18n as MessageKey | undefined;
    if (text) node.textContent = t(text, params);
    for (const attribute of ['aria-label', 'title', 'placeholder'] as const) {
      const key = node.getAttribute(`data-i18n-${attribute}`) as MessageKey | null;
      if (key) node.setAttribute(attribute, t(key, params));
    }
  }
}
