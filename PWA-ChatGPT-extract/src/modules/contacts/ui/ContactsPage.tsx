import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { LimitReachedBanner } from '../../../core/begleitungPlus/ui/LimitReachedBanner';
import {
  hasLimitTriggerBeenShownThisSession,
  markLimitTriggerShownThisSession,
} from '../../../core/begleitungPlus/upgradeTriggersStore';
import type { Contact } from '../../../shared/lib/contacts/types';
import {
  deleteContact,
  loadContacts,
  JACQUELINE_CONTACT_ID,
  getJacquelineDialNumber,
} from '../../../shared/lib/contacts/storage';
import './ContactsPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const toDigits = (value: string): string => value.replace(/[^\d+]/g, '');

const buildTelHref = (contact: Contact): string => {
  if (contact.id === JACQUELINE_CONTACT_ID) {
    return `tel:${getJacquelineDialNumber()}`;
  }
  const digits = toDigits(contact.phone ?? '');
  if (!digits) {
    return '';
  }
  const normalized = digits.startsWith('+') ? digits.slice(1) : digits;
  return `tel:${normalized}`;
};

const buildWhatsAppHref = (contact: Contact): string => {
  if (contact.id === JACQUELINE_CONTACT_ID) {
    return 'https://wa.me/491601749534';
  }
  const digits = toDigits(contact.phone ?? '');
  if (!digits) {
    return '';
  }
  const normalized = digits.startsWith('0') ? `49${digits.slice(1)}` : digits.replace(/^\+/, '');
  return `https://wa.me/${normalized}`;
};

export const ContactsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isPlus, limits } = useBegleitungPlus();
  const [contacts, setContacts] = React.useState<Contact[]>(() => loadContacts());
  const [query, setQuery] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<Contact | null>(null);

  const locked = !isPlus && contacts.length >= limits.contactsMax;
  const [limitBannerDismissed, setLimitBannerDismissed] = React.useState(false);
  const showLimitBanner =
    locked &&
    !hasLimitTriggerBeenShownThisSession('contacts') &&
    !limitBannerDismissed;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return contacts;
    }
    return contacts.filter((c) => {
      const haystack = [c.name, c.relation, c.phone, c.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contacts, query]);

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    if (deleteTarget.id === JACQUELINE_CONTACT_ID || deleteTarget.protected) {
      setDeleteTarget(null);
      return;
    }
    const next = deleteContact(deleteTarget.id);
    setContacts(next);
    setDeleteTarget(null);
  };

  const handleAddContact = () => {
    if (locked) {
      openBegleitungPlusUpsell({
        reason: 'limit_reached',
        feature: 'CONTACTS_UNLIMITED',
      });
      return;
    }
    navigate('/contacts/new');
  };

  const handleLimitBannerDismiss = () => {
    markLimitTriggerShownThisSession('contacts');
    setLimitBannerDismissed(true);
  };

  return (
    <div className="screen-placeholder contacts-screen">
      {showLimitBanner && (
        <div className="contacts__limit-banner">
          <LimitReachedBanner
            featureKey="CONTACTS_UNLIMITED"
            onDismiss={handleLimitBannerDismiss}
          />
        </div>
      )}
      <section className="next-steps next-steps--plain contacts__section">
        <SectionHeader as="h1" title={t('contacts.title')} />
        <div className="next-steps__stack contacts__toolbar-stack">
          <Card className="still-daily-checklist__card contacts__toolbar">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('contacts.search')}
              aria-label={t('contacts.search')}
              className="contacts__search-input"
            />
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={handleAddContact}
            >
              {t('contacts.add')}
            </Button>
          </Card>
        </div>
      </section>

      {deleteTarget && (
        <section className="contacts__composer-section">
          <Card className="still-daily-checklist__card contacts__composer-card">
            <h3 className="contacts__composer-title">{t('contacts.delete.confirmTitle')}</h3>
            <p className="contacts__delete-body">{t('contacts.delete.confirmBody')}</p>
            <div className="contacts__form-actions">
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={() => setDeleteTarget(null)}
              >
                {t('contacts.form.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleConfirmDelete}
              >
                {t('contacts.delete')}
              </Button>
            </div>
          </Card>
        </section>
      )}

      <section className="contacts__content-section">
        {filtered.length === 0 ? (
          <Card className="still-daily-checklist__card contacts__empty">
            <p className="contacts__empty-text">{t('contacts.empty')}</p>
          </Card>
        ) : (
          <div className="contacts__list">
            {filtered.map((contact) => (
              <Card key={contact.id} className="still-daily-checklist__card contacts__item">
                <div className="contacts__item-header">
                  <div>
                    <div className="contacts__name">{contact.name}</div>
                    {contact.relation ? (
                      <div className="contacts__meta">{contact.relation}</div>
                    ) : null}
                  </div>
                  <div className="contacts__actions">
                    {(contact.phone || contact.id === JACQUELINE_CONTACT_ID) && (
                      <a
                        className="contacts__whatsapp"
                        href={buildWhatsAppHref(contact)}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="secondary"
                          className="next-steps__button btn--softpill"
                        >
                          {t('contacts.whatsapp')}
                        </Button>
                      </a>
                    )}

                    {contact.id !== JACQUELINE_CONTACT_ID && !contact.protected ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="next-steps__button btn--softpill"
                        onClick={() => navigate(`/contacts/edit/${contact.id}`)}
                      >
                        {t('contacts.edit')}
                      </Button>
                    ) : null}
                    {contact.id !== JACQUELINE_CONTACT_ID && !contact.protected ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="next-steps__button btn--softpill"
                        onClick={() => setDeleteTarget(contact)}
                      >
                        {t('contacts.delete')}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {(contact.phone || contact.email) && (
                  <div className="contacts__details">
                    {contact.phone ? (
                      <div className="contacts__meta">
                        <a
                          className="tel-link"
                          href={buildTelHref(contact)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.phone}
                        </a>
                      </div>
                    ) : null}
                    {contact.email ? (
                      <div className="contacts__meta">
                        <a
                          className="contacts__email-link"
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.email}
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}

                {contact.notes ? (
                  <div className="contacts__notes">{contact.notes}</div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
