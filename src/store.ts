import {
  connect,
  createNode,
  deserialize,
  emptyDiagram,
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

type Listener = () => void;

// アプリの状態を一元管理し、変更のたびにlocalStorage保存と購読者通知を行う。
export class Store {
  diagram: Diagram;
  selection: Selection = { kind: 'none' };
  view: View = { x: -80, y: -60, scale: 1 };

  private listeners: Listener[] = [];

  constructor() {
    this.diagram = this.load();
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn);
  }

  private emit(): void {
    this.persist();
    for (const fn of this.listeners) fn();
  }

  addNode(serviceId: string, x: number, y: number): void {
    const node = createNode(serviceId, x, y);
    this.diagram.nodes.push(node);
    this.selection = { kind: 'node', id: node.id };
    this.emit();
  }

  moveNode(id: string, x: number, y: number): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    node.x = x;
    node.y = y;
    // ドラッグ中は通知のみ。保存はドラッグ終了時にcommitで行う
    for (const fn of this.listeners) fn();
  }

  commit(): void {
    this.emit();
  }

  link(from: string, to: string): void {
    if (connect(this.diagram, from, to)) this.emit();
  }

  setConfig(id: string, key: string, value: ConfigValue): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    node.config[key] = value;
    this.emit();
  }

  setLabel(id: string, label: string): void {
    const node = this.diagram.nodes.find((n) => n.id === id);
    if (!node) return;
    node.label = label;
    this.emit();
  }

  select(selection: Selection): void {
    this.selection = selection;
    for (const fn of this.listeners) fn();
  }

  deleteSelected(): void {
    if (this.selection.kind === 'node') removeNode(this.diagram, this.selection.id);
    else if (this.selection.kind === 'edge') removeEdge(this.diagram, this.selection.id);
    else return;
    this.selection = { kind: 'none' };
    this.emit();
  }

  clear(): void {
    this.diagram = emptyDiagram();
    this.selection = { kind: 'none' };
    this.emit();
  }

  replace(diagram: Diagram): void {
    this.diagram = diagram;
    this.selection = { kind: 'none' };
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
