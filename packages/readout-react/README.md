<!-- readme-type: library -->

# @williamthorsen/readout-react

React components for readouts and journals: a copy button, a JSON view, the structured view of a readout, and the journal drawer.

<!-- section:release-notes --><!-- /section:release-notes -->

```tsx
import { ReadoutView } from '@williamthorsen/readout-react';
import '@williamthorsen/readout-react/styles.css';

<ReadoutView readout={readout} embedId="token-data">
  <p>Created token {readout.data.name}</p>
</ReadoutView>;
```

## Why

[`@williamthorsen/readout`](https://github.com/williamthorsen/showroom/tree/main/packages/readout#readme) and [`@williamthorsen/readout-journal`](https://github.com/williamthorsen/showroom/tree/main/packages/readout-journal#readme) keep a result and a journal as data, so that a person and a machine read the same object. Each app that presents them needs the same pieces: a copy button, a view of the JSON, a tab that reveals a result's data beside the result, and a drawer that lists the journal. This package supplies them on plain elements, styled by one CSS file, so that an app does not rebuild them or adopt a design system to get them. An app that uses a design system keeps its own binding to it, and can still use `ReadoutPanel` and `EmbeddedJson` inside its own tabs or drawer.

React 19 is a peer dependency (`^19.0.0`).

## Copy and JSON

- `CopyButton` copies `text` to the clipboard, shows "Copied" or "Not copied" for a moment, and announces the result to a screen reader. Pass `onCopy` to copy some other way.
- `JsonView` shows JSON in a scrollable region that a keyboard user can focus.
- `EmbeddedJson` renders a `<script type="application/json">` element for a driven browser to read, escaped so that the content cannot close the element.

## Readout

`ReadoutView` shows its children, the result as a person reads it, on a Details tab, and the readout's JSON on a Data tab. It always embeds the JSON under `embedId`, without the readout's sensitive fields. The tabs work by keyboard (arrow keys, Home, End). Pass `selectedTab` and `onSelectTab` to control the selection.

`ReadoutPanel` is the Data tab's content on its own: the JSON with Copy JSON, without the sensitive fields until the person turns on "Include sensitive fields".

## Journal

```tsx
import { EmbeddedJson, JournalDrawer, useJournal } from '@williamthorsen/readout-react';
import { serializeJournal } from '@williamthorsen/readout-journal';

const { state, journal, dispatch } = useJournal(reduce, deriveEntries, () => initialState);

<>
  <EmbeddedJson id="page-journal" json={serializeJournal(journal)} />
  <JournalDrawer isOpen={isOpen} onClose={close} entries={journal} renderers={renderers} />
</>;
```

`useJournal` holds a state under a reducer and journals each transition through a derivation, stamping each action with the time at which it was dispatched. `JournalDrawer` is a modal dialog that lists the entries newest first through one renderer per event type, each with its time, and shows the journal as JSON with Copy JSON. The drawer does not embed the journal, so that the embedding stays on the page while the drawer is not rendered; render `EmbeddedJson` beside it.

## Theming

`styles.css` declares every colour as a custom property on `:root`, with a dark set under `prefers-color-scheme: dark`. Override the properties to theme the components:

```css
:root {
  --readout-accent: #6f42c1;
  --readout-focus: #6f42c1;
}
```

The properties, all prefixed `--readout-`, are declared at the top of `styles.css`. Every class that the components render begins with `readout-`.
