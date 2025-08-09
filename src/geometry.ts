import type { DiagramNode } from './model';

export const NODE_W = 132;
export const NODE_H = 64;

// ズーム倍率の下限・上限。ホイール・ボタン・自動フィットで共通に用いる。
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.5;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ノードの出力ポート(右中央)と入力ポート(左中央)。
export function outputPort(node: DiagramNode): Point {
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

export function inputPort(node: DiagramNode): Point {
  return { x: node.x, y: node.y + NODE_H / 2 };
}

export function nodeContains(node: DiagramNode, p: Point): boolean {
  return p.x >= node.x && p.x <= node.x + NODE_W && p.y >= node.y && p.y <= node.y + NODE_H;
}

// 出力→入力を結ぶ水平方向の三次ベジェ。離れているほど制御点を張り出す。
export function edgePath(from: Point, to: Point): string {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

// 全ノードを囲む矩形(ノードの幅高を含む)。ノードが無ければnull。
export function boundingBox(nodes: DiagramNode[]): Box | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// 矩形全体がビューポートに収まるビュー(原点とスケール)を求める。
// paddingはスクリーン上の余白(px)。ボックス中心をビューポート中心に合わせる。
export function fitView(
  viewport: { width: number; height: number },
  box: Box,
  padding = 80,
): { x: number; y: number; scale: number } {
  const availW = Math.max(1, viewport.width - padding * 2);
  const availH = Math.max(1, viewport.height - padding * 2);
  const raw = box.w === 0 || box.h === 0 ? MAX_SCALE : Math.min(availW / box.w, availH / box.h);
  const scale = clampScale(raw);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    x: cx - viewport.width / scale / 2,
    y: cy - viewport.height / scale / 2,
    scale,
  };
}

// スクリーン座標(クライアントピクセル)をワールド座標へ変換する。
export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  view: { x: number; y: number; scale: number },
): Point {
  return {
    x: (clientX - rect.left) / view.scale + view.x,
    y: (clientY - rect.top) / view.scale + view.y,
  };
}
