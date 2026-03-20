import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { usePanels } from '../../../shared/lib/panels';
import { StillDailyChecklistPage } from '../../still-daily-checklist/ui/StillDailyChecklistPage';
import { loadState } from '../../still-daily-checklist/infra/storage';
import { stillDailyChecklistTemplate } from '../../still-daily-checklist/domain/template';
import {
  getDisplayChecklist,
  createOverrideFromSystem,
  buildStillenSystemDef,
} from '../checklistsService';
import { Button } from '../../../shared/ui/Button';
import '../ChecklistsScreen.css';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

export const ChecklistsBreastfeedingPage: React.FC = () => {
  const { t } = useI18n();
  const { isPlus } = useBegleitungPlus();
  const { goTo } = useNavigation();
  const { openBottomSheet } = usePanels();

  useEffect(() => {
    if (!isPlus) return;
    const systemDef = buildStillenSystemDef(t('stillDaily.title'), stillDailyChecklistTemplate);
    getDisplayChecklist(systemDef).then((display) => {
      if (display && 'baseId' in display && display.baseId) {
        goTo(`/checklists/meine/${encodeURIComponent(display.id)}`);
      }
    });
  }, [isPlus, t, goTo]);

  const handleBearbeiten = async () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({ reason: 'checklists_edit_detail_breastfeeding', feature: 'EXPORT' });
      return;
    }
    try {
      const systemDef = buildStillenSystemDef(t('stillDaily.title'), stillDailyChecklistTemplate);
      const display = await getDisplayChecklist(systemDef);
      let overrideId: string;
      if (display && 'baseId' in display && display.baseId) {
        overrideId = display.id;
      } else {
        const override = await createOverrideFromSystem(systemDef);
        overrideId = override.id;
      }
      goTo(`/checklists/meine/${encodeURIComponent(overrideId)}`, { state: { edit: true } });
    } catch {
      openBegleitungPlusUpsell({ reason: 'checklist_edit', feature: 'EXPORT' });
    }
  };

  const handleExportClick = () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({ reason: 'export', feature: 'EXPORT' });
      return;
    }
    const stillState = loadState();
    openBottomSheet('export', {
      scope: 'checklists',
      data: { stillen: stillState ?? { items: {}, updatedAt: 0 } },
    });
  };

  return (
    <div className="screen-placeholder checklists-screen">
      <section className="checklists__rubric">
        <StillDailyChecklistPage backTo="/checklists" />
      </section>
      <div className="next-steps__stack checklist-actions">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={handleBearbeiten}
        >
          {t('checklists.bearbeiten')}
        </Button>
        <a
          href="#"
          role="button"
          className="next-steps__button btn--softpill checklists__nav-link"
          onClick={(e) => {
            e.preventDefault();
            handleExportClick();
          }}
        >
          {t('export.button')}
        </a>
      </div>
    </div>
  );
};
