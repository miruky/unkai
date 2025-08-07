import { deserialize, serialize, type Diagram } from './model';

// 図をUTF-8対応のbase64url文字列にする。日本語ラベルも壊さず、URLのハッシュに載る。
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDiagram(diagram: Diagram): string {
  return toBase64Url(serialize(diagram));
}

// 壊れた入力はdeserializeが弾く。健全なノード・辺だけが復元される。
export function decodeDiagram(encoded: string): Diagram {
  return deserialize(fromBase64Url(encoded));
}

const HASH_KEY = 'd';

// 現在のページに図を載せた共有用URLを作る。
export function shareUrl(diagram: Diagram): string {
  return `${location.origin}${location.pathname}#${HASH_KEY}=${encodeDiagram(diagram)}`;
}

// ハッシュ文字列に図が載っていれば取り出す。無ければnull、壊れていれば例外。
export function diagramFromHash(hash: string): Diagram | null {
  const m = hash.match(new RegExp(`[#&]${HASH_KEY}=([^&]+)`));
  if (!m) return null;
  return decodeDiagram(m[1]!);
}
