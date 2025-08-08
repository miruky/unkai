import {
  connect,
  createNode,
  deserialize,
  emptyDiagram,
  genId,
  removeEdge,
  removeNode,
  serialize,
  type ConfigValue,
  type Diagram,
} from './model';

export type Selection =
  | { kind: 'none' }
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string };

export interface View {
  x: number;
  y: number;
  scale: number;
}

const STORAGE_KEY = 'unkai.diagram.v1';
const HISTORY_LIMIT = 100;

type Listener = () => void;

// アプリの状態を一元管理し、変更のたびにlocalStorage保存と購読者通知を行う。
// 変更前のスナップショットを履歴に積み、undo/redoを提供する。
export class Store {
  diagram: Diagram;
  selection: Selection = { kind: 'none' };
  view: View = { x: -80, y: -60, scale: 1 };
  // キーボード・タップで接続するための一時モード。接続元ノードのid。
  linking: string | null = null;

  private listeners: Listener[] = [];
  private past: Diagram[] = [];
  private future: Diagram[] = [];
  // 同じ入力欄への連打など、連続する同種操作は1つの履歴にまとめるための印。
  private lastTag: string | null = null;
  private moving = false;

  constructor() {
    this.diagram = this.load();
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private emit(): void {
    this.persist();
    this.notify();
  }

  private snapshot(): Diagram {
    return structuredClone(this.diagram);
  }

  // 変更を加える直前に呼び、現在の状態を履歴へ積む。tagが直前と同じなら積み増さない。
  private pushHistory(tag: string | null): void {
    if (tag !== null && tag === this.lastTag) {
      this.future = [];
      return;
    }
    this.past.push(this.snapshot());
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.lastTag = tag;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.snapshot());
    this.diagram = prev;
    this.selection = { kind: 'none' };
    this.lastTag = null;
    this.linking = null;
    this.emit();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.snapshot());
    this.diagram = next;
    this.selection = { kind: 'none' };
    this.lastTag = null;
    this.linking = null;
    this.emit();
  }

  addNode(serviceId: string, x: number, y: number): void {
    this.pushHistory(null);
    const node = createNode(serviceId, x, y);
    this.diagram.nodes.push(node);
    this.selection = { kind: 'node', id: node.id };
    this.emit();
  }

  // 選択中ノードを少しずらして複製する。
  duplicateSelected(): void {
    const sel = this.selection;
    if (sel.kind !== 'node') return;
    const original = this.diagram.nodes.find((n) => n.id === sel.id);
    if (!original) return;
    this.pushHistory(null);
    const copy = {
      ...original,
      id: genId('n'),
      x: original.x + 24,
      y: original.y + 24,
      config: { ...original.config },
    };
    this.diagram.nodes.push(copy);
    this.selection = { kind: 'node', id: copy.id };
    this.emit();
  }

  moveNode(id: string, x: number, y: number): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    if (node.x === x && node.y === y) return;
    // ドラッグ1回につき履歴は1件。最初の移動で開始前の状態を積む。
    if (!this.moving) {
      this.pushHistory(null);
      this.moving = true;
    }
    node.x = x;
    node.y = y;
    // ドラッグ中は通知のみ。保存はドラッグ終了時にcommitで行う
    this.notify();
  }

  commit(): void {
    this.moving = false;
    this.emit();
  }

  link(from: string, to: string): void {
    // 変更前を控え、接続が成立したときだけ履歴へ確定する。
    const before = this.snapshot();
    if (!connect(this.diagram, from, to)) return;
    this.past.push(before);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.lastTag = null;
    this.emit();
  }

  // 接続モードの開始・キャンセル・確定。マウスのポートドラッグとは別の経路で、
  // キーボードやタップからも矢印を引けるようにする。
  startLink(from: string): void {
    if (!this.diagram.nodes.some((n) => n.id === from)) return;
    this.linking = from;
    this.notify();
  }

  cancelLink(): void {
    if (this.linking === null) return;
    this.linking = null;
    this.notify();
  }

  completeLink(to: string): void {
    const from = this.linking;
    if (from === null) return;
    this.linking = null;
    if (from !== to) this.link(from, to);
    this.notify();
  }

  setConfig(id: string, key: string, value: ConfigValue): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    this.pushHistory(`cfg:${id}:${key}`);
    node.config[key] = value;
    this.emit();
  }

  setLabel(id: string, label: string): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    this.pushHistory(`label:${id}`);
    node.label = label;
    this.emit();
  }

  select(selection: Selection): void {
    this.selection = selection;
    // 選択が変わったら同種操作のまとめを打ち切る
    this.lastTag = null;
    this.notify();
  }

  deleteSelected(): void {
    if (this.selection.kind === 'node') {
      this.pushHistory(null);
      removeNode(this.diagram, this.selection.id);
    } else if (this.selection.kind === 'edge') {
      this.pushHistory(null);
      removeEdge(this.diagram, this.selection.id);
    } else {
      return;
    }
    this.selection = { kind: 'none' };
    this.linking = null;
    this.emit();
  }

  clear(): void {
    this.pushHistory(null);
    this.diagram = emptyDiagram();
    this.selection = { kind: 'none' };
    this.linking = null;
    this.emit();
  }

  replace(diagram: Diagram): void {
    this.pushHistory(null);
    this.diagram = diagram;
    this.selection = { kind: 'none' };
    this.linking = null;
    this.emit();
  }

  exportText(): string {
    return serialize(this.diagram);
  }

  importText(text: string): void {
    this.replace(deserialize(text));
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(this.diagram));
    } catch {
      // 保存に失敗しても操作は続行する
    }
  }

  private load(): Diagram {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return deserialize(raw);
    } catch {
      // 壊れた保存データは無視して空から始める
    }
    return emptyDiagram();
  }
}
