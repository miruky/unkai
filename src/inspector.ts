import { CATEGORY_LABEL, PROVIDERS, serviceById, type ConfigField } from './catalog';
import type { DiagramNode } from './model';
import type { Store } from './store';

// 右の詳細パネル。選択中のノードの設定項目を編集できる。
export class Inspector {
  readonly root = document.createElement('aside');

  constructor(private readonly store: Store) {
    this.root.className = 'inspector';
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    this.root.replaceChildren();
    const sel = this.store.selection;

    if (sel.kind === 'none') {
      this.root.appendChild(this.hint('ノードを選ぶと設定を編集できます。パレットの項目をクリックして配置し、ポートをドラッグして矢印で繋ぎます。'));
      return;
    }
    if (sel.kind === 'edge') {
      const h = document.createElement('h2');
      h.textContent = '接続';
      this.root.append(h, this.deleteButton('この接続を削除'));
      return;
    }

    const node = this.store.diagram.nodes.find((n) => n.id === sel.id);
    const def = node && serviceById(node.serviceId);
    if (!node || !def) return;

    const head = document.createElement('div');
    head.className = 'insp-head';
    const dot = document.createElement('span');
    dot.className = 'provider-dot';
    dot.style.background = PROVIDERS[def.provider].color;
    const title = document.createElement('h2');
    title.textContent = def.name;
    head.append(dot, title);
    const meta = document.createElement('p');
    meta.className = 'insp-meta';
    meta.textContent = `${PROVIDERS[def.provider].label} ・ ${CATEGORY_LABEL[def.category]}`;
    this.root.append(head, meta);

    this.root.appendChild(this.labelField(node));
    for (const field of def.fields) {
      this.root.appendChild(this.field(node, field));
    }
    this.root.appendChild(this.deleteButton('このノードを削除'));
  }

  private hint(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'insp-hint';
    p.textContent = text;
    return p;
  }

  private labelField(node: DiagramNode): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'insp-row';
    const span = document.createElement('span');
    span.textContent = '表示名';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = node.label;
    input.addEventListener('input', () => this.store.setLabel(node.id, input.value));
    wrap.append(span, input);
    return wrap;
  }

  private field(node: DiagramNode, field: ConfigField): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'insp-row';
    const span = document.createElement('span');
    span.textContent = field.unit ? `${field.label}(${field.unit})` : field.label;
    wrap.appendChild(span);

    const value = node.config[field.key];
    if (field.type === 'boolean') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(value);
      input.addEventListener('change', () => this.store.setConfig(node.id, field.key, input.checked));
      wrap.classList.add('insp-check');
      wrap.appendChild(input);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      for (const opt of field.options ?? []) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === value) o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener('change', () => this.store.setConfig(node.id, field.key, select.value));
      wrap.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      input.value = String(value);
      input.addEventListener('input', () => {
        const v = field.type === 'number' ? Number(input.value) : input.value;
        this.store.setConfig(node.id, field.key, v);
      });
      wrap.appendChild(input);
    }
    return wrap;
  }

  private deleteButton(text: string): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'insp-delete';
    btn.textContent = text;
    btn.addEventListener('click', () => this.store.deleteSelected());
    return btn;
  }
}
