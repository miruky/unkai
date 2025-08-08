import { showHelp } from './help';
import { isolatedNodes } from './model';
import { shareUrl } from './share';
import type { Store } from './store';
import { applyTheme, loadTheme, nextTheme, THEME_LABEL, type ThemeMode } from './theme';
import { toast } from './toast';

const ICON = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h11a4.5 4.5 0 0 1 0 9h-2"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12H9a4.5 4.5 0 0 0 0 9h2"/>',
  auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
  light:
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>',
  dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.6a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.1-2.6 3.7"/><circle cx="12" cy="17.3" r="0.7" fill="currentColor" stroke="none"/>',
};

// 上部のツールバー。保存はStoreが自動で行うため、ここは履歴操作・構成チェック・
// 共有・書き出し・読み込み・全消去・テーマ切替と、概要表示を担う。
export class Toolbar {
  readonly root = document.createElement('div');
  private summary = document.createElement('span');
  private nodeCount = document.createElement('span');
  private edgeCount = document.createElement('span');
  private countFrames = new WeakMap<HTMLElement, number>();
  private fileInput = document.createElement('input');
  private undoBtn!: HTMLButtonElement;
  private redoBtn!: HTMLButtonElement;
  private themeBtn!: HTMLButtonElement;
  private linkBanner!: HTMLElement;
  private theme: ThemeMode = 'auto';

  constructor(private readonly store: Store) {
    this.root.className = 'toolbar';
    this.theme = loadTheme();
    applyTheme(this.theme);
    this.build();
    store.subscribe(() => this.onChange());
    this.onChange();
  }

  private build(): void {
    const title = document.createElement('h1');
    title.className = 'brand';
    title.textContent = 'unkai';

    this.summary.className = 'summary';
    this.nodeCount.className = 'count';
    this.edgeCount.className = 'count';
    this.summary.append('ノード ', this.nodeCount, ' ・ 接続 ', this.edgeCount);

    this.undoBtn = this.iconButton('元に戻す', ICON.undo, () => this.store.undo());
    this.redoBtn = this.iconButton('やり直す', ICON.redo, () => this.store.redo());

    const check = this.button('構成チェック', () => this.runCheck());
    const shareBtn = this.button('共有', () => this.share());
    const exportBtn = this.button('書き出し', () => this.exportFile());
    const importBtn = this.button('読み込み', () => this.fileInput.click());
    const clearBtn = this.button('全消去', () => {
      if (confirm('図をすべて消去しますか?')) this.store.clear();
    });
    const helpBtn = this.iconButton('ヘルプ', ICON.help, () => showHelp());
    this.themeBtn = this.iconButton('テーマ切替', ICON.auto, () => this.cycleTheme());
    this.updateThemeButton();

    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => this.importFile());

    const group = document.createElement('div');
    group.className = 'tb-group';
    group.append(this.undoBtn, this.redoBtn);

    this.linkBanner = this.buildLinkBanner();

    this.root.append(
      title,
      this.summary,
      group,
      check,
      shareBtn,
      exportBtn,
      importBtn,
      clearBtn,
      helpBtn,
      this.themeBtn,
      this.fileInput,
      this.linkBanner,
    );
  }

  private buildLinkBanner(): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'link-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    const msg = document.createElement('span');
    msg.textContent = '接続先のノードを選んでください。Esc でキャンセル。';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'link-banner-cancel';
    cancel.textContent = 'キャンセル';
    cancel.addEventListener('click', () => this.store.cancelLink());
    banner.append(msg, cancel);
    return banner;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private iconButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-btn tb-icon';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private onChange(): void {
    const { nodes, edges } = this.store.diagram;
    this.animateCount(this.nodeCount, nodes.length);
    this.animateCount(this.edgeCount, edges.length);
    this.undoBtn.disabled = !this.store.canUndo;
    this.redoBtn.disabled = !this.store.canRedo;
    this.linkBanner.hidden = this.store.linking === null;
  }

  // 数値の変化を短いカウントアップで見せる。reduced-motion時は即時反映する。
  private animateCount(el: HTMLElement, to: number): void {
    const prev = this.countFrames.get(el);
    if (prev !== undefined) cancelAnimationFrame(prev);
    const from = Number(el.textContent) || 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (from === to || reduce) {
      el.textContent = String(to);
      return;
    }
    const duration = 320;
    const start = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) this.countFrames.set(el, requestAnimationFrame(tick));
      else this.countFrames.delete(el);
    };
    this.countFrames.set(el, requestAnimationFrame(tick));
  }

  private cycleTheme(): void {
    this.theme = nextTheme(this.theme);
    applyTheme(this.theme);
    this.updateThemeButton();
    toast(`テーマ: ${THEME_LABEL[this.theme]}`);
  }

  private updateThemeButton(): void {
    this.themeBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[this.theme]}</svg>`;
    const label = `テーマ切替(現在: ${THEME_LABEL[this.theme]})`;
    this.themeBtn.setAttribute('aria-label', label);
    this.themeBtn.title = label;
  }

  private runCheck(): void {
    const isolated = isolatedNodes(this.store.diagram);
    if (this.store.diagram.nodes.length === 0) {
      toast('ノードがありません。パレットから配置してください。');
      return;
    }
    if (isolated.length === 0) {
      toast('すべてのノードが接続されています。');
      return;
    }
    const names = isolated
      .map((id) => this.store.diagram.nodes.find((n) => n.id === id)?.label ?? id)
      .join('、');
    toast(`接続のないノードが ${isolated.length} 件あります: ${names}`, 'error');
  }

  private async share(): Promise<void> {
    if (this.store.diagram.nodes.length === 0) {
      toast('共有する図がありません。', 'error');
      return;
    }
    const url = shareUrl(this.store.diagram);
    try {
      await navigator.clipboard.writeText(url);
      toast('共有リンクをコピーしました。');
    } catch {
      // クリップボードが使えない場合はアドレスバーに載せて手動コピーできるようにする
      location.hash = url.split('#')[1] ?? '';
      toast('共有リンクをアドレスバーに表示しました。', 'error');
    }
  }

  private exportFile(): void {
    const blob = new Blob([this.store.exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unkai-diagram.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private importFile(): void {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.store.importText(String(reader.result));
        toast('図を読み込みました。');
      } catch (error) {
        toast(`読み込みに失敗しました: ${(error as Error).message}`, 'error');
      }
    };
    reader.readAsText(file);
    this.fileInput.value = '';
  }
}
