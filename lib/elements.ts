import type { ElementType } from '@/lib/magia-types';

/** The four classical elements in display order, with the ElementsIcon palette. */
export const ELEMENT_ORDER: ElementType[] = ['tuz', 'levego', 'viz', 'fold'];

export const ELEMENT_COLORS: Record<ElementType, string> = {
  tuz: '#E0533F', // fire
  levego: '#4A8DDC', // air
  viz: '#36A372', // water
  fold: '#E3B23C', // earth
};

/** messages key (magia namespace) of each element's label */
export const ELEMENT_LABEL_KEYS: Record<ElementType, string> = {
  tuz: 'soulMirrorElementFire',
  levego: 'soulMirrorElementAir',
  viz: 'soulMirrorElementWater',
  fold: 'soulMirrorElementEarth',
};

/** "🔥 Tűz" → "Tűz", for use inside sentences. */
export const plainElementName = (label: string) => label.replace(/^[^\p{L}]+/u, '');
