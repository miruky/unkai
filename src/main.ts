import './style.css';
import { Canvas } from './canvas';
import { Inspector } from './inspector';
import { NODE_H, NODE_W } from './geometry';
import { Palette } from './palette';
import { diagramFromHash } from './share';
import { Store } from './store';
import { toast } from './toast';
import { Toolbar } from './toolbar';

const app = document.getElementById('app');
if (!app) throw new Error('#app が見つからない');

const store = new Store();

// 共有リンクで開かれたら、ハッシュの図を取り込んでからアドレスを元に戻す。
try {
  const shared = diagramFromHash(location.hash);
  if (shared) {
    store.replace(shared);
    history.replaceState(null, '', location.pathname + location.search);
  }
} catch {
  toast('共有リンクの図を読み込めませんでした。', 'error');
}

const canvas = new Canvas(store);

const palette = new Palette((serviceId) => {
  const center = canvas.centerWorld();
  // 連続追加が重ならないよう少しずつずらす
  const offset = (store.diagram.nodes.length % 5) * 24;
  store.addNode(serviceId, center.x - NODE_W / 2 + offset, center.y - NODE_H / 2 + offset);
});

const inspector = new Inspector(store);
const toolbar = new Toolbar(store);

app.className = 'app';
const layout = document.createElement('div');
layout.className = 'layout';
const canvasHost = document.createElement('main');
canvasHost.className = 'canvas-host';

layout.append(palette.root, canvasHost, inspector.root);
app.append(toolbar.root, layout);
canvas.mount(canvasHost);

// キーボード操作。入力欄にフォーカスがあるときはブラウザ標準に譲る。
window.addEventListener('keydown', (ev) => {
  const target = ev.target as HTMLElement;
  const typing =
    target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

  if (typing) {
    // 編集中の Escape は入力欄から抜ける。それ以外は標準の挙動(テキストのundo等)に任せる。
    if (ev.key === 'Escape') target.blur();
    return;
  }

  const mod = ev.metaKey || ev.ctrlKey;
  // 表示倍率(修飾キー無し)。+ / - / 0(リセット)/ f(全体表示)。
  if (!mod) {
    if (ev.key === '+' || ev.key === '=') {
      ev.preventDefault();
      canvas.zoomIn();
      return;
    }
    if (ev.key === '-' || ev.key === '_') {
      ev.preventDefault();
      canvas.zoomOut();
      return;
    }
    if (ev.key === '0') {
      ev.preventDefault();
      canvas.resetView();
      return;
    }
    if (ev.key === 'f' || ev.key === 'F') {
      ev.preventDefault();
      canvas.fitToContent();
      return;
    }
  }
  if (mod && (ev.key === 'z' || ev.key === 'Z')) {
    ev.preventDefault();
    if (ev.shiftKey) store.redo();
    else store.undo();
    return;
  }
  if (mod && (ev.key === 'y' || ev.key === 'Y')) {
    ev.preventDefault();
    store.redo();
    return;
  }
  if (mod && (ev.key === 'd' || ev.key === 'D')) {
    if (store.selection.kind === 'node') {
      ev.preventDefault();
      store.duplicateSelected();
    }
    return;
  }
  if (ev.key === 'Escape') {
    if (store.linking !== null) store.cancelLink();
    else if (store.selection.kind !== 'none') store.select({ kind: 'none' });
    return;
  }
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (store.selection.kind !== 'none') {
      ev.preventDefault();
      store.deleteSelected();
    }
  }
});
