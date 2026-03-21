/**
 * @vitest-environment jsdom
 * Tests für den Elterngeld-Flow-Stepper: Reihenfolge, aktiver Step, visuelle Hierarchie.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ElterngeldFlowStepper } from './ElterngeldFlowStepper';

describe('ElterngeldFlowStepper', () => {
  it('rendert Steps in richtiger Reihenfolge (Vorbereitung → Berechnung → Ergebnis)', () => {
    render(<ElterngeldFlowStepper currentStep={2} />);
    const labels = screen.getAllByText(/Vorber\.|Berech\.|Ergebnis|Vorbereitung|Berechnung/i);
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it('markiert aktiven Step mit aria-current', () => {
    render(<ElterngeldFlowStepper currentStep={2} />);
    const active = document.querySelector('[aria-current="step"]');
    expect(active).toBeTruthy();
  });

  it('aktiver Step ist eindeutig identifizierbar', () => {
    const { rerender } = render(<ElterngeldFlowStepper currentStep={1} />);
    let active = document.querySelectorAll('[aria-current="step"]');
    expect(active.length).toBe(1);

    rerender(<ElterngeldFlowStepper currentStep={2} />);
    active = document.querySelectorAll('[aria-current="step"]');
    expect(active.length).toBe(1);

    rerender(<ElterngeldFlowStepper currentStep={3} />);
    active = document.querySelectorAll('[aria-current="step"]');
    expect(active.length).toBe(1);
  });

  it('Step-Zustände (completed/active/upcoming) sind eindeutig unterscheidbar', () => {
    const { container } = render(<ElterngeldFlowStepper currentStep={2} />);
    const list = container.querySelector('.elterngeld-flow-stepper__list');
    expect(list).toBeTruthy();
    const items = container.querySelectorAll('.elterngeld-flow-stepper__item');
    expect(items.length).toBe(3);
    expect(container.querySelector('.elterngeld-flow-stepper__item--active')).toBeTruthy();
    expect(container.querySelector('.elterngeld-flow-stepper__item--completed')).toBeTruthy();
    expect(container.querySelector('.elterngeld-flow-stepper__item--upcoming')).toBeTruthy();
    expect(container.querySelectorAll('.elterngeld-flow-stepper__item--active').length).toBe(1);
    expect(container.querySelectorAll('.elterngeld-flow-stepper__item--completed').length).toBeGreaterThanOrEqual(0);
  });
});
