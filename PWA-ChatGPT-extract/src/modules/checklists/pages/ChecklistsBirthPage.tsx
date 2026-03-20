import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { usePanels } from '../../../shared/lib/panels';
import { ChecklistRubricSection } from '../ui/ChecklistRubricSection';
import { geburtItems } from '../domain/checklistItems';
import { getInitialState, mergeWithTemplate, toggle, setAll } from '../../still-daily-checklist/application/service';
import { getValue, setValue } from '../../../shared/lib/storage';
import { incrementProgressActionCount } from '../../../core/begleitungPlus/upgradeTriggersStore';
import {
  getDisplayChecklist,
  createOverrideFromSystem,
  buildSystemDef,
  SYS_IDS,
} from '../checklistsService';
import { Button } from '../../../shared/ui/Button';
import type { ChecklistState } from '../../still-daily-checklist/domain/types';
import '../ChecklistsScreen.css';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

const CHECKLIST_GEBURT_KEY = 'checklistGeburtState.v1';

const loadCustomState = (key: string): ChecklistState | null =>
  getValue<ChecklistState>(key) ?? null;

const saveCustomState = (key: string, state: ChecklistState): void => {
  setValue(key, state);
};

export const ChecklistsBirthPage: React.FC = () => {
  const { t } = useI18n();
  const { isPlus } = useBegleitungPlus();
  const { goTo } = useNavigation();
  const { openBottomSheet } = usePanels();
  const [state, setState] = React.useState<ChecklistState>(() => {
    const template = geburtItems.map((i) => ({ id: i.id, label: i.labelKey }));
    return getInitialState(template);
  });

  React.useEffect(() => {
    const template = geburtItems.map((i) => ({ id: i.id, label: i.labelKey }));
    const loaded = loadCustomState(CHECKLIST_GEBURT_KEY);
    const merged = mergeWithTemplate(loaded, template);
    setState(merged);
    saveCustomState(CHECKLIST_GEBURT_KEY, merged);
  }, []);

  useEffect(() => {
    if (!isPlus) return;
    const systemDef = buildSystemDef(
      SYS_IDS.geburt,
      t('nav.birth'),
      [...geburtItems],
      t,
    );
    getDisplayChecklist(systemDef).then((display) => {
      if (display && 'baseId' in display && display.baseId) {
        goTo(`/checklists/meine/${encodeURIComponent(display.id)}`);
      }
    });
  }, [isPlus, t, goTo]);

  const handleBearbeiten = async () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({ reason: 'checklists_edit_detail_birth', feature: 'EXPORT' });
      return;
    }
    try {
      const systemDef = buildSystemDef(
        SYS_IDS.geburt,
        t('nav.birth'),
        [...geburtItems],
        t,
      );
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

  const handleToggle = (itemId: string) => {
    setState((prev) => {
      const next = toggle(prev, itemId);
      saveCustomState(CHECKLIST_GEBURT_KEY, next);
      incrementProgressActionCount();
      return next;
    });
  };

  const handleReset = () => {
    setState((prev) => {
      const next = setAll(prev, false);
      saveCustomState(CHECKLIST_GEBURT_KEY, next);
      return next;
    });
  };

  const handleExportClick = () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({ reason: 'export', feature: 'EXPORT' });
      return;
    }
    openBottomSheet('export', {
      scope: 'checklists',
      data: { geburt: state },
    });
  };

  return (
    <div className="screen-placeholder checklists-screen">
      <ChecklistRubricSection
        title={t('nav.birth')}
        items={geburtItems}
        state={state}
        onToggle={handleToggle}
        onReset={handleReset}
        t={t}
      />
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
