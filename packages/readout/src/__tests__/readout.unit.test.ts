import { describe, expect, it } from 'vitest';

import { type Readout, redactReadout, serializeReadout } from '../readout.ts';

const READOUT: Readout<{ id: string; apiToken: string }> = {
  data: { id: 'tok-1', apiToken: 'ATATT-TOKEN' },
  sensitive: ['apiToken'],
};

describe('redactReadout', () => {
  it('leaves out each sensitive field and names it under redacted', () => {
    expect(redactReadout(READOUT)).toStrictEqual({ id: 'tok-1', redacted: ['apiToken'] });
  });

  it('keeps every field and omits redacted when sensitive fields are included', () => {
    expect(redactReadout(READOUT, { includeSensitive: true })).toStrictEqual({ id: 'tok-1', apiToken: 'ATATT-TOKEN' });
  });

  it('returns a readout without sensitive fields unchanged, whether or not they are included', () => {
    const readout: Readout<{ id: string }> = { data: { id: 'tok-1' }, sensitive: [] };

    expect(redactReadout(readout)).toStrictEqual({ id: 'tok-1' });
    expect(redactReadout(readout, { includeSensitive: true })).toStrictEqual({ id: 'tok-1' });
  });

  it('rejects data with a field named redacted', () => {
    // @ts-expect-error -- `redacted` is reserved for the names of the fields that a serialization leaves out.
    const readout: Readout<{ redacted: string }> = { data: { redacted: 'x' }, sensitive: [] };

    expect(readout.data.redacted).toBe('x');
  });
});

describe('serializeReadout', () => {
  it('serializes the redacted data as indented JSON', () => {
    const json = serializeReadout(READOUT);

    expect(json).toBe(JSON.stringify({ id: 'tok-1', redacted: ['apiToken'] }, null, 2));
    expect(json).not.toContain('ATATT-TOKEN');
  });

  it('serializes sensitive fields only when they are included', () => {
    expect(serializeReadout(READOUT, { includeSensitive: true })).toContain('ATATT-TOKEN');
  });
});
