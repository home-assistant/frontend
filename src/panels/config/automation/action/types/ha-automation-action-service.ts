import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
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

  @state() private _action!: ServiceAction;

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
    return html`
      <ha-service-control
        .narrow=${this.narrow}
        .hass=${this.hass}
        .value=${this._action}
        .disabled=${this.disabled}
        .showAdvanced=${this.hass.userData?.showAdvanced}
        @value-changed=${this._actionChanged}
      ></ha-service-control>
    `;
  }

  private _actionChanged(ev) {
    if (ev.detail.value === this._action) {
      ev.stopPropagation();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-service-control {
        display: block;
        margin: 0 -16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-service": HaServiceAction;
  }
}
