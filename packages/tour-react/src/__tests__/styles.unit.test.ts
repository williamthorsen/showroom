import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const STYLES = readFileSync(path.join(import.meta.dirname, '../../styles.css'), 'utf8');

const MOTION_QUERY = /@media\s*\(prefers-reduced-motion:\s*no-preference\)/;

describe('styles.css', () => {
  it('declares every animation and transition inside the no-preference motion query', () => {
    const outside = parseDeclarations(STYLES).filter(
      ({ property, context }) =>
        /^(animation|transition)/.test(property) && context.every((prelude) => !MOTION_QUERY.test(prelude)),
    );

    expect(outside).toStrictEqual([]);
  });

  it('does not repeat any animation forever', () => {
    expect(STYLES).not.toMatch(/\binfinite\b/);
  });

  it('prefixes every class with `tour-`', () => {
    const classes = parseDeclarations(STYLES)
      .flatMap(({ context }) => context)
      .filter((prelude) => !prelude.startsWith('@'))
      .flatMap((selector) =>
        selector
          .matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)
          .map((match) => match[1] ?? '')
          .toArray(),
      );

    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((name) => !name.startsWith('tour-'))).toStrictEqual([]);
  });

  it('declares a dark set of the colours', () => {
    expect(STYLES).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{[^}]*--tour-surface:/);
  });

  // A class selector outranks the universal selector of a host reset such as `* { margin: 0 }`.
  it('centres the dialog by declarations of its own', () => {
    const placement = parseDeclarations(STYLES)
      .filter(({ context, property }) => context.join(' ') === '.tour-dialog' && /^(inset|margin)$/.test(property))
      .map(({ property, value }) => [property, value]);

    expect(Object.fromEntries(placement)).toStrictEqual({ inset: '0', margin: 'auto' });
  });

  it('declares the bullets of the points, so that a host reset of `list-style` does not remove them', () => {
    const bullets = parseDeclarations(STYLES).filter(
      ({ context, property }) => context.join(' ') === '.tour-points' && property === 'list-style-type',
    );

    expect(bullets.map(({ value }) => value)).toStrictEqual(['disc']);
  });
});

// region | Helpers

interface Declaration {
  property: string;
  value: string;
  /** The preludes of the blocks that enclose the declaration, outermost first. */
  context: readonly string[];
}

/** Lists each declaration with the preludes of its enclosing blocks, by a scan of brace depth. */
function parseDeclarations(css: string): Declaration[] {
  const source = css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
  const declarations: Declaration[] = [];
  const context: string[] = [];
  let buffer = '';
  for (const character of source) {
    if (character === '{') {
      context.push(buffer.trim());
      buffer = '';
    } else if (character === '}' || character === ';') {
      const match = /^\s*([-\w]+)\s*:([\s\S]*)$/.exec(buffer);
      if (match?.[1] !== undefined) {
        declarations.push({ property: match[1], value: (match[2] ?? '').trim(), context: [...context] });
      }
      buffer = '';
      if (character === '}') context.pop();
    } else {
      buffer += character;
    }
  }
  return declarations;
}

// endregion | Helpers
