import type { Contact } from './types';
import { getItems, setItems } from '../storage';

const STORAGE_KEY = 'stillberatung.contacts.v1';

// System contact (must always exist and must not be deletable)
export const JACQUELINE_CONTACT_ID = 'system.jacqueline-tinz';

// Display + dial number conventions
const JACQUELINE_PHONE_DISPLAY = '';
const JACQUELINE_PHONE_DIAL = '';

const canonicalJacquelineContact = (): Contact => {
  const now = new Date().toISOString();
  return {
    id: JACQUELINE_CONTACT_ID,
    name: 'Jürgen Bußmann',
    phone: JACQUELINE_PHONE_DISPLAY,
    email: 'juergen@j-bussmann.de',
    relation: 'App-Ansprechpartner',
    notes: '',
    createdAt: now,
    updatedAt: now,
    protected: true,
  };
};

const toIsoNow = (): string => new Date().toISOString();

const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as Crypto).randomUUID();
    }
  } catch {
    // noop
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeText = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeContact = (input: Contact): Contact => {
  const now = toIsoNow();

  return {
    id: input.id || generateId(),
    name: normalizeText(input.name) ?? '',
    phone: normalizeText(input.phone),
    email: normalizeText(input.email),
    relation: normalizeText(input.relation),
    notes: normalizeText(input.notes),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    protected: Boolean(input.protected),
  };
};

const sortByName = (a: Contact, b: Contact): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

const ensureSystemContact = (contacts: Contact[]): Contact[] => {
  const now = toIsoNow();
  const sys = canonicalJacquelineContact();

  const existing = contacts.find((c) => c.id === JACQUELINE_CONTACT_ID);
  if (!existing) {
    // add system contact
    return [...contacts, { ...sys, createdAt: now, updatedAt: now }].sort(sortByName);
  }

  // enforce canonical fields (prevents editing via storage manipulation)
  const enforced: Contact = {
    ...existing,
    id: JACQUELINE_CONTACT_ID,
    name: sys.name,
    phone: sys.phone,
    email: sys.email,
    relation: sys.relation,
    protected: true,
  };

  const without = contacts.filter((c) => c.id !== JACQUELINE_CONTACT_ID);
  return [...without, enforced].sort(sortByName);
};

export const loadContacts = (): Contact[] => {
  try {
    const contacts = getItems<Contact>(STORAGE_KEY);
    const normalized = contacts
      .map((c) => normalizeContact(c))
      .filter((c) => Boolean(c.id) && Boolean(c.name))
      .sort(sortByName);
    return ensureSystemContact(normalized);
  } catch {
    // even if storage fails, we still provide the system contact to keep the UI useful
    return ensureSystemContact([]);
  }
};

export const saveContacts = (next: Contact[]): void => {
  try {
    // Always keep system contact present
    const safe = ensureSystemContact(next.map((c) => normalizeContact(c)));
    setItems(STORAGE_KEY, safe);
  } catch {
    // noop
  }
};

export const upsertContact = (
  contactInput: Partial<Omit<Contact, 'createdAt' | 'updatedAt'>> &
    Pick<Contact, 'name'> & { id?: string },
): Contact[] => {
  // System contact must not be editable via upsert
  if (contactInput.id === JACQUELINE_CONTACT_ID) {
    return loadContacts();
  }

  const prev = loadContacts();
  const now = toIsoNow();

  const normalizedName = normalizeText(contactInput.name) ?? '';
  if (!normalizedName) {
    // invalid input -> keep stable and return current list
    return prev;
  }

  const id = contactInput.id || generateId();
  const existing = prev.find((c) => c.id === id);
  const createdAt = existing?.createdAt || now;

  const updated: Contact = normalizeContact({
    id,
    name: normalizedName,
    phone: contactInput.phone,
    email: contactInput.email,
    relation: contactInput.relation,
    notes: contactInput.notes,
    createdAt,
    updatedAt: now,
  } as Contact);

  const without = prev.filter((c) => c.id !== id);
  const next = ensureSystemContact([...without, updated].sort(sortByName));
  saveContacts(next);
  return next;
};

export const deleteContact = (id: string): Contact[] => {
  // System contact must not be deletable
  if (id === JACQUELINE_CONTACT_ID) {
    return loadContacts();
  }
  const prev = loadContacts();
  const next = ensureSystemContact(prev.filter((c) => c.id !== id).sort(sortByName));
  saveContacts(next);
  return next;
};

export const getJacquelineDialNumber = (): string => JACQUELINE_PHONE_DIAL;
