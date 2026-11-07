import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuizShortcuts } from './useQuizShortcuts';

function Harness({ onClick }: { onClick: (id: string) => void }) {
  useQuizShortcuts(true);
  return (
    <div>
      <button data-shortcut="1" onClick={() => onClick('1')}>um</button>
      <button data-shortcut="2" onClick={() => onClick('2')}>dois</button>
      <button data-shortcut="3" disabled onClick={() => onClick('3')}>tres</button>
      <button data-shortcut={'"'} onClick={() => onClick('quote')}>aspas</button>
    </div>
  );
}

afterEach(cleanup);

describe('useQuizShortcuts data-shortcut lookup', () => {
  it('does not throw on keys that break a CSS selector', () => {
    const onClick = vi.fn();
    const errors = vi.fn();
    window.addEventListener('error', errors);
    render(<Harness onClick={onClick} />);
    for (const key of ['\\', '[']) {
      expect(() => fireEvent.keyDown(document, { key })).not.toThrow();
    }
    window.removeEventListener('error', errors);
    expect(errors).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clicks the matching button', () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);
    fireEvent.keyDown(document, { key: '"' });
    expect(onClick).toHaveBeenLastCalledWith('quote');
    fireEvent.keyDown(document, { key: '2' });
    expect(onClick).toHaveBeenLastCalledWith('2');
    expect(screen.getByText('tres')).toBeDisabled();
    onClick.mockClear();
    fireEvent.keyDown(document, { key: '3' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
