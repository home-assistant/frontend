import { mdiClose, mdiPencil } from "@mdi/js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
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
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import { headerFooterConfigStructs } from "../../header-footer/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-advanced-element-editor";
import "../hui-detail-editor-base";
import type { HuiElementEditor } from "../hui-element-editor";
import "../hui-entities-card-row-editor";
import { processEditorEntities } from "../process-editor-entities";
import {
  EditorTarget,
  entitiesConfigStruct,
  EntitiesEditorEvent,
  GUIModeChangedEvent,
} from "../types";
import { configElementStyle } from "./config-elements-style";

interface EditDetailElementEvent {
  index?: number;
  elementType: string;
}

declare global {
  interface HASSDomEvents {
    "edit-detail-element": EditDetailElementEvent;
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

  @internalProperty() private _detailElementConfig?: LovelaceRowConfig;

  @internalProperty() private _detailElementIndex?: number;

  @internalProperty() private _detailElementGuiModeAvailable = true;

  @internalProperty() private _detailElementGuiMode = true;

  @internalProperty() private _detailElementType?;

  @query("hui-element-editor") private _cardEditorEl?: HuiElementEditor;

  public setConfig(config: EntitiesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
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

    if (this._detailElementConfig) {
      return html`
        <hui-detail-editor-base
          .hass=${this.hass}
          .guiModeAvailable=${this._detailElementGuiModeAvailable}
          .guiMode=${this._detailElementGuiMode}
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
            .value=${this._detailElementConfig}
            elementType="row"
            @config-changed=${this._handleEntityRowConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-element-editor>
        </hui-detail-editor-base>
      `;
    }

    return html`
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
            <div class="side-by-side">
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
          </div>
          <hui-entities-card-row-editor
            .hass=${this.hass}
            .entities=${this._configEntities}
            @entities-changed=${this._valueChanged}
            @edit-row=${this._editDetailElement}
          ></hui-entities-card-row-editor>
        </div>
        <div slot="advanced">
          <div class="header-footer-heading">
            <span>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.header-footer.header`
              )}:
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.header-footer.${this._config.header?.type}.name`
              ) || "None"}
            </span>
            <div>
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.clear"
                )}
                class="remove-icon"
              >
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.edit"
                )}
                class="edit-icon"
                .elementType=${"headerfooter"}
              >
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </mwc-icon-button>
            </div>
          </div>
          <div class="header-footer-heading">
            <span>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.header-footer.footer`
              )}:
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.header-footer.${this._config.footer?.type}.name`
              ) || "None"}
            </span>
            <div>
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.clear"
                )}
                class="remove-icon"
              >
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.edit"
                )}
                class="edit-icon"
              >
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </mwc-icon-button>
            </div>
          </div>
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

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    if (ev.detail.elementType === "row") {
      this._detailElementIndex = ev.detail.index!;
      this._detailElementConfig = this._configEntities![
        this._detailElementIndex
      ];
    }
  }

  private _goBack(): void {
    this._detailElementIndex = undefined;
    this._detailElementConfig = undefined;
    this._detailElementGuiModeAvailable = true;
    this._detailElementGuiMode = true;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _handleEntityRowConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.config as LovelaceRowConfig;
    this._detailElementGuiModeAvailable = ev.detail.guiModeAvailable;

    const newConfigEntities = this._configEntities!.concat();

    if (!value) {
      newConfigEntities.splice(this._detailElementIndex!, 1);
      this._goBack();
    } else {
      newConfigEntities[this._detailElementIndex!] = value;
    }

    this._detailElementConfig = value;

    this._config = { ...this._config!, entities: newConfigEntities };

    this._configEntities = processEditorEntities(this._config!.entities);

    fireEvent(this, "config-changed", { config: this._config! });
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._detailElementGuiMode = ev.detail.guiMode;
    this._detailElementGuiModeAvailable = ev.detail.guiModeAvailable;
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
        div[slot="advanced"] {
          padding-top: 8px;
        }
        .remove-icon,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
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
