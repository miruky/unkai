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
