/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseTelLinks } from './parseTelLinks';

describe('parseTelLinks', () => {
  it('converts the known broken tel pattern into a clickable tel: link', () => {
    const text = 'Bitte melde dich: (Jacqueline Tinz: 01601749534)(tel:01601749534) Danke!';
    render(<div data-testid="root">{parseTelLinks(text)}</div>);

    const link = screen.getByRole('link', { name: 'Jacqueline Tinz: 01601749534' });
    expect(link.getAttribute('href')).toBe('tel:01601749534');

    expect(screen.getByTestId('root').textContent).toBe(
      'Bitte melde dich: Jacqueline Tinz: 01601749534 Danke!',
    );
  });

  it('leaves text unchanged when there is no match', () => {
    const text = 'Kein Telefonlink hier.';
    render(<div data-testid="root">{parseTelLinks(text)}</div>);
    expect(screen.getByTestId('root').textContent).toBe(text);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('handles multiple occurrences', () => {
    const text =
      '(Jacqueline Tinz: 01601749534)(tel:01601749534) und nochmal (Jacqueline Tinz: 01601749534)(tel:01601749534)';
    render(<div data-testid="root">{parseTelLinks(text)}</div>);

    const links = screen.getAllByRole('link', { name: 'Jacqueline Tinz: 01601749534' });
    expect(links.length).toBe(2);
    for (const l of links) {
      expect(l.getAttribute('href')).toBe('tel:01601749534');
    }
  });
});
