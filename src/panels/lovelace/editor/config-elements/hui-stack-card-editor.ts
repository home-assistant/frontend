import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { StackCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../card-editor/hui-card-list-editor";
import type {
  CardsChangedEvent,
  HuiCardListEditor,
} from "../card-editor/hui-card-list-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    cards: array(any()),
    title: optional(string()),
  })
);

const SCHEMA = [
  {
    name: "title",
    selector: { text: {} },
  },
] as const;

@customElement("hui-stack-card-editor")
export class HuiStackCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() protected _config?: StackCardConfig;

  protected _schema: readonly HaFormSchema[] = SCHEMA;

  @query("hui-card-list-editor")
  protected _cardListEditorEl?: HuiCardListEditor;

  public setConfig(config: Readonly<StackCardConfig>): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  public focusYamlEditor() {
    this._cardListEditorEl?.focusYamlEditor();
  }

  protected formData(): object {
    return this._config!;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.formData()}
        .schema=${this._schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-card-list-editor
        .hass=${this.hass}
        .lovelace=${this.lovelace}
        .cards=${this._config.cards}
        show-copy-cut
        @cards-changed=${this._cardsChanged}
      ></hui-card-list-editor>
    `;
  }

  protected _cardsChanged(ev: HASSDomEvent<CardsChangedEvent>) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    this._config = {
      ...this._config,
      cards: ev.detail.cards,
    };
    fireEvent(this, "config-changed", {
      config: this._config,
      guiModeAvailable: ev.detail.guiModeAvailable,
    });
  }

  protected _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  protected _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.card.${this._config!.type}.${schema.name}`
    );

  static styles = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-card-editor": HuiStackCardEditor;
  }
}
