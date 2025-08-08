import { describe, expect, it } from 'vitest';
import { defaultConfig, filterServices, SERVICES, serviceById } from './catalog';

describe('catalog', () => {
  it('サービスidは重複しない', () => {
    const ids = SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('既定設定は全フィールドを既定値で埋める', () => {
    for (const s of SERVICES) {
      const cfg = defaultConfig(s);
      for (const f of s.fields) expect(cfg[f.key]).toBe(f.default);
    }
  });

  it('selectの既定値は選択肢に含まれる', () => {
    for (const s of SERVICES) {
      for (const f of s.fields) {
        if (f.type === 'select') {
          expect(f.options, `${s.id}.${f.key}`).toBeDefined();
          expect(f.options, `${s.id}.${f.key}`).toContain(f.default);
        }
      }
    }
  });

  it('全7カテゴリに少なくとも1サービスある', () => {
    const cats = new Set(SERVICES.map((s) => s.category));
    for (const c of ['compute', 'storage', 'database', 'network', 'messaging', 'analytics', 'security']) {
      expect(cats.has(c as (typeof SERVICES)[number]['category'])).toBe(true);
    }
  });

  it('filterServicesは名前・カテゴリで絞り込む', () => {
    expect(filterServices('lambda').some((s) => s.id === 'aws.lambda')).toBe(true);
    expect(filterServices('セキュリティ').every((s) => s.category === 'security')).toBe(true);
    expect(filterServices('')).toBe(SERVICES);
    expect(filterServices('該当なしxyz')).toHaveLength(0);
  });

  it('serviceByは未知idでundefined', () => {
    expect(serviceById('nope')).toBeUndefined();
  });
});
