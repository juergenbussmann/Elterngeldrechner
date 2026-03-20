import { describe, expect, it } from 'vitest';
import { cloneItems, buildSystemDef, buildStillenSystemDef, SYS_IDS } from './checklistsService';

describe('checklistsService', () => {
  describe('cloneItems', () => {
    it('erzeugt neue IDs für jedes Item', () => {
      const systemItems = [
        { id: 'a', text: 'Item A' },
        { id: 'b', text: 'Item B' },
      ];
      const result = cloneItems(systemItems);
      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe('a');
      expect(result[1].id).not.toBe('b');
      expect(result[0].text).toBe('Item A');
      expect(result[1].text).toBe('Item B');
      expect(result[0].done).toBe(false);
      expect(result[1].done).toBe(false);
    });
  });

  describe('buildSystemDef', () => {
    it('mappt labelKey zu text via t()', () => {
      const t = (key: string) => `translated:${key}`;
      const items = [{ id: 'x', labelKey: 'key.x' }];
      const result = buildSystemDef('sys:test', 'Title', items, t);
      expect(result.id).toBe('sys:test');
      expect(result.title).toBe('Title');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({ id: 'x', text: 'translated:key.x' });
    });
  });

  describe('buildStillenSystemDef', () => {
    it('nutzt STILLEN_ITEM_TEXTS für bekannte IDs', () => {
      const result = buildStillenSystemDef('Stillen', [{ id: 'hydration' }, { id: 'food' }]);
      expect(result.id).toBe(SYS_IDS.stillen);
      expect(result.title).toBe('Stillen');
      expect(result.items[0].text).toBe('Ausreichend getrunken');
      expect(result.items[1].text).toBe('Regelmäßig gegessen / Snack parat');
    });
  });
});
