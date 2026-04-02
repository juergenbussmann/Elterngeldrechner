/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ElterngeldApplicationFormFillHelperPreview } from './ElterngeldApplicationFormFillHelperPreview';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { SECTION_A_TITLE, SUBSECTION_CALCULATION } from './elterngeldApplicationFormLabels';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('ElterngeldApplicationFormFillHelperPreview', () => {
  it('zeigt den formularnahen Hauptteil (A) inkl. Schätzungsunterabschnitt ohne separaten Block „B.“', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'HE',
      child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    });
    render(<ElterngeldApplicationFormFillHelperPreview model={model} />);
    expect(screen.getByText(SECTION_A_TITLE)).toBeTruthy();
    expect(screen.getByText(SUBSECTION_CALCULATION)).toBeTruthy();
  });
});
