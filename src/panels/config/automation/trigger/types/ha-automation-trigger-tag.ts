import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-select";
import "../../../../../components/ha-list-item";
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

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchTags();
  }

  protected render() {
    if (!this._tags) {
      return nothing;
    }
    return html`
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
            <ha-list-item .value=${tag.id}>
              ${tag.name || tag.id}
            </ha-list-item>
          `
        )}
      </ha-select>
    `;
  }

  private async _fetchTags() {
    this._tags = (await fetchTags(this.hass)).sort((a, b) =>
      caseInsensitiveStringCompare(
        a.name || a.id,
        b.name || b.id,
        this.hass.locale.language
      )
    );
  }

  private _tagChanged(ev) {
    if (
      !ev.target.value ||
      !this._tags ||
      this.trigger.tag_id === ev.target.value
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        tag_id: ev.target.value,
      },
    });
  }

  static styles = css`
    ha-select {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-tag": HaTagTrigger;
  }
}
