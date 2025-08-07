import { defaultConfig, serviceById } from './catalog';

export type ConfigValue = string | number | boolean;

export interface DiagramNode {
  id: string;
  serviceId: string;
  x: number;
  y: number;
  label: string;
  config: Record<string, ConfigValue>;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
}

export interface Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const SCHEMA_VERSION = 1;

export function emptyDiagram(): Diagram {
  return { nodes: [], edges: [] };
}

let counter = 0;
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function createNode(serviceId: string, x: number, y: number): DiagramNode {
  const def = serviceById(serviceId);
  if (!def) throw new Error(`未知のサービス: ${serviceId}`);
  return {
    id: genId('n'),
    serviceId,
    x,
    y,
    label: def.name,
    config: defaultConfig(def),
  };
}

// 自己ループと重複辺を弾く。両端のノードが存在しなければnullを返す。
export function connect(diagram: Diagram, from: string, to: string): DiagramEdge | null {
  if (from === to) return null;
  const ids = new Set(diagram.nodes.map((n) => n.id));
  if (!ids.has(from) || !ids.has(to)) return null;
  if (diagram.edges.some((e) => e.from === from && e.to === to)) return null;
  const edge: DiagramEdge = { id: genId('e'), from, to };
  diagram.edges.push(edge);
  return edge;
}

export function removeNode(diagram: Diagram, nodeId: string): void {
  diagram.nodes = diagram.nodes.filter((n) => n.id !== nodeId);
  diagram.edges = diagram.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
}

export function removeEdge(diagram: Diagram, edgeId: string): void {
  diagram.edges = diagram.edges.filter((e) => e.id !== edgeId);
}

export interface SerializedDiagram {
  version: number;
  diagram: Diagram;
}

export function serialize(diagram: Diagram): string {
  return JSON.stringify({ version: SCHEMA_VERSION, diagram } satisfies SerializedDiagram, null, 2);
}

// 壊れた入力は捨て、健全なノード・辺だけを復元する。未知サービスのノードと、
// 端点を失った辺は取り除く。
export function deserialize(text: string): Diagram {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読めません');
  }
  if (typeof parsed !== 'object' || parsed === null || !('diagram' in parsed)) {
    throw new Error('図のデータ形式ではありません');
  }
  const raw = (parsed as { diagram: unknown }).diagram;
  if (typeof raw !== 'object' || raw === null) throw new Error('図のデータ形式ではありません');
  const rawNodes = Array.isArray((raw as Diagram).nodes) ? (raw as Diagram).nodes : [];
  const rawEdges = Array.isArray((raw as Diagram).edges) ? (raw as Diagram).edges : [];

  const nodes: DiagramNode[] = [];
  for (const n of rawNodes) {
    const def = serviceById(n?.serviceId);
    if (!def || typeof n.id !== 'string') continue;
    nodes.push({
      id: n.id,
      serviceId: n.serviceId,
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      label: typeof n.label === 'string' ? n.label : def.name,
      config: { ...defaultConfig(def), ...(n.config ?? {}) },
    });
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (typeof e?.from !== 'string' || typeof e?.to !== 'string') continue;
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) continue;
    const key = `${e.from}->${e.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ id: typeof e.id === 'string' ? e.id : genId('e'), from: e.from, to: e.to });
  }
  return { nodes, edges };
}

// 接続のない孤立ノードのidを返す(設計チェック用)。
export function isolatedNodes(diagram: Diagram): string[] {
  const connected = new Set<string>();
  for (const e of diagram.edges) {
    connected.add(e.from);
    connected.add(e.to);
  }
  return diagram.nodes.filter((n) => !connected.has(n.id)).map((n) => n.id);
}
