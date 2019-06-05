import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const CONFIGS = [
  {
    heading: "List example",
    config: `
- type: shopping-list
    `,
  },
  {
    heading: "List with title example",
    config: `
- type: shopping-list
  title: Shopping List
    `,
  },
];

class DemoShoppingListEntity extends PolymerElement {
  static get template() {
    return html`
      <demo-cards id="demos" configs="[[_configs]]"></demo-cards>
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

  public ready() {
    super.ready();
    const hass = provideHass(this.$.demos);

    hass.mockAPI("shopping_list", () => [
      { name: "list", id: 1, complete: false },
      { name: "all", id: 2, complete: false },
      { name: "the", id: 3, complete: false },
      { name: "things", id: 4, complete: true },
    ]);
  }
}

customElements.define("demo-hui-shopping-list-card", DemoShoppingListEntity);
