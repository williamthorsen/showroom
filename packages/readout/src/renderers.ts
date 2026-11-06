/** A map from each type of value to the value's shape, in which each value names its own type. */
export type TypedValues<M> = { [K in keyof M]: { type: K } };

/** One renderer per type in the map, so that the typecheck reports a type without one; each returns the form `R`. */
export type Renderers<M extends TypedValues<M>, R = string> = {
  [K in keyof M & string]: (value: M[K]) => R;
};

/** Renders a value through the renderer for its type. */
export function render<M extends TypedValues<M>, K extends keyof M & string, R>(
  value: M[K] & { type: K },
  renderers: Renderers<M, R>,
): R {
  return renderers[value.type](value);
}
