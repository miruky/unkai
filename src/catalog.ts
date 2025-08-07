// クラウドサービスのカタログ。サービスと設定項目はすべてここにデータとして
// 定義し、UIやモデルはこの定義を読むだけにする。サービスや設定項目の追加は
// この配列に足すだけで完結する(網羅範囲を広げるための拡張点)。

export type Provider = 'aws' | 'gcp' | 'azure';

export type FieldType = 'text' | 'number' | 'boolean' | 'select';

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  default: string | number | boolean;
  options?: string[];
  unit?: string;
}

export interface ServiceDef {
  id: string; // 一意。例: aws.lambda
  provider: Provider;
  category: Category;
  name: string;
  abbr: string; // ノードに出す略号
  fields: ConfigField[];
}

export type Category =
  | 'compute'
  | 'storage'
  | 'database'
  | 'network'
  | 'messaging'
  | 'analytics'
  | 'security';

export const PROVIDERS: Record<Provider, { label: string; color: string }> = {
  aws: { label: 'AWS', color: '#ff9900' },
  gcp: { label: 'Google Cloud', color: '#4285f4' },
  azure: { label: 'Azure', color: '#0078d4' },
};

export const CATEGORY_LABEL: Record<Category, string> = {
  compute: 'コンピュート',
  storage: 'ストレージ',
  database: 'データベース',
  network: 'ネットワーク',
  messaging: 'メッセージング',
  analytics: '分析',
  security: 'セキュリティ',
};

// カテゴリのSVGアイコン(24x24 viewBox内のpath。currentColorで描く)
export const CATEGORY_ICON: Record<Category, string> = {
  compute: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  storage: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6"/>',
  network: '<circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 7.4 6.6 15.8M12 7.4l5.4 8.4M7.4 18h9.2"/>',
  messaging: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M3.5 6 12 13l8.5-7"/>',
  analytics: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  security: '<path d="M12 3 5 6v5c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
};

export const SERVICES: ServiceDef[] = [
  // AWS
  {
    id: 'aws.lambda',
    provider: 'aws',
    category: 'compute',
    name: 'Lambda',
    abbr: 'λ',
    fields: [
      { key: 'memory', label: 'メモリ', type: 'number', default: 128, unit: 'MB' },
      { key: 'timeout', label: 'タイムアウト', type: 'number', default: 3, unit: '秒' },
      { key: 'runtime', label: 'ランタイム', type: 'select', default: 'nodejs20.x', options: ['nodejs20.x', 'python3.12', 'go1.x', 'java21'] },
      { key: 'arch', label: 'アーキテクチャ', type: 'select', default: 'arm64', options: ['arm64', 'x86_64'] },
    ],
  },
  {
    id: 'aws.ec2',
    provider: 'aws',
    category: 'compute',
    name: 'EC2',
    abbr: 'EC2',
    fields: [
      { key: 'instanceType', label: 'インスタンスタイプ', type: 'select', default: 't3.micro', options: ['t3.micro', 't3.small', 'm5.large', 'c6g.xlarge'] },
      { key: 'count', label: '台数', type: 'number', default: 1 },
      { key: 'publicIp', label: 'パブリックIP', type: 'boolean', default: false },
    ],
  },
  {
    id: 'aws.s3',
    provider: 'aws',
    category: 'storage',
    name: 'S3',
    abbr: 'S3',
    fields: [
      { key: 'storageClass', label: 'ストレージクラス', type: 'select', default: 'STANDARD', options: ['STANDARD', 'INTELLIGENT_TIERING', 'GLACIER'] },
      { key: 'versioning', label: 'バージョニング', type: 'boolean', default: false },
      { key: 'publicAccess', label: 'パブリックアクセス', type: 'boolean', default: false },
    ],
  },
  {
    id: 'aws.dynamodb',
    provider: 'aws',
    category: 'database',
    name: 'DynamoDB',
    abbr: 'DDB',
    fields: [
      { key: 'billing', label: '課金モード', type: 'select', default: 'on-demand', options: ['on-demand', 'provisioned'] },
      { key: 'pitr', label: 'ポイントインタイムリカバリ', type: 'boolean', default: true },
    ],
  },
  {
    id: 'aws.rds',
    provider: 'aws',
    category: 'database',
    name: 'RDS',
    abbr: 'RDS',
    fields: [
      { key: 'engine', label: 'エンジン', type: 'select', default: 'postgres', options: ['postgres', 'mysql', 'aurora-postgresql'] },
      { key: 'multiAz', label: 'マルチAZ', type: 'boolean', default: true },
      { key: 'storage', label: 'ストレージ', type: 'number', default: 20, unit: 'GB' },
    ],
  },
  {
    id: 'aws.apigw',
    provider: 'aws',
    category: 'network',
    name: 'API Gateway',
    abbr: 'API',
    fields: [
      { key: 'type', label: 'API種別', type: 'select', default: 'REST', options: ['REST', 'HTTP', 'WebSocket'] },
      { key: 'auth', label: '認可', type: 'select', default: 'none', options: ['none', 'IAM', 'Cognito', 'Lambda'] },
    ],
  },
  {
    id: 'aws.sqs',
    provider: 'aws',
    category: 'messaging',
    name: 'SQS',
    abbr: 'SQS',
    fields: [
      { key: 'fifo', label: 'FIFO', type: 'boolean', default: false },
      { key: 'visibility', label: '可視性タイムアウト', type: 'number', default: 30, unit: '秒' },
    ],
  },
  {
    id: 'aws.cloudfront',
    provider: 'aws',
    category: 'network',
    name: 'CloudFront',
    abbr: 'CF',
    fields: [
      { key: 'priceClass', label: '価格クラス', type: 'select', default: 'PriceClass_200', options: ['PriceClass_All', 'PriceClass_200', 'PriceClass_100'] },
      { key: 'http3', label: 'HTTP/3', type: 'boolean', default: true },
    ],
  },
  // GCP
  {
    id: 'gcp.run',
    provider: 'gcp',
    category: 'compute',
    name: 'Cloud Run',
    abbr: 'Run',
    fields: [
      { key: 'cpu', label: 'CPU', type: 'number', default: 1 },
      { key: 'memory', label: 'メモリ', type: 'select', default: '512Mi', options: ['256Mi', '512Mi', '1Gi', '2Gi'] },
      { key: 'minInstances', label: '最小インスタンス', type: 'number', default: 0 },
    ],
  },
  {
    id: 'gcp.gce',
    provider: 'gcp',
    category: 'compute',
    name: 'Compute Engine',
    abbr: 'GCE',
    fields: [
      { key: 'machineType', label: 'マシンタイプ', type: 'select', default: 'e2-medium', options: ['e2-micro', 'e2-medium', 'n2-standard-4'] },
      { key: 'preemptible', label: 'プリエンプティブル', type: 'boolean', default: false },
    ],
  },
  {
    id: 'gcp.gcs',
    provider: 'gcp',
    category: 'storage',
    name: 'Cloud Storage',
    abbr: 'GCS',
    fields: [
      { key: 'class', label: 'ストレージクラス', type: 'select', default: 'STANDARD', options: ['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'] },
      { key: 'location', label: 'ロケーション', type: 'select', default: 'asia-northeast1', options: ['asia-northeast1', 'us-central1', 'europe-west1'] },
    ],
  },
  {
    id: 'gcp.firestore',
    provider: 'gcp',
    category: 'database',
    name: 'Firestore',
    abbr: 'FS',
    fields: [
      { key: 'mode', label: 'モード', type: 'select', default: 'native', options: ['native', 'datastore'] },
    ],
  },
  {
    id: 'gcp.pubsub',
    provider: 'gcp',
    category: 'messaging',
    name: 'Pub/Sub',
    abbr: 'P/S',
    fields: [
      { key: 'retention', label: 'メッセージ保持', type: 'number', default: 7, unit: '日' },
      { key: 'ordering', label: '順序保証', type: 'boolean', default: false },
    ],
  },
  {
    id: 'gcp.bigquery',
    provider: 'gcp',
    category: 'analytics',
    name: 'BigQuery',
    abbr: 'BQ',
    fields: [
      { key: 'pricing', label: '料金モデル', type: 'select', default: 'on-demand', options: ['on-demand', 'capacity'] },
      { key: 'location', label: 'ロケーション', type: 'select', default: 'asia-northeast1', options: ['asia-northeast1', 'US', 'EU'] },
    ],
  },
  // Azure
  {
    id: 'azure.functions',
    provider: 'azure',
    category: 'compute',
    name: 'Functions',
    abbr: 'Fn',
    fields: [
      { key: 'plan', label: 'プラン', type: 'select', default: 'consumption', options: ['consumption', 'premium', 'dedicated'] },
      { key: 'runtime', label: 'ランタイム', type: 'select', default: 'node', options: ['node', 'dotnet', 'python', 'java'] },
    ],
  },
  {
    id: 'azure.vm',
    provider: 'azure',
    category: 'compute',
    name: 'Virtual Machines',
    abbr: 'VM',
    fields: [
      { key: 'size', label: 'サイズ', type: 'select', default: 'Standard_B2s', options: ['Standard_B1s', 'Standard_B2s', 'Standard_D4s_v5'] },
      { key: 'count', label: '台数', type: 'number', default: 1 },
    ],
  },
  {
    id: 'azure.blob',
    provider: 'azure',
    category: 'storage',
    name: 'Blob Storage',
    abbr: 'Blob',
    fields: [
      { key: 'tier', label: 'アクセス層', type: 'select', default: 'Hot', options: ['Hot', 'Cool', 'Archive'] },
      { key: 'redundancy', label: '冗長性', type: 'select', default: 'LRS', options: ['LRS', 'ZRS', 'GRS'] },
    ],
  },
  {
    id: 'azure.cosmos',
    provider: 'azure',
    category: 'database',
    name: 'Cosmos DB',
    abbr: 'Cos',
    fields: [
      { key: 'api', label: 'API', type: 'select', default: 'core-sql', options: ['core-sql', 'mongo', 'cassandra'] },
      { key: 'consistency', label: '整合性', type: 'select', default: 'session', options: ['strong', 'bounded', 'session', 'eventual'] },
    ],
  },
  {
    id: 'azure.servicebus',
    provider: 'azure',
    category: 'messaging',
    name: 'Service Bus',
    abbr: 'SB',
    fields: [
      { key: 'tier', label: 'レベル', type: 'select', default: 'standard', options: ['basic', 'standard', 'premium'] },
      { key: 'sessions', label: 'セッション', type: 'boolean', default: false },
    ],
  },
  {
    id: 'azure.frontdoor',
    provider: 'azure',
    category: 'network',
    name: 'Front Door',
    abbr: 'FD',
    fields: [
      { key: 'tier', label: 'レベル', type: 'select', default: 'standard', options: ['standard', 'premium'] },
      { key: 'waf', label: 'WAF', type: 'boolean', default: true },
    ],
  },
  // 追加サービス(カバレッジ拡充。分析・セキュリティのカテゴリもここで埋める)
  {
    id: 'aws.ecs',
    provider: 'aws',
    category: 'compute',
    name: 'ECS',
    abbr: 'ECS',
    fields: [
      { key: 'launchType', label: '起動タイプ', type: 'select', default: 'fargate', options: ['fargate', 'ec2'] },
      { key: 'cpu', label: 'タスクCPU', type: 'select', default: '512', options: ['256', '512', '1024', '2048'] },
      { key: 'desiredCount', label: '希望タスク数', type: 'number', default: 2 },
    ],
  },
  {
    id: 'aws.efs',
    provider: 'aws',
    category: 'storage',
    name: 'EFS',
    abbr: 'EFS',
    fields: [
      { key: 'throughputMode', label: 'スループットモード', type: 'select', default: 'bursting', options: ['bursting', 'elastic', 'provisioned'] },
      { key: 'encrypted', label: '暗号化', type: 'boolean', default: true },
    ],
  },
  {
    id: 'aws.eventbridge',
    provider: 'aws',
    category: 'messaging',
    name: 'EventBridge',
    abbr: 'EB',
    fields: [
      { key: 'bus', label: 'イベントバス', type: 'select', default: 'default', options: ['default', 'custom'] },
      { key: 'archive', label: 'アーカイブ', type: 'boolean', default: false },
    ],
  },
  {
    id: 'aws.kinesis',
    provider: 'aws',
    category: 'analytics',
    name: 'Kinesis Data Streams',
    abbr: 'KDS',
    fields: [
      { key: 'mode', label: 'キャパシティモード', type: 'select', default: 'on-demand', options: ['on-demand', 'provisioned'] },
      { key: 'shards', label: 'シャード数', type: 'number', default: 1 },
    ],
  },
  {
    id: 'aws.cognito',
    provider: 'aws',
    category: 'security',
    name: 'Cognito',
    abbr: 'Cog',
    fields: [
      { key: 'mfa', label: 'MFA', type: 'select', default: 'optional', options: ['off', 'optional', 'required'] },
      { key: 'social', label: 'ソーシャルログイン', type: 'boolean', default: false },
    ],
  },
  {
    id: 'gcp.cloudsql',
    provider: 'gcp',
    category: 'database',
    name: 'Cloud SQL',
    abbr: 'SQL',
    fields: [
      { key: 'engine', label: 'エンジン', type: 'select', default: 'postgres', options: ['postgres', 'mysql', 'sqlserver'] },
      { key: 'tier', label: 'マシンタイプ', type: 'select', default: 'db-f1-micro', options: ['db-f1-micro', 'db-g1-small', 'db-custom-2-7680'] },
      { key: 'ha', label: '高可用性', type: 'boolean', default: false },
    ],
  },
  {
    id: 'gcp.secretmanager',
    provider: 'gcp',
    category: 'security',
    name: 'Secret Manager',
    abbr: 'SM',
    fields: [
      { key: 'replication', label: 'レプリケーション', type: 'select', default: 'automatic', options: ['automatic', 'user-managed'] },
    ],
  },
  {
    id: 'gcp.dataflow',
    provider: 'gcp',
    category: 'analytics',
    name: 'Dataflow',
    abbr: 'DF',
    fields: [
      { key: 'mode', label: 'モード', type: 'select', default: 'streaming', options: ['batch', 'streaming'] },
      { key: 'maxWorkers', label: '最大ワーカー', type: 'number', default: 5 },
    ],
  },
  {
    id: 'azure.aks',
    provider: 'azure',
    category: 'compute',
    name: 'AKS',
    abbr: 'AKS',
    fields: [
      { key: 'tier', label: 'レベル', type: 'select', default: 'free', options: ['free', 'standard'] },
      { key: 'nodeCount', label: 'ノード数', type: 'number', default: 3 },
    ],
  },
  {
    id: 'azure.sqldb',
    provider: 'azure',
    category: 'database',
    name: 'SQL Database',
    abbr: 'SQL',
    fields: [
      { key: 'tier', label: '価格帯', type: 'select', default: 'GeneralPurpose', options: ['Basic', 'GeneralPurpose', 'BusinessCritical'] },
      { key: 'zoneRedundant', label: 'ゾーン冗長', type: 'boolean', default: false },
    ],
  },
  {
    id: 'azure.keyvault',
    provider: 'azure',
    category: 'security',
    name: 'Key Vault',
    abbr: 'KV',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', default: 'standard', options: ['standard', 'premium'] },
      { key: 'softDelete', label: '論理削除', type: 'boolean', default: true },
    ],
  },
  {
    id: 'azure.synapse',
    provider: 'azure',
    category: 'analytics',
    name: 'Synapse Analytics',
    abbr: 'Syn',
    fields: [
      { key: 'dwu', label: 'DWU', type: 'select', default: 'DW100c', options: ['DW100c', 'DW200c', 'DW500c'] },
    ],
  },
];

const BY_ID = new Map(SERVICES.map((s) => [s.id, s]));

export function serviceById(id: string): ServiceDef | undefined {
  return BY_ID.get(id);
}

export function defaultConfig(def: ServiceDef): Record<string, string | number | boolean> {
  const config: Record<string, string | number | boolean> = {};
  for (const field of def.fields) config[field.key] = field.default;
  return config;
}

// 名前・略号・id・カテゴリ名・プロバイダ名のいずれかに含まれるかで絞り込む。
export function filterServices(query: string): ServiceDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return SERVICES;
  return SERVICES.filter((s) => {
    const hay =
      `${s.name} ${s.abbr} ${s.id} ${CATEGORY_LABEL[s.category]} ${PROVIDERS[s.provider].label}`.toLowerCase();
    return hay.includes(q);
  });
}
