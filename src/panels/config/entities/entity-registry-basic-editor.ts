import "@polymer/paper-input/paper-input";
import {
  css,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import {
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import type { PolymerChangedEvent } from "../../../polymer-types";
import type { HomeAssistant } from "../../../types";

@customElement("ha-registry-basic-editor")
export class HaEntityRegistryBasicEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ExtEntityRegistryEntry;

  @internalProperty() private _origEntityId!: string;

  @internalProperty() private _entityId!: string;

  @internalProperty() private _disabledBy!: string | null;

  @internalProperty() private _submitting?: boolean;

  public async updateEntry(): Promise<void> {
    this._submitting = true;
    const params: Partial<EntityRegistryEntryUpdateParams> = {
      new_entity_id: this._entityId.trim(),
    };
    if (this._disabledBy === null || this._disabledBy === "user") {
      params.disabled_by = this._disabledBy;
    }
    try {
      await updateEntityRegistryEntry(this.hass!, this._origEntityId, params);
    } finally {
      this._submitting = false;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("entry")) {
      return;
    }
    if (this.entry) {
      this._origEntityId = this.entry.entity_id;
      this._entityId = this.entry.entity_id;
      this._disabledBy = this.entry.disabled_by;
    }
  }

  protected render(): TemplateResult {
    if (
      !this.hass ||
      !this.entry ||
      this.entry.entity_id !== this._origEntityId
    ) {
      return html``;
    }
    const invalidDomainUpdate =
      computeDomain(this._entityId.trim()) !==
      computeDomain(this.entry.entity_id);

    return html`
      <paper-input
        .value=${this._entityId}
        @value-changed=${this._entityIdChanged}
        .label=${this.hass.localize(
          "ui.dialogs.entity_registry.editor.entity_id"
        )}
        error-message="Domain needs to stay the same"
        .invalid=${invalidDomainUpdate}
        .disabled=${this._submitting}
      ></paper-input>
      <div class="row">
        <ha-switch
          .checked=${!this._disabledBy}
          @change=${this._disabledByChanged}
        >
        </ha-switch>
        <div>
          <div>
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.enabled_label"
            )}
          </div>
          <div class="secondary">
            ${this._disabledBy && this._disabledBy !== "user"
              ? this.hass.localize(
                  "ui.dialogs.entity_registry.editor.enabled_cause",
                  "cause",
                  this.hass.localize(
                    `config_entry.disabled_by.${this._disabledBy}`
                  )
                )
              : ""}
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.enabled_description"
            )}
            <br />${this.hass.localize(
              "ui.dialogs.entity_registry.editor.note"
            )}
          </div>
        </div>
      </div>
    `;
  }

  private _entityIdChanged(ev: PolymerChangedEvent<string>): void {
    this._entityId = ev.detail.value;
  }

  private _disabledByChanged(ev: Event): void {
    this._disabledBy = (ev.target as HaSwitch).checked ? null : "user";
  }

  static get styles() {
    return css`
      ha-switch {
        margin-right: 16px;
      }
      .row {
        margin-top: 8px;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
      }
      .secondary {
        color: var(--secondary-text-color);
      }
    `;
  }
}
