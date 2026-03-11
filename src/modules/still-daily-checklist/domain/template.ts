import React from 'react';
import type { ChecklistItem } from './types';

export const stillDailyChecklistTemplate: ChecklistItem[] = [
  { id: 'hydration', label: 'Ausreichend getrunken' },
  { id: 'food', label: 'Regelmäßig gegessen / Snack parat' },
  { id: 'position', label: 'Bequeme Stillposition / Anlegen geprüft', description: 'Verschiedene Positionen entlasten und können Schmerzen vermeiden.' },
  { id: 'comfort', label: 'Brustkomfort: bei Spannung entlastet (Stillen/ausstreichen)' },
  { id: 'rest', label: 'Ruhepause eingeplant (auch kurz)' },
  { id: 'diapers', label: 'Windeln im Blick (nasse Windeln heute beobachtet)' },
  { id: 'gear', label: 'Stilleinlagen/Spucktuch/Wasser bereit' },
  {
    id: 'help',
    label: React.createElement(
      'a',
      { href: 'tel:01601749534' },
      'Jacqueline Tinz: 01601749534',
    ),
    description: 'Kontaktdaten von Hebamme oder Stillberatung bereithalten, falls Fragen oder Schmerzen auftreten.',
  },
];
