<!-- readme-type: library -->

# @williamthorsen/readout

One result object that a person and a machine both read: a redacting JSON serializer, a DOM-embedding helper, and typed renderers over the same object.

<!-- section:release-notes --><!-- /section:release-notes -->

```ts
import { type Readout, serializeReadout } from '@williamthorsen/readout';

const readout: Readout<{ id: string; secret: string }> = { data: { id: 'tok-1', secret: 'ATATT-…' }, sensitive: ['secret'] };
serializeReadout(readout); // {"id": "tok-1", "redacted": ["secret"]}, indented by two spaces
```

## Why

A result that an app shows to a person, such as a created token or a check's outcome, also has a reader that drives the app: an agent, a script, or an end-to-end test. When the result exists only as formatted text, that reader parses prose that changes whenever the wording does. `readout` keeps the result as one object in canonical values and renders every form from it, so that the forms cannot disagree. The convention that it implements is the `machine-readable-output-conventions` rulebook in [codeassembly-guidance](https://github.com/williamthorsen/codeassembly-guidance).

Hand-rolled `JSON.stringify` covers the machine form, but each call site then decides on its own what to leave out, and a secret reaches a page snapshot through the call site that forgot. A readout declares its sensitive fields once, in its type.

The package has no runtime dependency and uses neither DOM nor Node APIs, so it runs in a browser and in Node alike.

## One readout, two forms

```ts
import { embedJson, type Readout, render, type Renderers, serializeReadout } from '@williamthorsen/readout';

interface TokenCreated {
  type: 'created';
  id: string;
  expiresAt: string;
  secret: string;
}

const readout: Readout<TokenCreated> = {
  data: { type: 'created', id: 'tok-1', expiresAt: '2026-11-12T00:00:00Z', secret: 'ATATT-…' },
  sensitive: ['secret'],
};

// For a person: one renderer per type, which the typecheck holds to every type in the map.
const sentences: Renderers<{ created: TokenCreated }> = {
  created: (value) => `Created token ${value.id}, which expires on ${value.expiresAt.slice(0, 10)}`,
};
render(readout.data, sentences); // 'Created token tok-1, which expires on 2026-11-12'

// For a machine: the copy, and the same text embedded in the page for a driven browser.
const json = serializeReadout(readout);
const script = `<script type="application/json" id="token-data">${embedJson(json)}</script>`;
```

## Contract

- **Sensitive fields.** `serializeReadout` and `redactReadout` leave out each field named in `sensitive` and list it under `redacted`, so that a reader can tell a redacted field from an absent one. `{ includeSensitive: true }` keeps every field and omits `redacted`. Because `redacted` is reserved, the type rejects data with a field of that name. Only top-level fields can be marked sensitive.
- **Serialization.** `serializeReadout` returns JSON indented by two spaces. `redactReadout` returns the object that it serializes.
- **Embedding.** `embedJson` escapes every `<` in JSON text as `\u003c`, so that the content of a `<script type="application/json">` element cannot close the element or open a comment, and `JSON.parse` of the element's text returns the serialized value. It takes JSON text, not a readout, so that any serialization embeds through it.
- **Renderers.** `Renderers<M, R>` maps each type in `M`, a map from a type to the shape of its values, to a renderer that returns `R` (a string by default). `render` dispatches a value to the renderer for its `type`. JSON is not a renderer, because `serializeReadout` is the machine form.
