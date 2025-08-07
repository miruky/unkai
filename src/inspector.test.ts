// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Store } from './store';
import { Inspector } from './inspector';

// 保存データがテスト間で残らないよう、構築直後に空へ戻して始める。
function freshStore(): Store {
  const store = new Store();
  store.clear();
  return store;
}

function selectedId(store: Store): string {
  return store.selection.kind === 'node' ? store.selection.id : '';
}

describe('Inspector', () => {
  it('ノードを選ぶと表示名と設定の入力を出す', () => {
    const store = freshStore();
    const inspector = new Inspector(store);
    store.addNode('aws.lambda', 0, 0);
    const fields = inspector.root.querySelectorAll('input, select');
    expect(fields.length).toBeGreaterThan(0);
  });

  it('同じノードの設定編集では入力要素を作り直さない', () => {
    const store = freshStore();
    const inspector = new Inspector(store);
    store.addNode('aws.lambda', 0, 0);
    const before = inspector.root.querySelector('select');
    store.setConfig(selectedId(store), 'memory', 256);
    const after = inspector.root.querySelector('select');
    // 作り直すと別要素になりフォーカスが外れる。同一参照であることを担保する。
    expect(after).toBe(before);
  });

  it('別のノードを選ぶと内容を作り直す', () => {
    const store = freshStore();
    const inspector = new Inspector(store);
    store.addNode('aws.lambda', 0, 0);
    const first = inspector.root.querySelector('.insp-body');
    store.addNode('aws.s3', 40, 40);
    const second = inspector.root.querySelector('.insp-body');
    expect(second).not.toBe(first);
  });

  it('選択を外すと案内文に戻る', () => {
    const store = freshStore();
    const inspector = new Inspector(store);
    store.addNode('aws.lambda', 0, 0);
    store.select({ kind: 'none' });
    expect(inspector.root.querySelector('.insp-hint')).not.toBeNull();
  });
});
