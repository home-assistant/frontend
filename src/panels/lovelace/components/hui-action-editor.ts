import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-assist-pipeline-picker";
import { HaFormSchema, SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-navigation-picker";
import "../../../components/ha-service-control";
import {
  ActionConfig,
  CallServiceActionConfig,
  NavigateActionConfig,
  UrlActionConfig,
} from "../../../data/lovelace";
import { ServiceAction } from "../../../data/script";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";

export type UiAction = Exclude<ActionConfig["action"], "fire-dom-event">;

const DEFAULT_ACTIONS: UiAction[] = [
  "more-info",
  "toggle",
  "navigate",
  "url",
  "call-service",
  "assist",
  "none",
];

const NAVIGATE_SCHEMA = [
  {
    name: "navigation_path",
    selector: {
      navigation: {},
    },
  },
] as const satisfies readonly HaFormSchema[];

const ASSIST_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "pipeline_id",
        selector: {
          assist_pipeline: {
            include_last_used: true,
          },
        },
      },
      {
        name: "start_listening",
        selector: {
          boolean: {},
        },
      },
    ],
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-action-editor")
export class HuiActionEditor extends LitElement {
  @property() public config?: ActionConfig;

  @property() public label?: string;

  @property() public actions?: UiAction[];

  @property() public tooltipText?: string;

  @property() protected hass?: HomeAssistant;

  get _navigation_path(): string {
    const config = this.config as NavigateActionConfig | undefined;
    return config?.navigation_path || "";
  }

  get _url_path(): string {
    const config = this.config as UrlActionConfig | undefined;
    return config?.url_path || "";
  }

  get _service(): string {
    const config = this.config as CallServiceActionConfig;
    return config?.service || "";
  }

  private _serviceAction = memoizeOne(
    (config: CallServiceActionConfig): ServiceAction => ({
      service: this._service,
      ...(config.data || config.service_data
        ? { data: config.data ?? config.service_data }
        : null),
      target: config.target,
    })
  );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const actions = this.actions ?? DEFAULT_ACTIONS;

    return html`
      <div class="dropdown">
        <ha-select
          .label=${this.label}
          .configValue=${"action"}
          @selected=${this._actionPicked}
          .value=${this.config?.action ?? "default"}
          @closed=${stopPropagation}
          fixedMenuPosition
          naturalMenuWidt
        >
          <mwc-list-item value="default">
            ${this.hass!.localize(
              "ui.panel.lovelace.editor.action-editor.actions.default_action"
            )}
          </mwc-list-item>
          ${actions.map(
            (action) => html`
              <mwc-list-item .value=${action}>
                ${this.hass!.localize(
                  `ui.panel.lovelace.editor.action-editor.actions.${action}`
                )}
              </mwc-list-item>
            `
          )}
        </ha-select>
        ${this.tooltipText
          ? html`
              <ha-help-tooltip .label=${this.tooltipText}></ha-help-tooltip>
            `
          : nothing}
      </div>
      ${this.config?.action === "navigate"
        ? html`
            <ha-form
              .hass=${this.hass}
              .schema=${NAVIGATE_SCHEMA}
              .data=${this.config}
              .computeLabel=${this._computeFormLabel}
              @value-changed=${this._formValueChanged}
            >
            </ha-form>
          `
        : nothing}
      ${this.config?.action === "url"
        ? html`
            <ha-textfield
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.url_path"
              )}
              .value=${this._url_path}
              .configValue=${"url_path"}
              @input=${this._valueChanged}
            ></ha-textfield>
          `
        : nothing}
      ${this.config?.action === "call-service"
        ? html`
            <ha-service-control
              .hass=${this.hass}
              .value=${this._serviceAction(this.config)}
              .showAdvanced=${this.hass.userData?.showAdvanced}
              narrow
              @value-changed=${this._serviceValueChanged}
            ></ha-service-control>
          `
        : nothing}
      ${this.config?.action === "assist"
        ? html`
            <ha-form
              .hass=${this.hass}
              .schema=${ASSIST_SCHEMA}
              .data=${this.config}
              .computeLabel=${this._computeFormLabel}
              @value-changed=${this._formValueChanged}
            >
            </ha-form>
          `
        : nothing}
    `;
  }

  private _actionPicked(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const value = ev.target.value;
    if (this.config?.action === value) {
      return;
    }
    if (value === "default") {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }

    let data;
    switch (value) {
      case "url": {
        data = { url_path: this._url_path };
        break;
      }
      case "call-service": {
        data = { service: this._service };
        break;
      }
      case "navigate": {
        data = { navigation_path: this._navigation_path };
        break;
      }
    }

    fireEvent(this, "value-changed", {
      value: { action: value, ...data },
    });
  }

  private _valueChanged(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.target.value ?? ev.target.checked;
    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      fireEvent(this, "value-changed", {
        value: { ...this.config!, [target.configValue!]: value },
      });
    }
  }

  private _formValueChanged(ev): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    fireEvent(this, "value-changed", {
      value: value,
    });
  }

  private _computeFormLabel(schema: SchemaUnion<typeof ASSIST_SCHEMA>) {
    return this.hass?.localize(
      `ui.panel.lovelace.editor.action-editor.${schema.name}`
    );
  }

  private _serviceValueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...this.config!,
      service: ev.detail.value.service || "",
      data: ev.detail.value.data,
      target: ev.detail.value.target || {},
    };
    if (!ev.detail.value.data) {
      delete value.data;
    }
    // "service_data" is allowed for backwards compatibility but replaced with "data" on write
    if ("service_data" in value) {
      delete value.service_data;
    }

    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      .dropdown {
        position: relative;
      }
      ha-help-tooltip {
        position: absolute;
        right: 40px;
        top: 16px;
        inset-inline-start: initial;
        inset-inline-end: 40px;
        direction: var(--direction);
      }
      ha-select,
      ha-textfield {
        width: 100%;
      }
      ha-service-control,
      ha-navigation-picker,
      ha-form {
        display: block;
      }
      ha-textfield,
      ha-service-control,
      ha-navigation-picker,
      ha-form {
        margin-top: 8px;
      }
      ha-service-control {
        --service-control-padding: 0;
      }
      ha-formfield {
        display: flex;
        height: 56px;
        align-items: center;
        --mdc-typography-body2-font-size: 1em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
