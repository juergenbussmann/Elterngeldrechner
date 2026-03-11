import React, { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Card } from '../../shared/ui/Card';
import { TextInput } from '../../shared/ui/TextInput';
import { TextArea } from '../../shared/ui/TextArea';
import { Button } from '../../shared/ui/Button';
import { List, ListItem } from '../../shared/ui/List';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { usePipeline, type PipelineDefinition } from '../../shared/lib/pipeline';
import { runAiTask, type AiRequest, type AiResult } from '../../shared/lib/ai';
import { trackEvent } from '../../shared/lib/telemetry';

type PipelineInput = { query: string; refresh?: boolean };
type PipelineItem = { id: string; title: string; value: string };
type PipelineOutput = { items: PipelineItem[]; summary?: string };

// TODO: vervang met de definitieve module-id.
const MODULE_ID = '__MODULE_ID__';
// TODO: pas pipeline-id aan zodat hij uniek is binnen de app.
const PIPELINE_ID = 'module-__MODULE_ID__';
// TODO: kies een AI task type dat past bij je use-case.
const AI_TASK_TYPE = 'module-__MODULE_ID__-summarization';

const examplePipeline: PipelineDefinition<PipelineInput, PipelineOutput> = {
  id: PIPELINE_ID,
  description: 'Pipeline placeholder - vervang met echte stappen.',
  run: async (input, ctx) => {
    ctx.track('pipeline_start', { moduleId: MODULE_ID, queryLength: input.query.length });

    // TODO: vervang deze stub door echte pipeline-stappen (API-calls, transforms, etc.).
    const items: PipelineItem[] = input.query
      ? [
          { id: '1', title: `${input.query} #1`, value: 'Example pipeline result' },
          { id: '2', title: `${input.query} #2`, value: 'Another result' },
        ]
      : [];

    ctx.track('pipeline_success', { moduleId: MODULE_ID, itemCount: items.length });
    return { items };
  },
};

export const __MODULE_NAME__Module: React.FC = () => {
  const { t } = useI18n();
  const { openModuleSettings } = useNavigation();

  const [query, setQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState<AiResult | undefined>(undefined);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>(undefined);

  const { run: runPipeline, lastJob, isRunning, error } = usePipeline<PipelineInput, PipelineOutput>(
    examplePipeline,
  );

  const handlePipelineSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      await runPipeline({ query: trimmed, refresh: true });
    },
    [query, runPipeline],
  );

  const handleAiSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = aiInput.trim();
      if (!trimmed) return;

      setIsAiRunning(true);
      setAiError(undefined);

      const request: AiRequest = {
        type: AI_TASK_TYPE,
        input: trimmed,
        // TODO: voeg prompt/metadata toe passend bij je taak.
      };

      try {
        const result = await runAiTask(request);
        setAiResult(result);
        trackEvent('module_ai_task_success', { moduleId: MODULE_ID, type: AI_TASK_TYPE });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setAiError(message);
        trackEvent('module_ai_task_error', { moduleId: MODULE_ID, type: AI_TASK_TYPE, message });
      } finally {
        setIsAiRunning(false);
      }
    },
    [aiInput],
  );

  const pipelineItems = useMemo(() => lastJob?.output?.items ?? [], [lastJob]);

  return (
    <section aria-labelledby="module-title">
      <Card>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div>
            <h3 id="module-title" style={{ margin: 0 }}>
              {t('modules.__MODULE_ID__.title')}
            </h3>
            <p style={{ margin: 0 }}>{t('modules.__MODULE_ID__.description')}</p>
          </div>
          <Button variant="secondary" onClick={() => openModuleSettings(MODULE_ID)}>
            {t('modules.__MODULE_ID__.form.settingsCta')}
          </Button>
        </header>

        {/* 1) Input / filter */}
        <form
          onSubmit={handlePipelineSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}
        >
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>
              {t('modules.__MODULE_ID__.form.queryLabel')}
            </span>
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('modules.__MODULE_ID__.form.queryPlaceholder')}
            />
          </label>
          <Button type="submit" variant="primary" disabled={isRunning}>
            {isRunning
              ? t('modules.__MODULE_ID__.form.loadingLabel')
              : t('modules.__MODULE_ID__.form.runPipeline')}
          </Button>
          {error && <p className="settings-layout__muted">{error}</p>}
        </form>

        {/* 2) Pipeline-resultaat */}
        <section aria-label={t('modules.__MODULE_ID__.results.ariaLabel')}>
          {pipelineItems.length > 0 ? (
            <List>
              {pipelineItems.map((item) => (
                <ListItem key={item.id}>
                  <strong>{item.title}</strong>
                  <p style={{ margin: 0 }}>{item.value}</p>
                </ListItem>
              ))}
            </List>
          ) : (
            <p style={{ margin: 0 }}>{t('modules.__MODULE_ID__.results.emptyState')}</p>
          )}
        </section>
      </Card>

      {/* 3) AI-summary-blok */}
      <Card style={{ marginTop: 12 }}>
        <form
          onSubmit={handleAiSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}
        >
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>
              {t('modules.__MODULE_ID__.ai.inputLabel')}
            </span>
            <TextArea
              rows={3}
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              placeholder={t('modules.__MODULE_ID__.ai.inputPlaceholder')}
            />
          </label>
          <Button type="submit" variant="primary" disabled={isAiRunning}>
            {isAiRunning
              ? t('modules.__MODULE_ID__.ai.loadingLabel')
              : t('modules.__MODULE_ID__.ai.runTask')}
          </Button>
          {aiError && <p className="settings-layout__muted">{aiError}</p>}
        </form>

        {aiResult ? (
          <section aria-label={t('modules.__MODULE_ID__.ai.resultAria')}>
            <h4 style={{ marginTop: 0 }}>{t('modules.__MODULE_ID__.ai.resultTitle')}</h4>
            <p style={{ margin: 0 }}>{aiResult.output}</p>
          </section>
        ) : (
          <p style={{ margin: 0 }}>{t('modules.__MODULE_ID__.ai.emptyState')}</p>
        )}
      </Card>
    </section>
  );
};

