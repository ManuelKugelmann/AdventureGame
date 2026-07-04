import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadContentFromServer, useStore } from './store';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('no #root element');
const root = createRoot(rootEl);

loadContentFromServer()
  .then((content) => {
    useStore.getState().init(content);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    root.render(<pre style={{ color: '#c66', padding: 24 }}>Failed to load content: {String(err)}</pre>);
  });
