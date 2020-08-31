import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import "../../../../components/ha-formfield";
import { HomeAssistant } from "../../../../types";
import {
  EntitiesCardConfig,
  EntitiesCardEntityConfig,
} from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import {
  headerFooterConfigStructs,
  LovelaceHeaderFooterConfig,
} from "../../header-footer/types";
import type {
  LovelaceCardEditor,
  LovelaceHeaderFooterEditor,
} from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import {
  string,
  optional,
  object,
  boolean,
  array,
  union,
  assert,
} from "superstruct";
import {
  UIConfigChangedEvent,
  UIHeaderFooterConfigChangedEvent,
} from "../card-editor/hui-card-editor";
import { getHeaderFooterEditor } from "../get-header-footer-editor";
import "../hui-header-footer-dropdown";
import "../hui-advanced-element-editor";

const cardConfigStruct = object({
  type: string(),
  title: optional(union([string(), boolean()])),
  theme: optional(string()),
  show_header_toggle: optional(boolean()),
  entities: array(entitiesConfigStruct),
  header: optional(headerFooterConfigStructs),
  footer: optional(headerFooterConfigStructs),
});

@customElement("hui-entities-card-editor")
export class HuiEntitiesCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntitiesCardConfig;

  @internalProperty() private _configEntities?: EntitiesCardEntityConfig[];

  @internalProperty() private _footerElement?: LovelaceHeaderFooterEditor;

  @internalProperty() private _headerElement?: LovelaceHeaderFooterEditor;

  public setConfig(config: EntitiesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);

    if (this._config.footer?.type) {
      this._updateHeaderFooterElement(this._config.footer);
    }
    if (this._config.header?.type) {
      this._updateHeaderFooterElement(this._config.header);
    }
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <hui-advanced-element-editor>
        <div slot="editor">
          <div class="card-config">
            <paper-input
              .label="${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.title"
              )} (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})"
              .value=${this._title}
              .configValue=${"title"}
              @value-changed=${this._valueChanged}
            ></paper-input>
            <hui-theme-select-editor
              .hass=${this.hass}
              .value=${this._theme}
              .configValue=${"theme"}
              @value-changed=${this._valueChanged}
            ></hui-theme-select-editor>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.entities.show_header_toggle"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this._config!.show_header_toggle !== false}
                .configValue=${"show_header_toggle"}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          </div>
          <hui-entity-editor
            .hass=${this.hass}
            .entities=${this._configEntities}
            @entities-changed=${this._valueChanged}
          ></hui-entity-editor>
        </div>
        <div slot="advanced">
          <hui-header-footer-dropdown
            .hass=${this.hass}
            .value=${this._config.header?.type}
            .configValue=${"header"}
            @change=${this._headerFooterChanged}
          ></hui-header-footer-dropdown>
          ${this._headerElement
            ? html`
                <div class="header-footer">
                  ${this._headerElement}
                </div>
              `
            : ""}
          <hui-header-footer-dropdown
            .hass=${this.hass}
            .value=${this._config.footer?.type}
            .configValue=${"footer"}
            @change=${this._headerFooterChanged}
          ></hui-header-footer-dropdown>
          ${this._footerElement
            ? html`
                <div class="header-footer">
                  ${this._footerElement}
                </div>
              `
            : ""}
        </div>
      </hui-advanced-element-editor>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;

    if (
      (target.configValue! === "title" && target.value === this._title) ||
      (target.configValue! === "theme" && target.value === this._theme)
    ) {
      return;
    }

    if (ev.detail && ev.detail.entities) {
      this._config = { ...this._config, entities: ev.detail.entities };

      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
      if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _headerFooterChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.currentTarget as any;

    if (!target.value) {
      this[`_${target.configValue}Element`] = undefined;
      this._config = { ...this._config };
      delete this._config[target.configValue!];

      fireEvent(this, "config-changed", { config: this._config });
      return;
    }

    this._updateHeaderFooterElement({
      type: target.value,
    });
  }

  private async _updateHeaderFooterElement(
    config: LovelaceHeaderFooterConfig | { type: string }
  ): Promise<void> {
    if (!this._config || !this.hass) {
      return;
    }

    const headerFooterEditor = await getHeaderFooterEditor(
      this.hass,
      config,
      this._configEntities?.map((confEntity) => confEntity.entity) || []
    );

    this[`_${config.type}Element`] = headerFooterEditor?.configElement;

    if (!this[`_${config.type}Element`]) {
      return;
    }

    this._config = {
      ...this._config,
      [config.type]: { ...headerFooterEditor!.config },
    };

    this[`_${config.type}Element`].hass = this.hass;
    this[`_${config.type}Element`].setConfig(headerFooterEditor!.config);
    this[`_${config.type}Element`].addEventListener("config-changed", (ev) =>
      this._handleHeaderFooterConfigChanged(
        ev as UIConfigChangedEvent,
        config.type
      )
    );
  }

  private _handleHeaderFooterConfigChanged(
    ev: UIHeaderFooterConfigChangedEvent,
    configValue: string
  ) {
    if (!this._config || !this.hass) {
      return;
    }

    ev.stopPropagation();
    const config = ev.detail.config;
    this._config = { ...this._config, [configValue]: config };

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}
