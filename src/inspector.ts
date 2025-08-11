import { CATEGORY_LABEL, PROVIDERS, serviceById, type ConfigField } from './catalog';
import type { DiagramNode } from './model';
import type { Selection, Store } from './store';

// 右の詳細パネル。選択中のノードの設定項目を編集できる。
export class Inspector {
  readonly root = document.createElement('aside');
  // 直前に描画した選択対象。同じ対象の値更新では作り直さず、入力フォーカスを保つ。
  private renderedKey = '';

  constructor(private readonly store: Store) {
    this.root.className = 'inspector';
    store.subscribe(() => this.render());
    this.render();
  }

  private selectionKey(sel: Selection): string {
    return sel.kind === 'none' ? 'none' : `${sel.kind}:${sel.id}`;
  }

  private render(): void {
    const sel = this.store.selection;
    const key = this.selectionKey(sel);
    // モバイルでは選択時だけ詳細パネルをせり上げる。選択の有無を body へ反映する。
    document.body.classList.toggle('has-selection', sel.kind !== 'none');
    // 選択対象が変わらない限り作り直さない。設定編集中のフォーカス喪失を防ぐ。
    if (key === this.renderedKey) return;
    this.renderedKey = key;

    const body = document.createElement('div');
    body.className = 'insp-body';

    if (sel.kind === 'none') {
      body.appendChild(this.hint('ノードを選ぶと設定を編集できます。パレットの項目をクリックして配置し、ポートをドラッグして矢印で繋ぎます。'));
      this.root.replaceChildren(body);
      return;
    }
    if (sel.kind === 'edge') {
      const edge = this.store.diagram.edges.find((e) => e.id === sel.id);
      const h = document.createElement('h2');
      h.textContent = '接続';
      body.append(h);
      const meta = document.createElement('p');
      meta.className = 'insp-meta';
      meta.textContent = 'ラベルで接続の意味(events、HTTPS、read など)を添えられます。';
      body.append(meta);
      if (edge) body.appendChild(this.edgeLabelField(edge.id, edge.label ?? ''));
      body.appendChild(this.deleteButton('この接続を削除'));
      this.root.replaceChildren(body);
      return;
    }

    const node = this.store.diagram.nodes.find((n) => n.id === sel.id);
    const def = node && serviceById(node.serviceId);
    if (!node || !def) {
      this.root.replaceChildren(body);
      return;
    }

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
    body.append(head, meta);

    body.appendChild(this.labelField(node));
    for (const field of def.fields) {
      body.appendChild(this.field(node, field));
    }
    body.appendChild(this.connectButton(node.id));
    body.appendChild(this.deleteButton('このノードを削除'));
    this.root.replaceChildren(body);
  }

  private connectButton(nodeId: string): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'insp-connect';
    btn.textContent = 'ここから接続';
    btn.addEventListener('click', () => this.store.startLink(nodeId));
    return btn;
  }

  private hint(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'insp-hint';
    p.textContent = text;
    return p;
  }

  private edgeLabelField(edgeId: string, value: string): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'insp-row';
    const span = document.createElement('span');
    span.textContent = 'ラベル';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = '例: events';
    input.addEventListener('input', () => this.store.setEdgeLabel(edgeId, input.value));
    wrap.append(span, input);
    return wrap;
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
