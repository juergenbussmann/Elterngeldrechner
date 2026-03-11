import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children', () => {
    const html = renderToString(<Button>Click me</Button>);
    expect(html).toContain('Click me');
  });

  it('applies the given type attribute', () => {
    const html = renderToString(<Button type="submit">Submit</Button>);
    expect(html).toContain('type="submit"');
  });
});

