import { isolatedNodes } from './model';
import type { Store } from './store';

// 上部のツールバー。保存はStoreが自動で行うため、ここは書き出し・読み込み・
// 構成チェック・全消去と、概要表示を担う。
export class Toolbar {
  readonly root = document.createElement('div');
  private summary = document.createElement('span');

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
    this.summary.textContent = `ノード ${nodes.length} ・ 接続 ${edges.length}`;
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
