import { CATEGORY_ICON, PROVIDERS, serviceById } from './catalog';
import {
  edgePath,
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
  readonly svg = svgEl('svg', { class: 'canvas' });
  private edgeLayer = svgEl('g');
  private nodeLayer = svgEl('g');
  private overlay = svgEl('g');
  private drag: Drag = { mode: 'none' };

  constructor(private readonly store: Store) {
    const defs = svgEl('defs');
    defs.innerHTML =
      '<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">' +
      '<path d="M0 0L8 3L0 6z" fill="#94a3b8"/></marker>';
    this.svg.append(defs, this.edgeLayer, this.nodeLayer, this.overlay);
    this.bind();
    store.subscribe(() => this.render());
    window.addEventListener('resize', () => this.applyViewBox());
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.svg);
    this.applyViewBox();
    this.render();
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
  }

  private onDown(ev: PointerEvent): void {
    const target = ev.target as Element;
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
    const rect = this.svg.getBoundingClientRect();
    const before = screenToWorld(ev.clientX, ev.clientY, rect, this.store.view);
    const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.store.view.scale = Math.min(2.5, Math.max(0.3, this.store.view.scale * factor));
    // カーソル位置を固定するようにビュー原点を補正
    const after = screenToWorld(ev.clientX, ev.clientY, rect, this.store.view);
    this.store.view.x += before.x - after.x;
    this.store.view.y += before.y - after.y;
    this.applyViewBox();
  }

  private render(): void {
    this.applyViewBox();
    this.renderEdges();
    this.renderNodes();
    this.renderOverlay();
  }

  private renderEdges(): void {
    this.edgeLayer.replaceChildren();
    const byId = new Map(this.store.diagram.nodes.map((n) => [n.id, n]));
    for (const edge of this.store.diagram.edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) continue;
      const d = edgePath(outputPort(from), inputPort(to));
      const selected = this.store.selection.kind === 'edge' && this.store.selection.id === edge.id;
      const hit = svgEl('path', { d, class: 'edge-hit', 'data-edge-id': edge.id });
      const line = svgEl('path', {
        d,
        class: selected ? 'edge selected' : 'edge',
        'marker-end': 'url(#arrow)',
        'data-edge-id': edge.id,
      });
      this.edgeLayer.append(hit, line);
    }
  }

  private renderNodes(): void {
    this.nodeLayer.replaceChildren();
    for (const node of this.store.diagram.nodes) {
      this.nodeLayer.appendChild(this.renderNode(node));
    }
  }

  private renderNode(node: DiagramNode): SVGElement {
    const def = serviceById(node.serviceId);
    const provider = def ? PROVIDERS[def.provider] : { color: '#888', label: '' };
    const g = svgEl('g', { transform: `translate(${node.x} ${node.y})`, 'data-node-id': node.id });
    const selected = this.store.selection.kind === 'node' && this.store.selection.id === node.id;

    g.appendChild(svgEl('rect', { class: selected ? 'node selected' : 'node', width: NODE_W, height: NODE_H, rx: 9 }));
    g.appendChild(svgEl('rect', { class: 'node-stripe', width: 6, height: NODE_H, rx: 3, fill: provider.color }));

    const icon = svgEl('g', { class: 'node-icon', transform: 'translate(14 10) scale(0.9)' });
    icon.innerHTML = def ? CATEGORY_ICON[def.category] : '';
    g.appendChild(icon);

    const abbr = svgEl('text', { class: 'node-abbr', x: NODE_W - 12, y: 22 });
    abbr.textContent = def?.abbr ?? '?';
    g.appendChild(abbr);

    const label = svgEl('text', { class: 'node-label', x: 16, y: NODE_H - 22 });
    label.textContent = node.label;
    g.appendChild(label);

    const sub = svgEl('text', { class: 'node-sub', x: 16, y: NODE_H - 9 });
    sub.textContent = provider.label;
    g.appendChild(sub);

    const inP = inputPort({ ...node, x: 0, y: 0 });
    const outP = outputPort({ ...node, x: 0, y: 0 });
    g.appendChild(svgEl('circle', { class: 'port port-in', cx: inP.x, cy: inP.y, r: 6, 'data-port': 'in', 'data-node': node.id }));
    g.appendChild(svgEl('circle', { class: 'port port-out', cx: outP.x, cy: outP.y, r: 6, 'data-port': 'out', 'data-node': node.id }));
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
