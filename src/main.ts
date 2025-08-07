import './style.css';
import { Canvas } from './canvas';
import { Inspector } from './inspector';
import { NODE_H, NODE_W } from './geometry';
import { Palette } from './palette';
import { Store } from './store';
import { Toolbar } from './toolbar';

const app = document.getElementById('app');
if (!app) throw new Error('#app が見つからない');

const store = new Store();
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

// 選択中の要素を Delete / Backspace で削除する。入力中は無視する。
window.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
  const tag = (ev.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (store.selection.kind !== 'none') {
    ev.preventDefault();
    store.deleteSelected();
  }
});
