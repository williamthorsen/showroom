import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const STYLES = readFileSync(path.join(import.meta.dirname, '../../styles.css'), 'utf8');

const MOTION_QUERY = /@media\s*\(prefers-reduced-motion:\s*no-preference\)/;

const THEMED_PROPERTIES = new Set([
  'background',
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'color',
  'height',
]);

// The visually hidden utility hides text rather than styling it.
const UNTHEMED_SELECTORS = new Set([':root', '.tank-visually-hidden']);

const UNTHEMED_VALUES = new Set(['0', 'currentColor', 'inherit', 'transparent']);

describe('styles.css', () => {
  it('declares every animation and transition inside the no-preference motion query', () => {
    const outside = parseDeclarations(STYLES).filter(
      ({ property, context }) =>
        /^(animation|transition)/.test(property) && context.every((prelude) => !MOTION_QUERY.test(prelude)),
    );

    expect(outside).toStrictEqual([]);
  });

  it('prefixes every class with `tank-`', () => {
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
    expect(classes.filter((name) => !name.startsWith('tank-'))).toStrictEqual([]);
  });

  it('declares a dark set of the colours', () => {
    expect(STYLES).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{[^}]*--tank-meter-fill:/);
  });

  it('takes every colour, size, and radius from a custom property', () => {
    const literal = parseDeclarations(STYLES).filter(
      ({ property, value, context }) =>
        THEMED_PROPERTIES.has(property) &&
        context.every((prelude) => !UNTHEMED_SELECTORS.has(prelude)) &&
        !UNTHEMED_VALUES.has(value) &&
        !value.includes('var('),
    );

    expect(literal).toStrictEqual([]);
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
