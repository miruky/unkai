import { describe, expect, it } from 'vitest';
import { createNode } from './model';
import {
  edgePath,
  inputPort,
  NODE_H,
  NODE_W,
  nodeContains,
  outputPort,
  screenToWorld,
} from './geometry';

describe('ポート位置', () => {
  it('出力は右中央、入力は左中央', () => {
    const node = createNode('aws.lambda', 100, 200);
    expect(outputPort(node)).toEqual({ x: 100 + NODE_W, y: 200 + NODE_H / 2 });
    expect(inputPort(node)).toEqual({ x: 100, y: 200 + NODE_H / 2 });
  });
});

describe('nodeContains', () => {
  const node = createNode('aws.s3', 0, 0);
  it('内側の点を含む', () => {
    expect(nodeContains(node, { x: 10, y: 10 })).toBe(true);
  });
  it('外側の点を含まない', () => {
    expect(nodeContains(node, { x: NODE_W + 5, y: 10 })).toBe(false);
  });
});

describe('edgePath', () => {
  it('両端点を含む三次ベジェを返す', () => {
    const path = edgePath({ x: 0, y: 0 }, { x: 200, y: 100 });
    expect(path.startsWith('M 0 0 C')).toBe(true);
    expect(path.endsWith('200 100')).toBe(true);
  });
});

describe('screenToWorld', () => {
  it('スケールとビュー原点を反映する', () => {
    const p = screenToWorld(120, 80, { left: 20, top: 10 }, { x: 0, y: 0, scale: 2 });
    expect(p).toEqual({ x: 50, y: 35 });
  });

  it('ビュー原点を加える', () => {
    const p = screenToWorld(20, 10, { left: 20, top: 10 }, { x: 100, y: 200, scale: 1 });
    expect(p).toEqual({ x: 100, y: 200 });
  });
});
