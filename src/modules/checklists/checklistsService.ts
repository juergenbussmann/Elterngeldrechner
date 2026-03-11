/**
 * Service für Plus-Checklisten: Overrides, eigene Listen, CRUD.
 * Alle schreibenden Aktionen sind durch requirePlus() abgesichert.
 */

import {
  dbGetAll,
  dbGetById,
  dbGetOverrideByBaseId,
  dbUpsert,
  dbRemove,
  type Checklist,
  type ChecklistItem,
} from '../../shared/storage/checklistsDb';
import { requirePlus } from '../../core/begleitungPlus/isPlus';

export const SYS_IDS = {
  schwangerschaft: 'sys:schwangerschaft',
  geburt: 'sys:geburt',
  stillen: 'sys:stillen',
} as const;

/** Erstellt SystemChecklistDef aus Items mit labelKey (t wird vom Aufrufer übergeben). */
export function buildSystemDef(
  baseId: string,
  title: string,
  items: { id: string; labelKey: string }[],
  t: (key: string) => string,
): SystemChecklistDef {
  return {
    id: baseId,
    title,
    items: items.map((i) => ({ id: i.id, text: t(i.labelKey) })),
  };
}

/** Texte für Stillen-Template (label kann ReactNode sein). */
const STILLEN_ITEM_TEXTS: Record<string, string> = {
  hydration: 'Ausreichend getrunken',
  food: 'Regelmäßig gegessen / Snack parat',
  position: 'Bequeme Stillposition / Anlegen geprüft',
  comfort: 'Brustkomfort: bei Spannung entlastet (Stillen/ausstreichen)',
  rest: 'Ruhepause eingeplant (auch kurz)',
  diapers: 'Windeln im Blick (nasse Windeln heute beobachtet)',
  gear: 'Stilleinlagen/Spucktuch/Wasser bereit',
  help: 'Jacqueline Tinz: 01601749534',
};

export function buildStillenSystemDef(
  title: string,
  items: { id: string }[],
): SystemChecklistDef {
  return {
    id: SYS_IDS.stillen,
    title,
    items: items.map((i) => ({ id: i.id, text: STILLEN_ITEM_TEXTS[i.id] ?? i.id })),
  };
}

export type SystemChecklistDef = {
  id: string;
  title: string;
  items: { id: string; text: string }[];
};

function nowTs(): number {
  return Date.now();
}

function genId(): string {
  return `usr:${nowTs()}-${Math.random().toString(36).slice(2, 9)}`;
}

function genItemId(): string {
  return `item:${nowTs()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Klont System-Items zu ChecklistItem[] mit neuen IDs. */
export function cloneItems(
  systemItems: { id: string; text: string }[],
): ChecklistItem[] {
  const ts = nowTs();
  return systemItems.map((item) => ({
    id: genItemId(),
    text: item.text,
    done: false,
    createdAt: ts,
    updatedAt: ts,
  }));
}

export async function getOverrideForSystem(baseId: string): Promise<Checklist | null> {
  return dbGetOverrideByBaseId(baseId);
}

/**
 * Liefert die anzuzeigende Checkliste: Override falls vorhanden, sonst System-Definition.
 */
export async function getDisplayChecklist(
  systemChecklist: SystemChecklistDef,
): Promise<Checklist | SystemChecklistDef> {
  const override = await getOverrideForSystem(systemChecklist.id);
  if (override) {
    return override;
  }
  return systemChecklist;
}

/**
 * Erstellt Override aus System-Checkliste. Plus erforderlich.
 */
export async function createOverrideFromSystem(
  systemChecklist: SystemChecklistDef,
): Promise<Checklist> {
  requirePlus();
  const id = genId();
  const items = cloneItems(systemChecklist.items);
  const checklist: Checklist = {
    id,
    title: systemChecklist.title,
    items,
    system: false,
    baseId: systemChecklist.id,
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
  await dbUpsert(checklist);
  return checklist;
}

/**
 * Erstellt eigene Checkliste. Plus erforderlich.
 * Debug-Titel "Test" wird nicht erzeugt (verwendet Fallback).
 */
export async function createCustomChecklist(title: string): Promise<Checklist> {
  requirePlus();
  const trimmed = title.trim();
  const safeTitle =
    trimmed === '' || trimmed.toLowerCase() === 'test' ? 'Neue Checkliste' : trimmed;
  const id = genId();
  const checklist: Checklist = {
    id,
    title: safeTitle,
    items: [],
    system: false,
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
  await dbUpsert(checklist);
  return checklist;
}

export async function updateChecklistTitle(id: string, title: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(id);
  if (!c || c.system) return;
  await dbUpsert({
    ...c,
    title: title.trim() || c.title,
    updatedAt: nowTs(),
  });
}

export async function addItem(checklistId: string, text: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const item: ChecklistItem = {
    id: genItemId(),
    text: text.trim() || 'Neues Item',
    done: false,
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
  await dbUpsert({
    ...c,
    items: [...c.items, item],
    updatedAt: nowTs(),
  });
}

export async function toggleItem(checklistId: string, itemId: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const items = c.items.map((it) =>
    it.id === itemId ? { ...it, done: !it.done, updatedAt: nowTs() } : it,
  );
  await dbUpsert({ ...c, items, updatedAt: nowTs() });
}

export async function updateItemText(
  checklistId: string,
  itemId: string,
  text: string,
): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const items = c.items.map((it) =>
    it.id === itemId ? { ...it, text: text.trim() || it.text, updatedAt: nowTs() } : it,
  );
  await dbUpsert({ ...c, items, updatedAt: nowTs() });
}

export async function removeItem(checklistId: string, itemId: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const items = c.items.filter((it) => it.id !== itemId);
  await dbUpsert({ ...c, items, updatedAt: nowTs() });
}

/** Verschiebt ein Item von fromIndex nach toIndex (Reihenfolge ändern). */
export async function reorderItems(
  checklistId: string,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const items = [...c.items];
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return;
  const [removed] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, { ...removed, updatedAt: nowTs() });
  await dbUpsert({ ...c, items, updatedAt: nowTs() });
}

/** Setzt alle Items auf done=false („Alles zurücksetzen“ für eigene/Override-Listen). */
export async function resetAllItems(checklistId: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(checklistId);
  if (!c || c.system) return;
  const items = c.items.map((it) => ({ ...it, done: false, updatedAt: nowTs() }));
  await dbUpsert({ ...c, items, updatedAt: nowTs() });
}

export async function removeChecklist(id: string): Promise<void> {
  requirePlus();
  const c = await dbGetById(id);
  if (!c || c.system) return;
  await dbRemove(id);
}

/** Debug-Checkliste: wird beim Laden automatisch entfernt (Migration). */
function isTestChecklist(c: Checklist): boolean {
  const t = (c.title ?? '').trim().toLowerCase();
  const id = (c.id ?? '').trim().toLowerCase();
  return t === 'test' || id === 'test';
}

export async function getAllUserChecklists(): Promise<Checklist[]> {
  const all = await dbGetAll();
  const userChecklists = all.filter((c) => !c.system);
  const testOnes = userChecklists.filter(isTestChecklist);
  if (testOnes.length > 0) {
    for (const t of testOnes) {
      await dbRemove(t.id);
    }
  }
  return userChecklists.filter((c) => !isTestChecklist(c));
}
