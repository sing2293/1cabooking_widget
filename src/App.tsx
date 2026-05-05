import { useEffect } from 'react';
import LeadForm from './components/LeadForm';

/** Posts {height} to the parent window so the host page can resize the iframe.
 *  No-op when not iframed (window.parent === window). */
function useIframeAutoResize() {
  useEffect(() => {
    if (window.parent === window) return;

    const post = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: '1ca-widget-resize', height }, '*');
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener('load', post);

    return () => {
      ro.disconnect();
      window.removeEventListener('load', post);
    };
  }, []);
}

export default function App() {
  useIframeAutoResize();
  return <LeadForm />;
}
