import { CATEGORY_LABEL, filterServices, PROVIDERS, type Provider } from './catalog';

// 左のサービス一覧。検索で絞り込め、プロバイダごとにまとめてクリックで配置する。
export class Palette {
  readonly root = document.createElement('aside');
  private list = document.createElement('div');
  private query = '';
  private firstRender = true;

  constructor(private readonly onAdd: (serviceId: string) => void) {
    this.root.className = 'palette';
    this.build();
    this.renderList();
  }

  private build(): void {
    const heading = document.createElement('h2');
    heading.textContent = 'サービス';

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'palette-search';
    search.placeholder = 'サービスを検索';
    search.setAttribute('aria-label', 'サービスを検索');
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderList();
    });

    this.list.className = 'palette-list';
    this.root.append(heading, search, this.list);
  }

  private renderList(): void {
    this.list.replaceChildren();
    const services = filterServices(this.query);
    let index = 0;
    let shown = 0;

    for (const provider of Object.keys(PROVIDERS) as Provider[]) {
      const matched = services.filter((s) => s.provider === provider);
      if (matched.length === 0) continue;
      shown += matched.length;

      const section = document.createElement('section');
      section.className = 'palette-provider';

      const title = document.createElement('h3');
      const dot = document.createElement('span');
      dot.className = 'provider-dot';
      dot.style.background = PROVIDERS[provider].color;
      title.append(dot, document.createTextNode(PROVIDERS[provider].label));
      section.appendChild(title);

      for (const service of matched) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-item';
        // 入場アニメーションは初回のみ。検索のたびに動くと煩いので付け直さない。
        if (this.firstRender) {
          btn.classList.add('is-enter');
          btn.style.animationDelay = `${Math.min(index, 16) * 26}ms`;
        }
        index += 1;
        btn.title = `${service.name}(${CATEGORY_LABEL[service.category]})`;
        const name = document.createElement('span');
        name.className = 'palette-name';
        name.textContent = service.name;
        const cat = document.createElement('span');
        cat.className = 'palette-cat';
        cat.textContent = CATEGORY_LABEL[service.category];
        btn.append(name, cat);
        btn.addEventListener('click', () => this.onAdd(service.id));
        section.appendChild(btn);
      }
      this.list.appendChild(section);
    }

    if (shown === 0) {
      const empty = document.createElement('p');
      empty.className = 'palette-empty';
      empty.textContent = '該当するサービスがありません。';
      this.list.appendChild(empty);
    }
    this.firstRender = false;
  }
}
