import { type ReactElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Tour, type TourStep, useFirstRunTour } from '../src/index.ts';

import '../styles.css';

const STORAGE_KEY = 'tour-react-playground.tour';

const STEPS: readonly TourStep[] = [
  {
    eyebrow: 'Why',
    title: 'Your context is everywhere',
    lead: 'Decisions live in chat, specs in docs, and the reasons in somebody’s head.',
    visual: {
      kind: 'scatter',
      tiles: [
        { icon: '💬', label: 'Chat' },
        { icon: '📄', label: 'Docs' },
        { icon: '✉️', label: 'Mail' },
        { icon: '🎫', label: 'Tickets' },
        { icon: '🗒️', label: 'Notes' },
      ],
    },
  },
  {
    eyebrow: 'What',
    title: 'One place for all of it',
    lead: 'Every source flows into one searchable history.',
    visual: {
      kind: 'flow',
      tiles: [
        { icon: '📥', label: 'Capture', detail: 'From any app' },
        { icon: '🏷️', label: 'Sort', detail: 'By project' },
        { icon: '🔎', label: 'Find', detail: 'In one search' },
      ],
    },
  },
  {
    eyebrow: 'Uses',
    title: 'Built for the whole team',
    lead: 'Each role finds what it needs without asking.',
    visual: {
      kind: 'grid',
      tiles: [
        { icon: '🧑‍💻', label: 'Engineers', detail: 'Why the code is so' },
        { icon: '🎨', label: 'Designers', detail: 'What was tried' },
        { icon: '📈', label: 'Product', detail: 'What was decided' },
        { icon: '🤝', label: 'Support', detail: 'What was promised' },
      ],
    },
  },
  {
    eyebrow: 'How',
    title: 'Rules do the filing',
    lead: 'Name a rule, and matching items file themselves.',
    visual: <RuleForm />,
  },
  {
    eyebrow: 'Custom',
    title: 'Any diagram fits',
    lead: 'A step can pass its own element as its visual.',
    visual: <CustomDiagram />,
    points: ['Keeps the same box', 'Scrolls when it is tall', 'Animates like the rest'],
  },
  {
    eyebrow: 'Start',
    title: 'Ready when you are',
    lead: 'Create a project, or reopen this tour from the menu.',
    points: ['Invite your team', 'Connect a source', 'Search your history'],
  },
];

/** Shows the tour on the first visit, with controls that reopen it and reset its seen marker. */
function App(): ReactElement {
  const tour = useFirstRunTour(STORAGE_KEY);
  return (
    <main>
      <h1>tour-react</h1>
      <div className="actions">
        <button type="button" className="tour-button" onClick={tour.open}>
          Tour
        </button>
        <button type="button" className="tour-button" onClick={resetFirstRun}>
          Reset first run
        </button>
      </div>
      <Tour
        {...tour}
        steps={STEPS}
        action={
          <button type="button" className="tour-button" onClick={() => tour.onOpenChange(false)}>
            Create your first project
          </button>
        }
      />
    </main>
  );
}

// region | Helpers

/** A tall custom visual, which shows that the stage scrolls rather than grows. */
function CustomDiagram(): ReactElement {
  return (
    <svg viewBox="0 0 320 220" width="320" height="220" role="img" aria-label="Three nested rings">
      <circle cx="160" cy="110" r="100" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="160" cy="110" r="65" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="160" cy="110" r="30" fill="currentColor" />
    </svg>
  );
}

/** Clears the seen marker and reloads, so that the tour opens as on a first visit. */
function resetFirstRun(): void {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/** An editable field inside a step, in which the arrow keys move the caret rather than the tour. */
function RuleForm(): ReactElement {
  return (
    <label>
      Rule name <input type="text" defaultValue="Design reviews" />
    </label>
  );
}

// endregion | Helpers

const root = document.querySelector('#root');
if (root === null) throw new Error('The playground needs a #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
