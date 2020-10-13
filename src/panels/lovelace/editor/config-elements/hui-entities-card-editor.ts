import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import {
  array,
  assert,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import { HomeAssistant } from "../../../../types";
import { EntitiesCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceRowConfig } from "../../entity-rows/types";
import {
  headerFooterConfigStructs,
  LovelaceHeaderFooterConfig,
} from "../../header-footer/types";
import type {
  LovelaceCardEditor,
  LovelaceHeaderFooterEditor,
} from "../../types";
import { getHeaderFooterEditor } from "../get-header-footer-editor";
import "../hui-advanced-element-editor";
import "../hui-detail-editor-base";
import { HuiElementEditor } from "../hui-element-editor";
import "../hui-entities-card-row-editor";
import "../hui-header-footer-dropdown";
import { processEditorEntities } from "../process-editor-entities";
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
  GUIModeChangedEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";

interface EditRowEvent {
  index: number;
}

declare global {
  interface HASSDomEvents {
    "edit-row": EditRowEvent;
  }
}

const cardConfigStruct = object({
  type: string(),
  title: optional(union([string(), boolean()])),
  theme: optional(string()),
  show_header_toggle: optional(boolean()),
  state_color: optional(boolean()),
  entities: array(entitiesConfigStruct),
  header: optional(headerFooterConfigStructs),
  footer: optional(headerFooterConfigStructs),
});

@customElement("hui-entities-card-editor")
export class HuiEntitiesCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntitiesCardConfig;

  @internalProperty() private _configEntities?: LovelaceRowConfig[];

  @internalProperty() private _editRowConfig?: LovelaceRowConfig;

  @internalProperty() private _editRowIndex?: number;

  @internalProperty() private _editRowGuiModeAvailable? = true;

  @internalProperty() private _editRowGuiMode? = true;

  @query("hui-element-editor") private _cardEditorEl?: HuiElementEditor;

  @internalProperty() private _footerElement?: LovelaceHeaderFooterEditor;

  @internalProperty() private _headerElement?: LovelaceHeaderFooterEditor;

  public setConfig(config: EntitiesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);

    if (this._config.header?.type) {
      this._updateHeaderFooterElement("header", this._config.header);
    }
    if (this._config.footer?.type) {
      this._updateHeaderFooterElement("footer", this._config.footer);
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

    if (this._editRowConfig) {
      return html`
        <hui-detail-editor-base
          .hass=${this.hass}
          .guiModeAvailable=${this._editRowGuiModeAvailable}
          .guiMode=${this._editRowGuiMode}
          @toggle-gui-mode=${this._toggleMode}
          @go-back=${this._goBack}
        >
          <span slot="title"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.entities.entity_row_editor"
            )}</span
          >
          <hui-element-editor
            .hass=${this.hass}
            .value=${this._editRowConfig}
            elementType="row"
            @config-changed=${this._handleEntityRowConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-element-editor>
        </hui-detail-editor-base>
      `;
    }

    return html`
      ${configElementStyle}
      <hui-advanced-element-editor .hass=${this.hass}>
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
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.state_color"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this._config!.state_color}
                .configValue=${"state_color"}
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
          <h3 class="header-footer-heading">
            ${this.hass.localize(
              `ui.panel.lovelace.editor.header-footer.header`
            )}
          </h3>
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
          <h3 class="header-footer-heading">
            ${this.hass.localize(
              `ui.panel.lovelace.editor.header-footer.footer`
            )}
          </h3>
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

  private _valueChanged(ev: HASSDomEvent<EntitiesEditorEvent>): void {
    if (!this._config || !this.hass) {
      return;
    }

    ev.stopPropagation();

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
    } else if (ev.detail && target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue]: ev.detail.config,
      };
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

    this._updateHeaderFooterElement(target.configValue!, {
      type: target.value,
    });
  }

  private async _updateHeaderFooterElement(
    type: "header" | "footer",
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

    this[`_${type}Element`] = headerFooterEditor?.configElement;

    if (!this[`_${type}Element`]) {
      return;
    }

    this._config = {
      ...this._config,
      [type]: { ...headerFooterEditor!.config },
    };

    this[`_${type}Element`].hass = this.hass;
    this[`_${type}Element`].configValue = type;
    this[`_${type}Element`].setConfig(headerFooterEditor!.config);
    this[`_${type}Element`].addEventListener("config-changed", (ev) =>
      this._valueChanged(ev as HASSDomEvent<EntitiesEditorEvent>)
    );
  }
  private _editRow(ev: HASSDomEvent<EditRowEvent>): void {
    this._editRowIndex = ev.detail.index;
    this._editRowConfig = this._configEntities![this._editRowIndex];
  }

  private _goBack(): void {
    this._editRowIndex = undefined;
    this._editRowConfig = undefined;
    this._editRowGuiModeAvailable = true;
    this._editRowGuiMode = true;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _handleEntityRowConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.config as LovelaceRowConfig;
    this._editRowGuiModeAvailable = ev.detail.guiModeAvailable;

    const newConfigEntities = this._configEntities!.concat();

    if (!value) {
      newConfigEntities.splice(this._editRowIndex!, 1);
      this._goBack();
    } else {
      newConfigEntities[this._editRowIndex!] = value;
    }

    this._editRowConfig = value;

    this._config = { ...this._config!, entities: newConfigEntities };

    this._configEntities = processEditorEntities(this._config!.entities);

    fireEvent(this, "config-changed", { config: this._config! });
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._editRowGuiMode = ev.detail.guiMode;
    this._editRowGuiModeAvailable = ev.detail.guiModeAvailable;
  }

  static get styles(): CSSResultArray {
    return [
      configElementStyle,
      css`
        .edit-entity-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 18px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}
