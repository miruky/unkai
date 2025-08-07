import { describe, expect, it } from 'vitest';
import {
  connect,
  createNode,
  deserialize,
  emptyDiagram,
  isolatedNodes,
  removeNode,
  serialize,
} from './model';

function diagramWith(...serviceIds: string[]) {
  const d = emptyDiagram();
  for (const id of serviceIds) d.nodes.push(createNode(id, 0, 0));
  return d;
}

describe('createNode', () => {
  it('既定の設定値を展開する', () => {
    const node = createNode('aws.lambda', 10, 20);
    expect(node.serviceId).toBe('aws.lambda');
    expect(node.config.memory).toBe(128);
    expect(node.config.runtime).toBe('nodejs20.x');
    expect(node.label).toBe('Lambda');
  });

  it('未知のサービスは例外', () => {
    expect(() => createNode('aws.unknown', 0, 0)).toThrow();
  });
});

describe('connect', () => {
  it('辺を張る', () => {
    const d = diagramWith('aws.lambda', 'aws.s3');
    const [a, b] = d.nodes;
    expect(connect(d, a!.id, b!.id)).not.toBeNull();
    expect(d.edges).toHaveLength(1);
  });

  it('自己ループは張らない', () => {
    const d = diagramWith('aws.lambda');
    const a = d.nodes[0]!;
    expect(connect(d, a.id, a.id)).toBeNull();
  });

  it('重複辺は張らない', () => {
    const d = diagramWith('aws.lambda', 'aws.s3');
    const [a, b] = d.nodes;
    connect(d, a!.id, b!.id);
    expect(connect(d, a!.id, b!.id)).toBeNull();
    expect(d.edges).toHaveLength(1);
  });

  it('存在しないノードには張らない', () => {
    const d = diagramWith('aws.lambda');
    expect(connect(d, d.nodes[0]!.id, 'missing')).toBeNull();
  });
});

describe('removeNode', () => {
  it('ノードと接続辺をまとめて消す', () => {
    const d = diagramWith('aws.lambda', 'aws.s3', 'aws.dynamodb');
    const [a, b, c] = d.nodes;
    connect(d, a!.id, b!.id);
    connect(d, b!.id, c!.id);
    removeNode(d, b!.id);
    expect(d.nodes).toHaveLength(2);
    expect(d.edges).toHaveLength(0);
  });
});

describe('isolatedNodes', () => {
  it('接続のないノードだけ返す', () => {
    const d = diagramWith('aws.lambda', 'aws.s3', 'aws.rds');
    const [a, b, c] = d.nodes;
    connect(d, a!.id, b!.id);
    expect(isolatedNodes(d)).toEqual([c!.id]);
  });
});

describe('serialize と deserialize', () => {
  it('往復で内容が保たれる', () => {
    const d = diagramWith('aws.lambda', 'gcp.run');
    connect(d, d.nodes[0]!.id, d.nodes[1]!.id);
    d.nodes[0]!.config.memory = 512;
    const restored = deserialize(serialize(d));
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);
    expect(restored.nodes[0]!.config.memory).toBe(512);
  });

  it('未知サービスのノードと端点を失った辺を捨てる', () => {
    const text = JSON.stringify({
      version: 1,
      diagram: {
        nodes: [
          { id: 'n1', serviceId: 'aws.lambda', x: 0, y: 0, label: 'L', config: {} },
          { id: 'n2', serviceId: 'aws.ghost', x: 0, y: 0, label: 'X', config: {} },
        ],
        edges: [
          { id: 'e1', from: 'n1', to: 'n2' },
          { id: 'e2', from: 'n1', to: 'n1' },
        ],
      },
    });
    const d = deserialize(text);
    expect(d.nodes).toHaveLength(1);
    expect(d.edges).toHaveLength(0);
  });

  it('欠けた設定値は既定で補う', () => {
    const text = JSON.stringify({
      version: 1,
      diagram: { nodes: [{ id: 'n1', serviceId: 'aws.lambda', x: 0, y: 0 }], edges: [] },
    });
    const d = deserialize(text);
    expect(d.nodes[0]!.config.timeout).toBe(3);
  });

  it('壊れたJSONは例外', () => {
    expect(() => deserialize('{ broken')).toThrow();
  });
});
