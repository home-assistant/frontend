import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import "../../../../../components/device/ha-devices-picker";
import type { TagTrigger } from "../../../../../data/automation";
import type { Tag } from "../../../../../data/tag";
import { fetchTags } from "../../../../../data/tag";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-tag")
export class HaTagTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TagTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _tags?: Tag[];

  public static get defaultConfig(): TagTrigger {
    return { trigger: "tag", tag_id: "" };
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    this._fetchTags();
  }

  protected render() {
    if (!this._tags) {
      return nothing;
    }

    const deviceIds = Array.isArray(this.trigger.device_id)
      ? this.trigger.device_id
      : this.trigger.device_id
        ? [this.trigger.device_id]
        : [];
    
    return html`
      <div class="row">
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.tag.label"
          )}
          .disabled=${this.disabled || this._tags.length === 0}
          .value=${this.trigger.tag_id}
          @selected=${this._tagChanged}
          fixedMenuPosition
          naturalMenuWidth
        >
          ${this._tags.map(
            (tag) => html`
              <mwc-list-item .value=${tag.id}>
                ${tag.name || tag.id}
              </mwc-list-item>
            `
          )}
        </ha-select>
        
        <ha-devices-picker
          .hass=${this.hass}
          .label=${"Scanned at Devices (Optional)"}
          .disabled=${this.disabled}
          .value=${deviceIds}
          @value-changed=${this._devicesChanged}
        ></ha-devices-picker>
      </div>
    `;
  }

  private async _fetchTags() {
    const tags = await fetchTags(this.hass);
    this._tags = [...tags].sort((a, b) =>
      caseInsensitiveStringCompare(
        a.name || a.id,
        b.name || b.id,
        this.hass.locale.language
      )
    );
  }

  private _tagChanged(ev: HaSelectSelectEvent) {
    if (!this._tags) {
      return;
    }
    
    const value = ev.detail.value;
    if (!value || this.trigger.tag_id === value) {
      return;
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        tag_id: value,
      },
    });
  }

  private _devicesChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const currentValues = ev.detail.value as string[];

    const newTrigger = { ...this.trigger };

    if (!currentValues || currentValues.length === 0) {
      delete newTrigger.device_id;
    } else {
      newTrigger.device_id = currentValues;
    }

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  static styles = css`
    .row {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    ha-select,
    ha-devices-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-tag": HaTagTrigger;
  }
}
