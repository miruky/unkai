import { CATEGORY_ICON, CATEGORY_LABEL, PROVIDERS, serviceById } from './catalog';
import {
  boundingBox,
  clampScale,
  edgeMidpoint,
  edgePath,
  fitView,
  inputPort,
  NODE_H,
  NODE_W,
  outputPort,
  screenToWorld,
  type Point,
} from './geometry';
import type { DiagramNode } from './model';
import type { Store } from './store';
import { svgEl } from './svgutil';

type Drag =
  | { mode: 'none' }
  | { mode: 'node'; id: string; offset: Point }
  | { mode: 'pan'; startX: number; startY: number; origX: number; origY: number }
  | { mode: 'link'; from: string; cursor: Point };

// SVGキャンバス。状態はStoreが持ち、ここは描画とポインタ操作だけを担う。
export class Canvas {
  readonly svg = svgEl('svg', {
    class: 'canvas',
    role: 'application',
    'aria-label': 'クラウド構成図のキャンバス。ノードのドラッグで移動、ポートのドラッグで接続します。',
  });
  private edgeLayer = svgEl('g');
  private nodeLayer = svgEl('g');
  private overlay = svgEl('g');
  private drag: Drag = { mode: 'none' };
  // 直前の描画に存在したid。差分で新規ノード・辺だけ入場アニメーションを当てる。
  private seenNodes = new Set<string>();
  private seenEdges = new Set<string>();
  private emptyState = this.buildEmptyState();
  private zoomReadout = document.createElement('button');
  private zoomControl = this.buildZoomControl();

  constructor(private readonly store: Store) {
    const defs = svgEl('defs');
    defs.innerHTML =
      '<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">' +
      '<path d="M0 0L8 3L0 6z" class="arrow-head"/></marker>';
    this.svg.append(defs, this.edgeLayer, this.nodeLayer, this.overlay);
    this.bind();
    store.subscribe(() => this.render());
    window.addEventListener('resize', () => this.applyViewBox());
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.svg);
    parent.appendChild(this.emptyState);
    parent.appendChild(this.zoomControl);
    this.applyViewBox();
    this.render();
  }

  // 左下のズーム操作。倍率表示はリセット(100%)ボタンを兼ねる。
  private buildZoomControl(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'zoom-control';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '表示倍率の操作');

    const minus = this.zoomButton('縮小', '<path d="M5 12h14"/>', () => this.zoomOut());
    this.zoomReadout.type = 'button';
    this.zoomReadout.className = 'zoom-readout';
    this.zoomReadout.title = '100% に戻す';
    this.zoomReadout.setAttribute('aria-label', '表示倍率を 100% に戻す');
    this.zoomReadout.textContent = '100%';
    this.zoomReadout.addEventListener('click', () => this.resetView());
    const plus = this.zoomButton('拡大', '<path d="M12 5v14M5 12h14"/>', () => this.zoomIn());
    const fit = this.zoomButton(
      '全体を表示',
      '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16M4 9h16M4 15h16" opacity="0"/><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"/>',
      () => this.fitToContent(),
    );

    bar.append(minus, this.zoomReadout, plus, fit);
    return bar;
  }

  private zoomButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-btn';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  // カーソル(または画面中央)を固定したまま倍率を掛ける。
  private zoomAt(factor: number, screen?: Point): void {
    const rect = this.svg.getBoundingClientRect();
    const sx = screen?.x ?? rect.left + rect.width / 2;
    const sy = screen?.y ?? rect.top + rect.height / 2;
    const before = screenToWorld(sx, sy, rect, this.store.view);
    this.store.view.scale = clampScale(this.store.view.scale * factor);
    const after = screenToWorld(sx, sy, rect, this.store.view);
    this.store.view.x += before.x - after.x;
    this.store.view.y += before.y - after.y;
    this.applyViewBox();
  }

  zoomIn(): void {
    this.zoomAt(1.2);
  }

  zoomOut(): void {
    this.zoomAt(1 / 1.2);
  }

  resetView(): void {
    this.store.view = { x: -80, y: -60, scale: 1 };
    this.applyViewBox();
  }

  // 全ノードが収まるよう原点と倍率を合わせる。ノードが無ければ初期表示に戻す。
  fitToContent(): void {
    const box = boundingBox(this.store.diagram.nodes);
    const rect = this.svg.getBoundingClientRect();
    if (!box || rect.width === 0 || rect.height === 0) {
      this.resetView();
      return;
    }
    this.store.view = fitView({ width: rect.width, height: rect.height }, box);
    this.applyViewBox();
  }

  // ノードが無いときに中央へ出す導線。クリックは透過してパン操作を妨げない。
  private buildEmptyState(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'canvas-empty';
    el.innerHTML =
      '<svg class="canvas-empty-art" viewBox="0 0 220 120" aria-hidden="true">' +
      '<rect x="14" y="40" width="74" height="42" rx="9"/>' +
      '<rect x="132" y="40" width="74" height="42" rx="9"/>' +
      '<path class="canvas-empty-arrow" d="M92 61h28"/>' +
      '<path class="canvas-empty-arrow" d="M116 55.5l6.5 5.5-6.5 5.5"/>' +
      '</svg>' +
      '<p class="canvas-empty-title">クラウドサービスを置いて、矢印で繋ぎましょう</p>' +
      '<p class="canvas-empty-sub">左のパレットから選ぶか、サービス名で検索します</p>';
    return el;
  }

  // 現在のビューポート中央のワールド座標。パレットからの追加位置に使う。
  centerWorld(): Point {
    const rect = this.svg.getBoundingClientRect();
    const { x, y, scale } = this.store.view;
    return { x: x + rect.width / scale / 2, y: y + rect.height / scale / 2 };
  }

  private applyViewBox(): void {
    const rect = this.svg.getBoundingClientRect();
    const { x, y, scale } = this.store.view;
    this.svg.setAttribute('viewBox', `${x} ${y} ${rect.width / scale} ${rect.height / scale}`);
    this.zoomReadout.textContent = `${Math.round(scale * 100)}%`;
  }

  private toWorld(ev: PointerEvent): Point {
    const rect = this.svg.getBoundingClientRect();
    return screenToWorld(ev.clientX, ev.clientY, rect, this.store.view);
  }

  private bind(): void {
    this.svg.addEventListener('pointerdown', (ev) => this.onDown(ev));
    window.addEventListener('pointermove', (ev) => this.onMove(ev));
    window.addEventListener('pointerup', (ev) => this.onUp(ev));
    this.svg.addEventListener('wheel', (ev) => this.onWheel(ev), { passive: false });
    this.svg.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  // ノードにフォーカスがあるときのキーボード操作。
  private onKey(ev: KeyboardEvent): void {
    const el = (ev.target as Element).closest('[data-node-id]');
    if (!el) return;
    const id = el.getAttribute('data-node-id') ?? '';

    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (this.store.linking !== null) this.store.completeLink(id);
      else this.store.select({ kind: 'node', id });
      this.refocus(id);
      return;
    }
    if ((ev.key === 'c' || ev.key === 'C') && this.store.linking === null) {
      ev.preventDefault();
      this.store.select({ kind: 'node', id });
      this.store.startLink(id);
      this.refocus(id);
      return;
    }

    const step = ev.shiftKey ? 1 : 8;
    let dx = 0;
    let dy = 0;
    if (ev.key === 'ArrowLeft') dx = -step;
    else if (ev.key === 'ArrowRight') dx = step;
    else if (ev.key === 'ArrowUp') dy = -step;
    else if (ev.key === 'ArrowDown') dy = step;
    else return;
    ev.preventDefault();
    const node = this.store.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    this.store.select({ kind: 'node', id });
    this.store.moveNode(id, node.x + dx, node.y + dy);
    this.store.commit();
    this.refocus(id);
  }

  // 再描画でノード要素が作り直されるため、操作後に同じノードへフォーカスを戻す。
  private refocus(id: string): void {
    const g = this.nodeLayer.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
    (g as SVGGElement | null)?.focus?.();
  }

  private onDown(ev: PointerEvent): void {
    const target = ev.target as Element;

    // 接続モード中はクリックした先を接続先として確定し、背景ならキャンセルする。
    if (this.store.linking !== null) {
      const nodeEl = target.closest('[data-node-id]');
      if (nodeEl) this.store.completeLink(nodeEl.getAttribute('data-node-id') ?? '');
      else this.store.cancelLink();
      return;
    }

    const portEl = target.closest('[data-port]');
    if (portEl) {
      const nodeId = portEl.getAttribute('data-node') ?? '';
      this.drag = { mode: 'link', from: nodeId, cursor: this.toWorld(ev) };
      this.renderOverlay();
      return;
    }
    const nodeEl = target.closest('[data-node-id]');
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node-id') ?? '';
      this.store.select({ kind: 'node', id });
      const node = this.store.diagram.nodes.find((n) => n.id === id);
      if (node) {
        const w = this.toWorld(ev);
        this.drag = { mode: 'node', id, offset: { x: w.x - node.x, y: w.y - node.y } };
      }
      return;
    }
    const edgeEl = target.closest('[data-edge-id]');
    if (edgeEl) {
      this.store.select({ kind: 'edge', id: edgeEl.getAttribute('data-edge-id') ?? '' });
      return;
    }
    // 背景: パン開始しつつ選択解除
    this.store.select({ kind: 'none' });
    this.drag = {
      mode: 'pan',
      startX: ev.clientX,
      startY: ev.clientY,
      origX: this.store.view.x,
      origY: this.store.view.y,
    };
  }

  private onMove(ev: PointerEvent): void {
    if (this.drag.mode === 'node') {
      const w = this.toWorld(ev);
      this.store.moveNode(this.drag.id, w.x - this.drag.offset.x, w.y - this.drag.offset.y);
    } else if (this.drag.mode === 'pan') {
      const { scale } = this.store.view;
      this.store.view.x = this.drag.origX - (ev.clientX - this.drag.startX) / scale;
      this.store.view.y = this.drag.origY - (ev.clientY - this.drag.startY) / scale;
      this.applyViewBox();
    } else if (this.drag.mode === 'link') {
      this.drag.cursor = this.toWorld(ev);
      this.renderOverlay();
    }
  }

  private onUp(ev: PointerEvent): void {
    if (this.drag.mode === 'node') {
      this.store.commit();
    } else if (this.drag.mode === 'link') {
      const target = (ev.target as Element).closest('[data-node-id]');
      const to = target?.getAttribute('data-node-id');
      if (to) this.store.link(this.drag.from, to);
    }
    this.drag = { mode: 'none' };
    this.overlay.replaceChildren();
  }

  private onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.zoomAt(factor, { x: ev.clientX, y: ev.clientY });
  }

  private render(): void {
    this.applyViewBox();
    this.svg.classList.toggle('is-linking', this.store.linking !== null);
    this.emptyState.hidden = this.store.diagram.nodes.length > 0;
    this.renderEdges();
    this.renderNodes();
    this.renderOverlay();
  }

  private renderEdges(): void {
    this.edgeLayer.replaceChildren();
    const byId = new Map(this.store.diagram.nodes.map((n) => [n.id, n]));
    const current = new Set<string>();
    for (const edge of this.store.diagram.edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) continue;
      current.add(edge.id);
      const d = edgePath(outputPort(from), inputPort(to));
      const selected = this.store.selection.kind === 'edge' && this.store.selection.id === edge.id;
      const hit = svgEl('path', { d, class: 'edge-hit', 'data-edge-id': edge.id });
      const classes = ['edge'];
      if (selected) classes.push('selected');
      const isNew = !this.seenEdges.has(edge.id);
      if (isNew) classes.push('edge-enter');
      const line = svgEl('path', {
        d,
        class: classes.join(' '),
        'marker-end': 'url(#arrow)',
        'data-edge-id': edge.id,
      });
      if (isNew) {
        // 描き込みアニメーション後は破線指定を外し、長い辺でも実線で残るようにする
        line.addEventListener(
          'animationend',
          () => {
            line.classList.remove('edge-enter');
            line.style.strokeDasharray = '';
          },
          { once: true },
        );
      }
      this.edgeLayer.append(hit, line);

      if (edge.label) {
        const mid = edgeMidpoint(outputPort(from), inputPort(to));
        const text = svgEl('text', {
          class: selected ? 'edge-label selected' : 'edge-label',
          x: mid.x,
          y: mid.y,
          'data-edge-id': edge.id,
        });
        text.textContent = edge.label;
        this.edgeLayer.append(text);
      }
    }
    this.seenEdges = current;
  }

  private renderNodes(): void {
    this.nodeLayer.replaceChildren();
    const current = new Set<string>();
    let newIndex = 0;
    for (const node of this.store.diagram.nodes) {
      current.add(node.id);
      const enterIndex = this.seenNodes.has(node.id) ? -1 : newIndex++;
      this.nodeLayer.appendChild(this.renderNode(node, enterIndex));
    }
    this.seenNodes = current;
  }

  // enterIndex >= 0 のとき入場アニメーションを当てる(複数同時追加はスタッガ)。
  private renderNode(node: DiagramNode, enterIndex: number): SVGElement {
    const def = serviceById(node.serviceId);
    const provider = def ? PROVIDERS[def.provider] : { color: '#888', label: '' };
    const category = def ? `・${CATEGORY_LABEL[def.category]}` : '';
    const g = svgEl('g', {
      transform: `translate(${node.x} ${node.y})`,
      'data-node-id': node.id,
      tabindex: '0',
      role: 'button',
      'aria-label': `${node.label}(${provider.label}${category})。Enterで選択、矢印キーで移動、cキーで接続を開始`,
    });
    const inner = svgEl('g', { class: 'node-group' });
    if (enterIndex >= 0) {
      inner.classList.add('node-enter');
      inner.style.animationDelay = `${Math.min(enterIndex, 12) * 40}ms`;
    }
    const selected = this.store.selection.kind === 'node' && this.store.selection.id === node.id;

    inner.appendChild(svgEl('rect', { class: selected ? 'node selected' : 'node', width: NODE_W, height: NODE_H, rx: 9 }));
    inner.appendChild(svgEl('rect', { class: 'node-stripe', width: 6, height: NODE_H, rx: 3, fill: provider.color }));

    const icon = svgEl('g', { class: 'node-icon', transform: 'translate(14 10) scale(0.9)' });
    icon.innerHTML = def ? CATEGORY_ICON[def.category] : '';
    inner.appendChild(icon);

    const abbr = svgEl('text', { class: 'node-abbr', x: NODE_W - 12, y: 22 });
    abbr.textContent = def?.abbr ?? '?';
    inner.appendChild(abbr);

    const label = svgEl('text', { class: 'node-label', x: 16, y: NODE_H - 22 });
    label.textContent = node.label;
    inner.appendChild(label);

    const sub = svgEl('text', { class: 'node-sub', x: 16, y: NODE_H - 9 });
    sub.textContent = provider.label;
    inner.appendChild(sub);

    const inP = inputPort({ ...node, x: 0, y: 0 });
    const outP = outputPort({ ...node, x: 0, y: 0 });
    inner.appendChild(svgEl('circle', { class: 'port port-in', cx: inP.x, cy: inP.y, r: 6, 'data-port': 'in', 'data-node': node.id }));
    inner.appendChild(svgEl('circle', { class: 'port port-out', cx: outP.x, cy: outP.y, r: 6, 'data-port': 'out', 'data-node': node.id }));
    g.appendChild(inner);
    return g;
  }

  private renderOverlay(): void {
    this.overlay.replaceChildren();
    const drag = this.drag;
    if (drag.mode !== 'link') return;
    const from = this.store.diagram.nodes.find((n) => n.id === drag.from);
    if (!from) return;
    const d = edgePath(outputPort(from), drag.cursor);
    this.overlay.appendChild(svgEl('path', { d, class: 'edge linking' }));
  }
}
