import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import { TagTrigger } from "../../../../../data/automation";
import { fetchTags, Tag } from "../../../../../data/tag";
import { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-tag")
export class HaTagTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TagTrigger;

  @state() private _tags: Tag[] = [];

  public static get defaultConfig() {
    return { tag_id: "" };
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchTags();
  }

  protected render() {
    const { tag_id } = this.trigger;
    return html`
      <mwc-select
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.tag.label"
        )}
        .disabled=${this._tags.length === 0}
        .value=${tag_id}
        @selected=${this._tagChanged}
      >
        ${this._tags.map(
          (tag) => html`
            <mwc-list-item .value=${tag.id}>
              ${tag.name || tag.id}
            </mwc-list-item>
          `
        )}
      </mwc-select>
    `;
  }

  private async _fetchTags() {
    this._tags = await fetchTags(this.hass);
    this._tags.sort((a, b) =>
      caseInsensitiveStringCompare(a.name || a.id, b.name || b.id)
    );
  }

  private _tagChanged(ev) {
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        tag_id: ev.target.value,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-tag": HaTagTrigger;
  }
}
