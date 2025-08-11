import { describe, expect, it } from 'vitest';
import { Store } from './store';

function selectedId(store: Store): string {
  return store.selection.kind === 'node' ? store.selection.id : '';
}

describe('Store 履歴', () => {
  it('addNode を undo で取り消し、redo で復元する', () => {
    const s = new Store();
    expect(s.canUndo).toBe(false);
    s.addNode('aws.lambda', 0, 0);
    expect(s.diagram.nodes).toHaveLength(1);
    expect(s.canUndo).toBe(true);
    s.undo();
    expect(s.diagram.nodes).toHaveLength(0);
    expect(s.canRedo).toBe(true);
    s.redo();
    expect(s.diagram.nodes).toHaveLength(1);
  });

  it('新しい操作は redo 履歴を捨てる', () => {
    const s = new Store();
    s.addNode('aws.lambda', 0, 0);
    s.undo();
    expect(s.canRedo).toBe(true);
    s.addNode('aws.s3', 0, 0);
    expect(s.canRedo).toBe(false);
  });

  it('同じ設定欄への連続変更は1つの履歴にまとめる', () => {
    const s = new Store();
    s.addNode('aws.lambda', 0, 0);
    const id = selectedId(s);
    s.setConfig(id, 'memory', 256);
    s.setConfig(id, 'memory', 512);
    s.undo();
    const node = s.diagram.nodes.find((n) => n.id === id);
    expect(node?.config.memory).toBe(128);
  });

  it('1ドラッグ分の移動は undo 1回で戻る', () => {
    const s = new Store();
    s.addNode('aws.lambda', 0, 0);
    const id = selectedId(s);
    s.moveNode(id, 50, 60);
    s.moveNode(id, 80, 90);
    s.commit();
    s.undo();
    const node = s.diagram.nodes.find((n) => n.id === id);
    expect(node?.x).toBe(0);
    expect(node?.y).toBe(0);
  });
});

describe('Store 複製', () => {
  it('選択ノードを少しずらして複製し、複製を選択する', () => {
    const s = new Store();
    s.addNode('aws.lambda', 10, 20);
    const original = selectedId(s);
    s.duplicateSelected();
    expect(s.diagram.nodes).toHaveLength(2);
    const copy = s.diagram.nodes[1]!;
    expect(copy.serviceId).toBe('aws.lambda');
    expect(copy.x).toBe(34);
    expect(copy.y).toBe(44);
    expect(copy.id).not.toBe(original);
    expect(selectedId(s)).toBe(copy.id);
  });

  it('未選択では複製しない', () => {
    const s = new Store();
    s.duplicateSelected();
    expect(s.diagram.nodes).toHaveLength(0);
  });
});

describe('Store 接続モード', () => {
  function twoNodes(s: Store): [string, string] {
    s.addNode('aws.lambda', 0, 0);
    const a = selectedId(s);
    s.addNode('aws.s3', 60, 0);
    const b = selectedId(s);
    return [a, b];
  }

  it('startLink から completeLink で辺を張る', () => {
    const s = new Store();
    const [a, b] = twoNodes(s);
    s.startLink(a);
    expect(s.linking).toBe(a);
    s.completeLink(b);
    expect(s.linking).toBeNull();
    expect(s.diagram.edges).toHaveLength(1);
  });

  it('同じノードへ確定しても辺は張らずモードを抜ける', () => {
    const s = new Store();
    const [a] = twoNodes(s);
    s.startLink(a);
    s.completeLink(a);
    expect(s.linking).toBeNull();
    expect(s.diagram.edges).toHaveLength(0);
  });

  it('cancelLink でモードを抜ける', () => {
    const s = new Store();
    const [a] = twoNodes(s);
    s.startLink(a);
    s.cancelLink();
    expect(s.linking).toBeNull();
  });

  it('存在しないノードからは始めない', () => {
    const s = new Store();
    s.startLink('missing');
    expect(s.linking).toBeNull();
  });

  it('ノード削除で接続モードを解除する', () => {
    const s = new Store();
    s.addNode('aws.lambda', 0, 0);
    const a = selectedId(s);
    s.startLink(a);
    s.deleteSelected();
    expect(s.linking).toBeNull();
  });
});

describe('Store 接続ラベル', () => {
  function oneEdge(s: Store): string {
    s.addNode('aws.lambda', 0, 0);
    const a = selectedId(s);
    s.addNode('aws.s3', 60, 0);
    const b = selectedId(s);
    s.link(a, b);
    return s.diagram.edges[0]!.id;
  }

  it('ラベルを設定し、空文字で消す', () => {
    const s = new Store();
    const id = oneEdge(s);
    s.setEdgeLabel(id, '  events  ');
    expect(s.diagram.edges[0]!.label).toBe('events');
    s.setEdgeLabel(id, '   ');
    expect(s.diagram.edges[0]!.label).toBeUndefined();
  });

  it('ラベル変更は undo で戻る', () => {
    const s = new Store();
    const id = oneEdge(s);
    s.setEdgeLabel(id, 'HTTPS');
    s.undo();
    expect(s.diagram.edges[0]!.label).toBeUndefined();
  });
});
