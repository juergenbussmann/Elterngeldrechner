/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ElternArbeitPartTimeEditor, PartTimeWeeklyHoursField } from './PartTimeWeeklyHoursField';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION, EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

describe('PartTimeWeeklyHoursField', () => {
  it('ruft onHoursChange bei Eingabe auf', () => {
    const onHoursChange = vi.fn();
    render(<PartTimeWeeklyHoursField hoursPerWeek={28} onHoursChange={onHoursChange} />);
    const input = screen.getByPlaceholderText('z.B. 30');
    fireEvent.change(input, { target: { value: '30' } });
    expect(onHoursChange).toHaveBeenCalledWith(30);
  });
});

describe('ElternArbeitPartTimeEditor', () => {
  it('zeigt Teilzeit-Checkbox und übernimmt Aktivierung in den zentralen State', () => {
    const onChange = vi.fn();
    const values: ElterngeldApplication = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, plannedPartTime: false },
    };
    render(<ElternArbeitPartTimeEditor values={values} onChange={onChange} />);
    const boxes = screen.getAllByRole('checkbox', { name: /Geplante Teilzeit nach Geburt/i });
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(boxes[0]);
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as ElterngeldApplication;
    expect(next.parentA.plannedPartTime).toBe(true);
  });

  it('zeigt Wochenstundenfeld nach Aktivierung und schreibt Stunden in den State', () => {
    const onChange = vi.fn();
    const values: ElterngeldApplication = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        plannedPartTime: true,
        hoursPerWeek: 28,
      },
    };
    render(<ElternArbeitPartTimeEditor values={values} onChange={onChange} />);
    const input = screen.getByPlaceholderText('z.B. 30');
    fireEvent.change(input, { target: { value: '29' } });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[onChange.mock.calls.length - 1][0] as ElterngeldApplication;
    expect(next.parentA.hoursPerWeek).toBe(29);
  });

  it('zeigt Partner-Teilzeit bei both_parents', () => {
    const onChange = vi.fn();
    const values: ElterngeldApplication = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents',
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, plannedPartTime: false },
      parentB: { ...EMPTY_ELTERNGELD_PARENT, plannedPartTime: false },
    };
    render(<ElternArbeitPartTimeEditor values={values} onChange={onChange} />);
    const boxes = screen.getAllByRole('checkbox', { name: /Geplante Teilzeit nach Geburt/i });
    expect(boxes.length).toBe(2);
  });
});
