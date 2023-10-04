import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { computeObjectId } from "../../../../../common/entity/compute_object_id";
import { hasTemplate } from "../../../../../common/string/has-template";
import "../../../../../components/ha-service-control";
import { ServiceAction, serviceActionStruct } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-service")
export class HaServiceAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: ServiceAction;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _action?: ServiceAction;

  @state() private _responseChecked = false;

  private _fields = memoizeOne(
    (
      serviceDomains: HomeAssistant["services"],
      domainService: string | undefined
    ): { fields: any } => {
      if (!domainService) {
        return { fields: {} };
      }
      const domain = computeDomain(domainService);
      const service = computeObjectId(domainService);
      if (!(domain in serviceDomains)) {
        return { fields: {} };
      }
      if (!(service in serviceDomains[domain])) {
        return { fields: {} };
      }
      return { fields: serviceDomains[domain][service].fields };
    }
  );

  public static get defaultConfig() {
    return { service: "", data: {} };
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    try {
      assert(this.action, serviceActionStruct);
    } catch (err: any) {
      fireEvent(this, "ui-mode-not-available", err);
      return;
    }

    const fields = this._fields(
      this.hass.services,
      this.action?.service
    ).fields;
    if (
      this.action &&
      (Object.entries(this.action).some(
        ([key, val]) => key !== "data" && hasTemplate(val)
      ) ||
        (this.action.data &&
          Object.entries(this.action.data).some(([key, val]) => {
            const field = fields[key];
            if (
              field?.selector &&
              ("template" in field.selector || "object" in field.selector)
            ) {
              return false;
            }
            return hasTemplate(val);
          })))
    ) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
      return;
    }
    if (this.action.entity_id) {
      this._action = {
        ...this.action,
        data: { ...this.action.data, entity_id: this.action.entity_id },
      };
      delete this._action.entity_id;
    } else {
      this._action = this.action;
    }
  }

  protected render() {
    if (!this._action) {
      return nothing;
    }
    const [domain, service] = this._action.service
      ? this._action.service.split(".", 2)
      : [undefined, undefined];
    return html`
      <ha-service-control
        .narrow=${this.narrow}
        .hass=${this.hass}
        .value=${this._action}
        .disabled=${this.disabled}
        .showAdvanced=${this.hass.userData?.showAdvanced}
        @value-changed=${this._actionChanged}
      ></ha-service-control>
      ${domain && service && this.hass.services[domain]?.[service]?.response
        ? html`<ha-settings-row .narrow=${this.narrow}>
            ${this.hass.services[domain][service].response!.optional
              ? html`<ha-checkbox
                  .checked=${this._action.response_variable ||
                  this._responseChecked}
                  .disabled=${this.disabled}
                  @change=${this._responseCheckboxChanged}
                  slot="prefix"
                ></ha-checkbox>`
              : html`<div slot="prefix" class="checkbox-spacer"></div>`}
            <span slot="heading"
              >${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.service.response_variable"
              )}</span
            >
            <span slot="description">
              ${this.hass.services[domain][service].response!.optional
                ? this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.service.has_optional_response"
                  )
                : this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type.service.has_response"
                  )}
            </span>
            <ha-textfield
              .value=${this._action.response_variable || ""}
              .required=${!this.hass.services[domain][service].response!
                .optional}
              .disabled=${this.disabled ||
              (this.hass.services[domain][service].response!.optional &&
                !this._action.response_variable &&
                !this._responseChecked)}
              @change=${this._responseVariableChanged}
            ></ha-textfield>
          </ha-settings-row>`
        : nothing}
    `;
  }

  private _actionChanged(ev) {
    if (ev.detail.value === this._action) {
      ev.stopPropagation();
    }
    const value = { ...this.action, ...ev.detail.value };
    if ("response_variable" in this.action) {
      const [domain, service] = this._action!.service
        ? this._action!.service.split(".", 2)
        : [undefined, undefined];
      if (
        domain &&
        service &&
        this.hass.services[domain]?.[service] &&
        !("response" in this.hass.services[domain][service])
      ) {
        delete value.response_variable;
        this._responseChecked = false;
      }
    }
    fireEvent(this, "value-changed", { value });
  }

  private _responseVariableChanged(ev) {
    const value = { ...this.action, response_variable: ev.target.value };
    if (!ev.target.value) {
      delete value.response_variable;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _responseCheckboxChanged(ev) {
    this._responseChecked = ev.target.checked;
    if (!this._responseChecked) {
      const value = { ...this.action };
      delete value.response_variable;
      fireEvent(this, "value-changed", { value });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-service-control {
        display: block;
        margin: 0 -16px;
      }
      ha-settings-row {
        margin: 0 -16px;
        padding: var(--service-control-padding, 0 16px);
      }
      ha-settings-row {
        --paper-time-input-justify-content: flex-end;
        --settings-row-content-width: 100%;
        --settings-row-prefix-display: contents;
        border-top: var(
          --service-control-items-border-top,
          1px solid var(--divider-color)
        );
      }
      ha-checkbox {
        margin-left: -16px;
      }
      .checkbox-spacer {
        width: 32px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-service": HaServiceAction;
  }
}
