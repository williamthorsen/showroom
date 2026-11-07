import { type ReactElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { type ITheme, Terminal } from '../src/index.ts';

import '../styles.css';

const DARK_THEME: ITheme = { background: '#161b22', foreground: '#e6edf3', cursor: '#e6edf3' };
const LIGHT_THEME: ITheme = {
  background: '#ffffff',
  foreground: '#1f2328',
  cursor: '#1f2328',
  selectionBackground: '#b6d4fe',
};

const ECHO_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/echo`;

const root = document.querySelector('#root');
if (root === null) throw new Error('The playground page lacks #root.');
createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);

/** The page that renders a terminal attached to the playground's echo socket. */
function Playground(): ReactElement {
  const [isLight, setIsLight] = useState(false);

  return (
    <main>
      <h1>terminal-react playground</h1>
      <div className="actions">
        <button type="button" onClick={() => setIsLight((value) => !value)}>
          {isLight ? 'Use dark theme' : 'Use light theme'}
        </button>
      </div>
      <div className="frame">
        <Terminal url={ECHO_URL} theme={isLight ? LIGHT_THEME : DARK_THEME} />
      </div>
    </main>
  );
}
