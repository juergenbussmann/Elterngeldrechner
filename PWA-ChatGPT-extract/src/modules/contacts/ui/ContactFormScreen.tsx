import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { TextArea } from '../../../shared/ui/TextArea';
import { useI18n } from '../../../shared/lib/i18n';
import {
  loadContacts,
  upsertContact,
  JACQUELINE_CONTACT_ID,
} from '../../../shared/lib/contacts/storage';
import { incrementProgressActionCount } from '../../../core/begleitungPlus/upgradeTriggersStore';
import './ContactsPage.css';
import './ContactFormScreen.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

type ContactDraft = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  relation: string;
  notes: string;
};

const emptyDraft = (): ContactDraft => ({
  name: '',
  phone: '',
  email: '',
  relation: '',
  notes: '',
});

const isValidEmail = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

export const ContactFormScreen: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [draft, setDraft] = React.useState<ContactDraft>(() => emptyDraft());
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    const contacts = loadContacts();
    const contact = contacts.find((c) => c.id === id);
    if (contact && contact.id !== JACQUELINE_CONTACT_ID && !contact.protected) {
      setDraft({
        id: contact.id,
        name: contact.name ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        relation: contact.relation ?? '',
        notes: contact.notes ?? '',
      });
    }
  }, [id]);

  const handleSave = () => {
    if (draft.id === JACQUELINE_CONTACT_ID) {
      navigate('/contacts', { replace: true });
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      setFormError(t('validation.required'));
      return;
    }
    if (!isValidEmail(draft.email)) {
      setFormError(t('contacts.validation.invalidEmail'));
      return;
    }
    upsertContact({
      id: draft.id,
      name,
      phone: draft.phone,
      email: draft.email,
      relation: draft.relation,
      notes: draft.notes,
    });
    incrementProgressActionCount();
    navigate('/contacts', { replace: true });
  };

  const handleCancel = () => {
    navigate('/contacts', { replace: true });
  };

  return (
    <div className="screen-placeholder form-screen form-screen--scroll">
      <section className="form-screen__section">
        <h1 className="form-screen__title">
          {draft.id ? t('contacts.edit') : t('contacts.add')}
        </h1>
        <Card className="still-daily-checklist__card contacts__composer-card">
          <div className="contacts__form">
            <label className="contacts__label">
              {t('contacts.form.name')}
              <TextInput
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </label>
            <label className="contacts__label">
              {t('contacts.form.relation')}
              <TextInput
                value={draft.relation}
                onChange={(e) => setDraft((prev) => ({ ...prev, relation: e.target.value }))}
              />
            </label>
            <label className="contacts__label">
              {t('contacts.form.phone')}
              <TextInput
                value={draft.phone}
                onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                inputMode="tel"
              />
            </label>
            <label className="contacts__label">
              {t('contacts.form.email')}
              <TextInput
                value={draft.email}
                onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                inputMode="email"
              />
            </label>
            <label className="contacts__label">
              {t('contacts.form.notes')}
              <TextArea
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </label>
            {formError ? <div className="contacts__error">{formError}</div> : null}
            <div className="contacts__form-actions">
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleCancel}
              >
                {t('contacts.form.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleSave}
              >
                {t('contacts.form.save')}
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
