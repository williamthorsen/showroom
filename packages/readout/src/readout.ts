/**
 * A result that a program shows to a person and also exposes as data, with the fields that the data leaves out unless
 * the caller asks for them. `redacted` is reserved, because the redacted form names the fields that it leaves out under
 * that key.
 */
export interface Readout<T extends ReadoutData> {
  data: T;
  /** The fields that a serialization leaves out by default and names under `redacted`, such as a credential. */
  sensitive: readonly (keyof T & string)[];
}

/** The data of a readout: an object without a field named `redacted`. */
export type ReadoutData = object & { redacted?: never };

/** How a readout is serialized. */
export interface SerializeOptions {
  /** Keeps every sensitive field and omits `redacted`. Off by default. */
  includeSensitive?: boolean;
}

/**
 * Returns the readout's data without its sensitive fields and with `redacted` naming each one that it leaves out, so
 * that a reader can tell a redacted field from an absent one. With `includeSensitive`, returns every field.
 */
export function redactReadout<T extends ReadoutData>(
  readout: Readout<T>,
  options: SerializeOptions = {},
): Record<string, unknown> {
  const sensitive = new Set<string>(options.includeSensitive === true ? [] : readout.sensitive);
  const kept: Record<string, unknown> = {};
  const redacted: string[] = [];
  for (const [key, value] of Object.entries(readout.data)) {
    if (sensitive.has(key)) redacted.push(key);
    else kept[key] = value;
  }
  return redacted.length > 0 ? { ...kept, redacted } : kept;
}

/** Serializes the readout as indented JSON, without its sensitive fields unless `includeSensitive` is set. */
export function serializeReadout<T extends ReadoutData>(readout: Readout<T>, options: SerializeOptions = {}): string {
  return JSON.stringify(redactReadout(readout, options), null, 2);
}
