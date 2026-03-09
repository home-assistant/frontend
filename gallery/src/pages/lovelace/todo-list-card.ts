import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { mockTodo } from "../../../../demo/src/stubs/todo";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  {
    entity_id: "todo.shopping_list",
    state: "2",
    attributes: {
      friendly_name: "Shopping List",
      supported_features: 15,
    },
  },
  {
    entity_id: "todo.read_only",
    state: "2",
    attributes: {
      friendly_name: "Read only",
    },
  },
];

const CONFIGS = [
  {
    heading: "List example",
    config: `
- type: todo-list
  entity: todo.shopping_list
    `,
  },
  {
    heading: "List with title example",
    config: `
- type: todo-list
  title: Shopping List
  entity: todo.read_only
    `,
  },
];

@customElement("demo-lovelace-todo-list-card")
class DemoTodoListEntity extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    mockIcons(hass);

    mockTodo(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-todo-list-card": DemoTodoListEntity;
  }
}
