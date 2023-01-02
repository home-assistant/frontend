import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-service-control";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";
import "../../../components/ha-navigation-picker";
import { SortConfig, AlphaSortConfig } from "../cards/types";
import { computeRTLDirection } from "../../../common/util/compute_rtl";

// TODO: Get these programatically
const POSSIBLE_SORT_CONFIG_TYPES: string[] = [
  "numeric",
  "alpha",
  "ip",
  "random",
  "last_changed",
  "last_triggered",
  "last_updated",
];

@customElement("hui-sort-config-picker")
export class HuiSortConfigPicker extends LitElement {
  @property() public config?: SortConfig;

  @property() protected hass?: HomeAssistant;

  @property() public value?: string;

  get _reverse(): boolean {
    const config = this.config as SortConfig | undefined;
    return config?.reverse || false;
  }

  get _ignore_case(): boolean {
    const config = this.config as AlphaSortConfig | undefined;
    return config?.ignore_case || false;
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-select
        .label=${this.hass!.localize(
          "ui.panel.lovelace.editor.sort-config-picker.title"
        )}
        .configValue=${"type"}
        .value=${this.config?.type ?? ""}
        @selected=${this._valueChanged}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidt
      >
        ${POSSIBLE_SORT_CONFIG_TYPES.map(
          (config_type) => html`
            <mwc-list-item .value=${config_type}>
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.sort-config-picker.types.${config_type}`
              )}
            </mwc-list-item>
          `
        )}
      </ha-select>

      ${this.config?.type !== undefined
        ? html`
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.sort-config-picker.reverse"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this.config?.reverse !== false}
                .configValue=${"reverse"}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          `
        : ""}
      ${this.config?.type === "alpha"
        ? html`
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.sort-config-picker.ignore_case"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this.config?.reverse !== false}
                .configValue=${"ignore_case"}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          `
        : ""}
    `;
  }

  private _valueChanged(ev): void {
    ev.stopPropagation();

    if (!this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;
    const value =
      target.checked !== undefined
        ? target.checked
        : target.value || ev.detail.config || ev.detail.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    if (target.configValue) {
      fireEvent(this, "value-changed", {
        value: {
          ...(this.config !== undefined ? this.config! : {}),
          [target.configValue!]: value,
        },
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-select {
          width: 100%;
        }
        ha-switch {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sort-config-picker": HuiSortConfigPicker;
  }
}
