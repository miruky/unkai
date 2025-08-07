import { CATEGORY_LABEL, PROVIDERS, SERVICES, type Provider } from './catalog';

// 左のサービス一覧。プロバイダごとにまとめ、クリックでノードを追加する。
export class Palette {
  readonly root = document.createElement('aside');

  constructor(private readonly onAdd: (serviceId: string) => void) {
    this.root.className = 'palette';
    this.render();
  }

  private render(): void {
    this.root.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = 'サービス';
    this.root.appendChild(heading);

    for (const provider of Object.keys(PROVIDERS) as Provider[]) {
      const section = document.createElement('section');
      section.className = 'palette-provider';

      const title = document.createElement('h3');
      const dot = document.createElement('span');
      dot.className = 'provider-dot';
      dot.style.background = PROVIDERS[provider].color;
      title.append(dot, document.createTextNode(PROVIDERS[provider].label));
      section.appendChild(title);

      for (const service of SERVICES.filter((s) => s.provider === provider)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-item';
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
      this.root.appendChild(section);
    }
  }
}
