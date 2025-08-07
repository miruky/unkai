import { isolatedNodes } from './model';
import type { Store } from './store';

// 上部のツールバー。保存はStoreが自動で行うため、ここは書き出し・読み込み・
// 構成チェック・全消去と、概要表示を担う。
export class Toolbar {
  readonly root = document.createElement('div');
  private summary = document.createElement('span');
  private nodeCount = document.createElement('span');
  private edgeCount = document.createElement('span');
  private countFrames = new WeakMap<HTMLElement, number>();

  constructor(private readonly store: Store) {
    this.root.className = 'toolbar';
    this.build();
    store.subscribe(() => this.updateSummary());
    this.updateSummary();
  }

  private build(): void {
    const title = document.createElement('span');
    title.className = 'brand';
    title.textContent = 'unkai';

    const check = this.button('構成チェック', () => this.runCheck());
    const exportBtn = this.button('書き出し', () => this.exportFile());
    const importBtn = this.button('読み込み', () => this.fileInput.click());
    const clearBtn = this.button('全消去', () => {
      if (confirm('図をすべて消去しますか?')) this.store.clear();
    });

    this.summary.className = 'summary';
    this.nodeCount.className = 'count';
    this.edgeCount.className = 'count';
    this.summary.append('ノード ', this.nodeCount, ' ・ 接続 ', this.edgeCount);

    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => this.importFile());

    this.root.append(title, this.summary, check, exportBtn, importBtn, clearBtn, this.fileInput);
  }

  private fileInput = document.createElement('input');

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private updateSummary(): void {
    const { nodes, edges } = this.store.diagram;
    this.animateCount(this.nodeCount, nodes.length);
    this.animateCount(this.edgeCount, edges.length);
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

  private runCheck(): void {
    const isolated = isolatedNodes(this.store.diagram);
    if (this.store.diagram.nodes.length === 0) {
      alert('ノードがありません。パレットから配置してください。');
      return;
    }
    if (isolated.length === 0) {
      alert('すべてのノードが接続されています。');
      return;
    }
    const names = isolated
      .map((id) => this.store.diagram.nodes.find((n) => n.id === id)?.label ?? id)
      .join('、');
    alert(`接続されていないノードが ${isolated.length} 件あります: ${names}`);
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
      } catch (error) {
        alert(`読み込みに失敗しました: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    this.fileInput.value = '';
  }
}
