// 操作とショートカットの一覧をモーダルで表示する。
// ネイティブ <dialog> を使い、フォーカストラップと Esc での閉じを標準に任せる。
const SHORTCUTS: [string, string][] = [
  ['配置', 'パレットのサービスをクリック、または検索して選ぶ'],
  ['接続', 'ポートをドラッグ、またはノードで c キーを押して接続先を選ぶ'],
  ['移動', 'ドラッグ、または選択して矢印キー(Shift で微調整)'],
  ['複製', 'Cmd / Ctrl + D'],
  ['削除', 'Delete または Backspace'],
  ['取り消し / やり直し', 'Cmd / Ctrl + Z / Shift を足してやり直し'],
  ['選択解除・接続中止', 'Esc'],
  ['表示', '背景ドラッグでパン、ホイールでズーム'],
];

let dialog: HTMLDialogElement | null = null;

function build(): HTMLDialogElement {
  const d = document.createElement('dialog');
  d.className = 'help-dialog';

  const heading = document.createElement('h2');
  heading.textContent = '操作とショートカット';

  const list = document.createElement('dl');
  list.className = 'help-list';
  for (const [term, desc] of SHORTCUTS) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = desc;
    list.append(dt, dd);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'help-close';
  close.textContent = '閉じる';
  close.addEventListener('click', () => d.close());

  // 背景(::backdrop)クリックでも閉じる
  d.addEventListener('click', (ev) => {
    if (ev.target === d) d.close();
  });

  d.append(heading, list, close);
  document.body.appendChild(d);
  return d;
}

export function showHelp(): void {
  if (!dialog) dialog = build();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
