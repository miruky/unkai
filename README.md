# unkai

[![CI](https://github.com/miruky/unkai/actions/workflows/ci.yml/badge.svg)](https://github.com/miruky/unkai/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Test](https://img.shields.io/badge/Test-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AWS・GCP・Azureのサービスをホワイトボードに並べ、矢印で繋いで構成を設計するブラウザツールです。**

## 概要

パレットからサービスを置き、ポートをドラッグして矢印で繋ぐと、クラウド構成図がそのまま編集可能なデータになります。各ノードを選ぶと、そのサービス固有の設定項目(Lambdaのメモリやランタイム、S3のストレージクラスなど)を編集でき、内容はブラウザに自動保存されます。構成チェックで接続のない孤立ノードを洗い出し、JSONとして書き出し・読み込みもできます。サーバーを持たず、図の状態はすべて手元で完結します。

サービスと設定項目はコード中のカタログにデータとして定義してあり、項目を増やすにはその配列に足すだけです。クラウドの全サービスを一度に網羅することは現実的ではないため、主要カテゴリの代表的なサービスを起点に、拡張しやすい構造そのものを設計の核に据えています。

遊ぶ: https://miruky.github.io/unkai/

### なぜ作ったのか

クラウド構成の検討は、図を描くツールと設定を書くツールが分かれていて、図はただの絵、設定は別のどこか、という分断が起きがちです。図のノードがそのまま設定を持つ編集可能なオブジェクトであれば、設計と記録が一つになります。3クラウドを同じ画面で扱えるのは、移行や比較の検討にも効きます。それを軽量なブラウザツールで実現したくて作りました。

## 使い方

- **配置** — 左のパレットでサービスをクリックすると、中央に置かれます
- **移動** — ノードをドラッグして動かします。背景のドラッグでパン、ホイールでズーム
- **接続** — ノード右側の出力ポートから、別ノード左側へドラッグして矢印を引きます
- **設定** — ノードを選ぶと右の詳細パネルで設定項目と表示名を編集できます
- **削除** — ノードや矢印を選んで Delete キー、または詳細パネルの削除ボタン
- **構成チェック** — 接続のない孤立ノードを一覧します
- **書き出し / 読み込み** — 図をJSONファイルとして保存・復元します(自動保存とは別に共有用)

## アーキテクチャ

![unkaiのアーキテクチャ](docs/architecture.svg)

サービス定義(`catalog`)・図のデータ構造(`model`)・状態管理(`Store`)を中心に置き、UI(パレット・キャンバス・詳細パネル)は状態を読んで描画し、操作を状態へ反映するだけにしています。キャンバスはSVGで、パン・ズームはviewBox、ノードと矢印はそれぞれSVG要素として描きます。モデルと座標計算はDOMから独立しているため、接続規則や直列化をブラウザなしでテストできます。

## 技術スタック

| カテゴリ | 技術 |
|:--|:--|
| 言語 | TypeScript 5(strict) |
| 描画 | SVG(ライブラリ非依存) |
| ビルド | Vite |
| 保存 | localStorage + JSON入出力 |
| テスト | Vitest(18テスト) |
| リンタ | ESLint + Prettier |
| CI / CD | GitHub Actions |
| 配信 | GitHub Pages |

## プロジェクト構成

- `src/catalog.ts` — サービスと設定項目のデータ定義(拡張点)
- `src/model.ts` — 図のデータ構造、接続規則、直列化と検証
- `src/geometry.ts` — ノード寸法・ポート位置・矢印経路・座標変換
- `src/store.ts` — 状態管理と自動保存
- `src/canvas.ts` — SVGキャンバスの描画とポインタ操作
- `src/palette.ts` / `src/inspector.ts` / `src/toolbar.ts` — 各UIパネル
- `src/main.ts` — 全体の組み立て
- `docs/architecture.svg` — アーキテクチャ図

## はじめ方

### 前提条件

- Node.js 20 以上

### セットアップ

```bash
git clone https://github.com/miruky/unkai.git
cd unkai
npm install
npm run dev
```

### テストの実行

```bash
npm test
```

### Lintの実行

```bash
npm run lint
```

### デプロイ

`main` ブランチへのプッシュで GitHub Actions がビルドし、GitHub Pages へ配信します。

## 設計方針

- **データ駆動のカタログ** — サービスと設定項目を1か所のデータに集約し、UIとモデルはそれを読むだけにする。網羅範囲はデータの追加で広げる
- **状態の一元管理** — 図・選択・ビューをStoreに集め、UIは購読して描画する一方向の流れにする
- **モデルとUIの分離** — 接続規則・直列化・座標計算をDOM非依存にし、テストで担保する
- **壊れた保存データに強い** — 復元時に未知サービスや端点を失った辺を取り除き、欠けた設定は既定で補う

## 制約

実在するクラウドの全サービス・全設定項目を網羅するものではなく、主要サービスの代表的な設定を扱います。コスト見積もりやデプロイ連携は行わず、設計と記録に用途を絞っています。

## ライセンス

[MIT](LICENSE)
