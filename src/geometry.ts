import type { DiagramNode } from './model';

export const NODE_W = 132;
export const NODE_H = 64;

export interface Point {
  x: number;
  y: number;
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
