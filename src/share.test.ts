import { describe, expect, it } from 'vitest';
import { connect, createNode, emptyDiagram } from './model';
import { decodeDiagram, diagramFromHash, encodeDiagram } from './share';

describe('share コーデック', () => {
  it('日本語ラベルを含む図を往復できる', () => {
    const d = emptyDiagram();
    const a = createNode('aws.lambda', 0, 0);
    a.label = '認証ハンドラ';
    const b = createNode('aws.s3', 100, 0);
    d.nodes.push(a, b);
    connect(d, a.id, b.id);

    const restored = decodeDiagram(encodeDiagram(d));
    expect(restored.nodes).toHaveLength(2);
    expect(restored.nodes[0]!.label).toBe('認証ハンドラ');
    expect(restored.edges).toHaveLength(1);
  });

  it('ハッシュ文字列から図を取り出す', () => {
    const d = emptyDiagram();
    d.nodes.push(createNode('gcp.run', 0, 0));
    const got = diagramFromHash(`#d=${encodeDiagram(d)}`);
    expect(got?.nodes).toHaveLength(1);
  });

  it('図のないハッシュは null', () => {
    expect(diagramFromHash('')).toBeNull();
    expect(diagramFromHash('#foo=bar')).toBeNull();
  });
});
