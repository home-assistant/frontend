import type { ActionDetail } from "@material/mwc-list";
import {
  mdiAlert,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
  mdiPlaylistEdit,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../../../common/decorators/storage";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  Condition,
  LegacyCondition,
} from "../../common/validate-condition";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";
import type { MediaQueriesListener } from "../../../../common/dom/media_query";
import { slugify } from "../../../../common/string/slugify";

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

  @storage({
    key: "dashboardConditionClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: Condition | LegacyCondition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  @state() _condition?: Condition;

  private _validCondition = true;

  private _listeners: MediaQueriesListener[] = [];

  private _id = slugify(Math.random().toString());

  private get _editor() {
    if (!this._condition) return undefined;
    return customElements.get(
      `ha-card-condition-${this._condition.condition}`
    ) as LovelaceConditionEditorConstructor | undefined;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMediaQueries();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listenMediaQueries();
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("condition")) {
      this._condition = {
        condition: "state",
        ...this.condition,
      };
      this._validCondition = validateConditionalConfig([this.condition]);
      this._listenMediaQueries();
      const validator = this._editor?.validateUIConfig;
      if (validator) {
        try {
          validator(this._condition, this.hass);
          this._uiAvailable = true;
          this._uiWarnings = [];
        } catch (err) {
          this._uiWarnings = handleStructError(
            this.hass,
            err as Error
          ).warnings;
          this._uiAvailable = false;
        }
      } else {
        this._uiAvailable = false;
        this._uiWarnings = [];
      }

      if (!this._uiAvailable && !this._yamlMode) {
        this._yamlMode = true;
      }
    }
  }

  protected render() {
    const condition = this._condition;

    if (!condition) return nothing;

    let icon: string;
    let tooltip: string;
    if (this._validCondition) {
      if (checkConditionsMet([condition], this.hass)) {
        icon = mdiEye;
        tooltip = this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.testing_pass"
        );
      } else {
        icon = mdiEyeOff;
        tooltip = this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.testing_error"
        );
      }
    } else {
      icon = mdiAlert;
      tooltip = this.hass.localize(
        "ui.panel.lovelace.editor.condition-editor.invalid_config_title"
      );
    }

    return html`
      <div class="container">
        <ha-expansion-panel left-chevron>
          <ha-svg-icon
            slot="leading-icon"
            class="condition-icon"
            .path=${ICON_CONDITION[condition.condition]}
          ></ha-svg-icon>
          <h3 slot="header">
            ${this.hass.localize(
              `ui.panel.lovelace.editor.condition-editor.condition.${condition.condition}.label`
            ) || condition.condition}
          </h3>
          <ha-svg-icon
            .id="svg-icon-${this._id}"
            slot="icons"
            .path=${icon}
          ></ha-svg-icon>
          <ha-tooltip .for="svg-icon-${this._id}">${tooltip}</ha-tooltip>
          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @click=${preventDefault}
            @closed=${stopPropagation}
            fixed
            .corner=${"BOTTOM_END"}
            menu-corner="END"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            <ha-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.edit_card.duplicate"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.copy")}
              <ha-svg-icon slot="graphic" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.cut")}
              <ha-svg-icon slot="graphic" .path=${mdiContentCut}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${!this._uiAvailable}>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>

            <li divider role="separator"></li>

            <ha-list-item class="warning" graphic="icon">
              ${this.hass!.localize("ui.common.delete")}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          ${!this._uiAvailable
            ? html`
                <ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._uiWarnings!.length > 0 &&
                  this._uiWarnings![0] !== undefined
                    ? html`
                        <ul>
                          ${this._uiWarnings!.map(
                            (warning) => html`<li>${warning}</li>`
                          )}
                        </ul>
                      `
                    : nothing}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>
              `
            : nothing}
          <div class="content">
            ${this._yamlMode
              ? html`
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this.condition}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                `
              : html`
                  ${dynamicElement(`ha-card-condition-${condition.condition}`, {
                    hass: this.hass,
                    condition: condition,
                  })}
                `}
          </div>
        </ha-expansion-panel>
      </div>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._duplicateCondition();
        break;
      case 1:
        this._copyCondition();
        break;
      case 2:
        this._cutCondition();
        break;
      case 3:
        this._yamlMode = !this._yamlMode;
        break;
      case 4:
        this._delete();
        break;
    }
  }

  private _duplicateCondition() {
    fireEvent(this, "duplicate-condition", {
      value: deepClone(this.condition),
    });
  }

  private _copyCondition() {
    this._clipboard = deepClone(this.condition);
  }

  private _cutCondition() {
    this._copyCondition();
    this._delete();
  }

  private _delete() {
    fireEvent(this, "value-changed", { value: null });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _clearMediaQueries() {
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    this._clearMediaQueries();
    if (!this._condition) {
      return;
    }

    this._listeners = attachConditionMediaQueriesListeners(
      [this._condition],
      () => {
        this.requestUpdate();
      }
    );
  }

  static styles = [
    haStyle,
    css`
      ha-button-menu {
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
      ha-expansion-panel {
        --expansion-panel-summary-padding: 0 0 0 8px;
        --expansion-panel-content-padding: 0;
      }
      .condition-icon {
        display: none;
      }
      @media (min-width: 870px) {
        .condition-icon {
          display: inline-block;
          color: var(--secondary-text-color);
          opacity: 0.9;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
      }
      h3 {
        margin: 0;
        font-size: inherit;
        font-weight: inherit;
      }
      .content {
        padding: 12px;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .container {
        position: relative;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        border: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }

  interface HASSDomEvents {
    "duplicate-condition": { value: Condition | LegacyCondition };
  }
}
