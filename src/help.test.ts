// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { showHelp } from './help';

describe('help', () => {
  it('ショートカット一覧のダイアログを作る', () => {
    showHelp();
    const d = document.querySelector('dialog.help-dialog');
    expect(d).not.toBeNull();
    expect(d!.querySelectorAll('dt').length).toBeGreaterThan(4);
  });

  it('何度開いてもダイアログは一つだけ', () => {
    showHelp();
    showHelp();
    expect(document.querySelectorAll('dialog.help-dialog')).toHaveLength(1);
  });
});
