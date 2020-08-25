import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
} from "lit-element";
import { TagTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";
import { Tag, fetchTags } from "../../../../../data/tag";
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("ha-automation-trigger-tag")
export class HaTagTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TagTrigger;

  @internalProperty() private _tags: Tag[] = [];

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
      <ha-paper-dropdown-menu
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.tag.label"
        )}
        ?disabled=${this._tags.length === 0}
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${tag_id}
          attr-for-selected="tag_id"
          @iron-select=${this._tagChanged}
        >
          ${this._tags.map(
            (tag) => html`
              <paper-item tag_id=${tag.id} .tag=${tag}>
                ${tag.name || tag.id}
              </paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  private async _fetchTags() {
    this._tags = await fetchTags(this.hass);
  }

  private _tagChanged(ev) {
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        tag_id: ev.detail.item.tag.id,
      },
    });
  }
}
