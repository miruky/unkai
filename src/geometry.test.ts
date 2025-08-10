import { describe, expect, it } from 'vitest';
import { createNode } from './model';
import {
  boundingBox,
  clampScale,
  edgeMidpoint,
  edgePath,
  fitView,
  inputPort,
  MAX_SCALE,
  MIN_SCALE,
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

describe('edgeMidpoint', () => {
  it('両端点の中点を返す', () => {
    expect(edgeMidpoint({ x: 0, y: 0 }, { x: 200, y: 100 })).toEqual({ x: 100, y: 50 });
  });
});

describe('clampScale', () => {
  it('下限・上限で頭打ちにする', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(1)).toBe(1);
  });
});

describe('boundingBox', () => {
  it('ノードが無ければnull', () => {
    expect(boundingBox([])).toBeNull();
  });

  it('全ノードを幅高込みで囲む', () => {
    const a = createNode('aws.lambda', 0, 0);
    const b = createNode('aws.s3', 100, 50);
    expect(boundingBox([a, b])).toEqual({ x: 0, y: 0, w: 100 + NODE_W, h: 50 + NODE_H });
  });
});

describe('fitView', () => {
  it('ボックス中心をビューポート中心に合わせる', () => {
    const box = { x: 0, y: 0, w: 200, h: 100 };
    const view = fitView({ width: 800, height: 600 }, box, 0);
    const cx = view.x + 800 / view.scale / 2;
    const cy = view.y + 600 / view.scale / 2;
    expect(cx).toBeCloseTo(100);
    expect(cy).toBeCloseTo(50);
  });

  it('はみ出さないよう小さい方の倍率を選び、下限・上限で頭打ちにする', () => {
    // 横長すぎて 0.2 倍が必要だが下限 0.3 で止まる
    const wide = fitView({ width: 400, height: 400 }, { x: 0, y: 0, w: 2000, h: 100 }, 0);
    expect(wide.scale).toBe(MIN_SCALE);
    // 小さなボックスは拡大しすぎないよう上限で止まる
    const tiny = fitView({ width: 800, height: 600 }, { x: 0, y: 0, w: 10, h: 10 }, 0);
    expect(tiny.scale).toBe(MAX_SCALE);
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
