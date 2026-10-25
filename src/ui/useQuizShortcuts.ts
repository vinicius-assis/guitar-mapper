import { useEffect } from 'react';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable);

const click = (el: Element | null | undefined) => {
  if (!(el instanceof HTMLElement)) return false;
  el.click();
  return true;
};

/**
 * Atalhos de teclado das perguntas: 1–9 escolhem a opção, Enter é a ação principal
 * (Iniciar, Mostrar nota, Próxima), R toca o som de novo (Ouvido). Aciona os botões que
 * já estão na tela, então respeita tudo o que eles respeitam (limite de audições, etc.).
 */
export function useQuizShortcuts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      if (document.querySelector('[role="alertdialog"], [role="menu"]') || isTyping(event.target)) {
        return;
      }
      let handled = false;
      if (/^[1-9]$/.test(event.key)) {
        const n = Number(event.key) - 1;
        const grade = document.querySelectorAll('.options--two .option');
        const options = document.querySelectorAll('.options:not(.options--two) .option:not(:disabled)');
        handled = click(grade.length > 0 ? grade[n] : options[n]);
      } else if (event.key === 'Enter') {
        // Com um botão focado o navegador já o ativa: não disparar duas vezes.
        if (event.target instanceof HTMLElement && ['BUTTON', 'A'].includes(event.target.tagName)) {
          return;
        }
        handled =
          click(document.querySelector('.quiz-actions .primary')) ||
          click(document.querySelector('.start:not(:disabled)'));
      } else if (event.key === 'r' || event.key === 'R') {
        handled = click(document.querySelector('.ear-play:not(:disabled)'));
      }
      if (handled) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
