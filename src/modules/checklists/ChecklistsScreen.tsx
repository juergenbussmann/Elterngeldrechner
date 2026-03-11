import React, { useState, useEffect } from 'react';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { useBegleitungPlus } from '../../core/begleitungPlus';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { getAllUserChecklists, SYS_IDS } from './checklistsService';
import type { Checklist } from '../../../shared/storage/checklistsDb';
import './ChecklistsScreen.css';
import './styles/softpill-buttons-in-cards.css';
import './styles/softpill-cards.css';

export const ChecklistsScreen: React.FC = () => {
  const { t } = useI18n();
  const { goTo } = useNavigation();
  const { isPlus } = useBegleitungPlus();
  const [userChecklists, setUserChecklists] = useState<Checklist[]>([]);

  useEffect(() => {
    if (isPlus) {
      getAllUserChecklists().then(setUserChecklists);
    }
  }, [isPlus]);

  return (
    <div className="screen-placeholder checklists-screen">
      <section className="next-steps next-steps--plain checklists__section">
        <SectionHeader as="h1" title={t('checklists.title')} />
        {isPlus && userChecklists.filter((c) => c.baseId !== SYS_IDS.geburt).length > 0 && (
          <section className="checklists__rubric" style={{ marginBottom: '1rem' }}>
            <SectionHeader as="h2" title={t('checklists.meine.title')} />
            <div className="next-steps__stack checklists__nav">
              {userChecklists
                .filter((c) => c.baseId !== SYS_IDS.geburt)
                .map((c) => (
                <a
                  key={c.id}
                  href={`/checklists/meine/${encodeURIComponent(c.id)}`}
                  className="next-steps__button btn--softpill checklists__nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(`/checklists/meine/${encodeURIComponent(c.id)}`);
                  }}
                >
                  {c.title}
                </a>
              ))}
            </div>
          </section>
        )}
        <div className="next-steps__stack checklists__nav">
          <a
            href="/checklists/schwangerschaft"
            className="next-steps__button btn--softpill checklists__nav-link"
            onClick={(e) => {
              e.preventDefault();
              goTo('/checklists/schwangerschaft');
            }}
          >
            {t('nav.pregnancy')}
          </a>
          <a
            href="/checklists/geburt"
            className="next-steps__button btn--softpill checklists__nav-link"
            onClick={(e) => {
              e.preventDefault();
              goTo('/checklists/geburt');
            }}
          >
            {t('nav.birth')}
          </a>
          <a
            href="/checklists/stillen"
            className="next-steps__button btn--softpill checklists__nav-link"
            onClick={(e) => {
              e.preventDefault();
              goTo('/checklists/stillen');
            }}
          >
            {t('stillDaily.title')}
          </a>
        </div>
      </section>
    </div>
  );
};
