import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/demo-cards";

const CONFIGS = [
  {
    heading: "Without title",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
    `,
  },
  {
    heading: "With title",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  title: Weather radar
    `,
  },
  {
    heading: "Height-Width 3:4",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  aspect_ratio: 75%
    `,
  },
  {
    heading: "Height-Width 1:1",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  aspect_ratio: 100%
    `,
  },
];

class DemoIframe extends PolymerElement {
  static get template() {
    return html`
      <demo-cards configs="[[_configs]]"></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
    };
  }
}

customElements.define("demo-hui-iframe-card", DemoIframe);
