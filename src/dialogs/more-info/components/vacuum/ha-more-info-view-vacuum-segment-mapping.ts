import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-button";
import "../../../../components/ha-vacuum-segment-area-mapper";
import type { HaVacuumSegmentAreaMapper } from "../../../../components/ha-vacuum-segment-area-mapper";
import type {
  ExtEntityRegistryEntry,
  VacuumEntityOptions,
} from "../../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-vacuum-segment-mapping")
export class HaMoreInfoViewVacuumSegmentMapping extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: { entityId: string };

  @state() private _areaMapping?: Record<string, string[]>;

  @state() private _submitting = false;

  @state() private _dirty = false;

  @state() private _error?: string;

  private _entry?: ExtEntityRegistryEntry;

  protected firstUpdated() {
    this._loadCurrentMapping();
  }

  private async _loadCurrentMapping() {
    if (!this.params.entityId) return;

    this._entry = await getExtendedEntityRegistryEntry(
      this.hass,
      this.params.entityId
    );

    if (this._entry?.options?.vacuum) {
      this._areaMapping = this._entry.options.vacuum.area_mapping || {};
    } else {
      this._areaMapping = {};
    }
  }

  private _valueChanged(ev: CustomEvent) {
    this._areaMapping = ev.detail.value;
    this._dirty = true;
  }

  private async _save() {
    if (!this.params.entityId || !this._areaMapping) return;
    this._error = undefined;
    this._submitting = true;

    // Get current segments from the mapper component
    const mapper = this.shadowRoot!.querySelector(
      "ha-vacuum-segment-area-mapper"
    ) as HaVacuumSegmentAreaMapper;

    const options: VacuumEntityOptions = {
      ...(this._entry?.options?.vacuum ?? {}),
      area_mapping: this._areaMapping,
      last_seen_segments: mapper.lastSeenSegments,
    };

    try {
      await updateEntityRegistryEntry(this.hass, this.params.entityId, {
        options_domain: "vacuum",
        options: options,
      });
      this._dirty = false;
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._submitting = false;
    }
  }

  protected render() {
    if (!this._areaMapping) {
      return html`<ha-spinner active></ha-spinner>`;
    }

    return html`
      <div class="content">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}

        <ha-vacuum-segment-area-mapper
          .hass=${this.hass}
          .entityId=${this.params.entityId}
          .value=${this._areaMapping}
          @value-changed=${this._valueChanged}
        ></ha-vacuum-segment-area-mapper>

        <div class="footer">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty || this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </div>
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
    }

    .content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    ha-spinner {
      margin: var(--ha-space-8);
      display: flex;
      justify-self: center;
    }

    ha-vacuum-segment-area-mapper {
      flex: 1;
      padding-inline-start: var(--ha-space-2);
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      padding: var(--ha-space-4);
      border-top: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-vacuum-segment-mapping": HaMoreInfoViewVacuumSegmentMapping;
  }
}
