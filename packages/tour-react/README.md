<!-- readme-type: library -->

# @williamthorsen/tour-react

A React product tour: an ordered list of steps shown as a fixed-size slide deck in a modal dialog, with a hook that opens it once on first launch.

<!-- section:release-notes --><!-- /section:release-notes -->

```tsx
import { Tour, type TourStep, useFirstRunTour } from '@williamthorsen/tour-react';
import '@williamthorsen/tour-react/styles.css';

const steps: TourStep[] = [
  { eyebrow: 'Why', title: 'Notes are everywhere', lead: 'Ideas land in chat, mail, and five other apps.' },
  { eyebrow: 'How', title: 'One inbox', lead: 'Everything arrives in one place.', points: ['Capture', 'Sort', 'Ship'] },
];

function App() {
  const tour = useFirstRunTour('my-app.tour');
  return (
    <>
      <button type="button" onClick={tour.open}>Tour</button>
      <Tour {...tour} steps={steps} />
    </>
  );
}
```

## Why

An app that introduces itself on first launch needs the same pieces every time: a slide layout, motion, a progress indicator, keyboard handling, and "seen once" bookkeeping. Libraries such as `react-joyride`, Shepherd, and driver.js anchor popovers to elements on the page. This package shows a self-contained deck instead, which explains the product before the reader has learned the page, and it renders plain elements styled by one CSS file.

React 19 is the only peer dependency (`^19.0.0`). The consumer supplies icons and any call to action.

## Steps

Each step has the same shape, which keeps every slide short:

- `eyebrow`: a short uppercase label naming the step's role, such as "Why", "What", "How", or "Uses"
- `title`: one short heading
- `lead`: one or two sentences
- `visual` (optional): a built-in visual, or a React element that renders in its place
- `points` (optional): three or four short bullets

## Visuals

A built-in visual is `{ kind, tiles }`, a row or grid of tiles on a sunken panel. Each tile is `{ icon, label, detail? }`, in which `icon` is a React node that the consumer supplies.

- `flow`: tiles joined by arrows, read left to right; the last tile is highlighted as the goal
- `grid`: equal-width cards that wrap, for a set of peers such as use cases
- `scatter`: tiles at slight alternating tilts that drift for a few seconds and come to rest

```tsx
const step: TourStep = {
  eyebrow: 'How',
  title: 'From capture to shipped',
  lead: 'Three steps, one place.',
  visual: {
    kind: 'flow',
    tiles: [
      { icon: <InboxIcon />, label: 'Capture', detail: 'From anywhere' },
      { icon: <SortIcon />, label: 'Sort' },
      { icon: <RocketIcon />, label: 'Ship' },
    ],
  },
};
```

Any React element can take the visual's place: `visual: <MyDiagram />`.

## The tour

`Tour` is controlled through `isOpen` and `onOpenChange`, and takes `steps`, an optional `label`, which names the dialog for assistive technology ("Product tour" by default), and an optional `action`, a call to action shown on the last step:

```tsx
<Tour {...tour} steps={steps} action={<a href="/projects/new">Create your first project</a>} />
```

The left and right arrow keys move between steps, except while focus is in an editable field. Escape, the close button, and Finish on the last step report `onOpenChange(false)`. Each opening starts at the first step. Under `prefers-reduced-motion`, every animation is removed.

## First run

`useFirstRunTour(storageKey)` returns `{ isOpen, open, onOpenChange }`, which spreads into `Tour`. The tour opens on the first visit for `storageKey` and is marked seen in `localStorage` when it closes, not when it opens. `open()` shows it again, such as from a menu. When storage cannot be read, the tour counts as seen, so that it does not reopen on every load.

## Theming

`styles.css` declares the colours, radii, shadows, and the dialog's size (`--tour-width`, `--tour-height`) as custom properties on `:root`, with a dark set under `prefers-color-scheme: dark`. Override the properties to theme the tour:

```css
:root {
  --tour-accent: #6f42c1;
  --tour-accent-hover: #59359a;
  --tour-focus: #6f42c1;
}
```

The properties, all prefixed `--tour-`, are declared at the top of `styles.css`. Every class that the components render begins with `tour-`.
