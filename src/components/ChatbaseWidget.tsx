import { useEffect } from 'react';
import { integrations } from '../config/integrations';

/** Injects the Chatbase chat-widget script once, only when Phase 7 has supplied it. */
export default function ChatbaseWidget() {
  useEffect(() => {
    const script = integrations.chatbaseScript;
    if (!script || document.querySelector('script[data-simrule-chatbase]')) return;
    const holder = document.createElement('div');
    holder.innerHTML = script;
    for (const s of Array.from(holder.querySelectorAll('script'))) {
      const el = document.createElement('script');
      for (const attr of Array.from(s.attributes)) el.setAttribute(attr.name, attr.value);
      el.text = s.text;
      el.setAttribute('data-simrule-chatbase', 'true');
      document.body.appendChild(el);
    }
  }, []);
  return null;
}
