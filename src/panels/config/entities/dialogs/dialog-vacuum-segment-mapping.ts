import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import {
  computeEntityEntryName,
  computeEntityName,
} from "../../../../common/entity/compute_entity_name";
import {
  getEntityContext,
  getEntityEntryContext,
} from "../../../../common/entity/context/get_entity_context";
import { computeRTL } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-vacuum-segment-area-mapper";
import type { HaVacuumSegmentAreaMapper } from "../../../../components/ha-vacuum-segment-area-mapper";
import "../../../../components/ha-wa-dialog";
import type {
  ExtEntityRegistryEntry,
  VacuumEntityOptions,
} from "../../../../data/entity/entity_registry";
import {
  getExtendedEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { VacuumSegmentMappingDialogParams } from "./show-dialog-vacuum-segment-mapping";

@customElement("dialog-vacuum-segment-mapping")
export class DialogVacuumSegmentMapping
  extends LitElement
  implements HassDialog<VacuumSegmentMappingDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: VacuumSegmentMappingDialogParams;

  @state() private _open = false;

  @state() private _areaMapping?: Record<string, string[]>;

  @state() private _submitting = false;

  private _entry?: ExtEntityRegistryEntry;

  public async showDialog(
    params: VacuumSegmentMappingDialogParams
  ): Promise<void> {
    this._params = params;
    this._open = true;
    await this._loadCurrentMapping();
  }

  public closeDialog(): boolean {
    this._open = false;
    this._params = undefined;
    this._areaMapping = undefined;
    return true;
  }

  private async _loadCurrentMapping() {
    if (!this._params) return;

    const entityId = this._params.entityId;
    this._entry = await getExtendedEntityRegistryEntry(this.hass, entityId);

    if (this._entry?.options?.vacuum) {
      this._areaMapping = this._entry.options.vacuum.area_mapping || {};
    } else {
      this._areaMapping = {};
    }
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _valueChanged(ev: CustomEvent) {
    this._areaMapping = ev.detail.value;
  }

  private async _save() {
    if (!this._params || !this._areaMapping) return;

    this._submitting = true;

    try {
      const mapper = this.renderRoot.querySelector(
        "ha-vacuum-segment-area-mapper"
      ) as HaVacuumSegmentAreaMapper;

      const options: VacuumEntityOptions = {
        area_mapping: this._areaMapping,
        last_seen_segments: mapper.lastSeenSegments,
      };

      await updateEntityRegistryEntry(this.hass, this._params.entityId, {
        options_domain: "vacuum",
        options: options,
      });

      this.closeDialog();
    } catch (_err: any) {
      // Error will be shown by the system
    } finally {
      this._submitting = false;
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const stateObj = this.hass.states[this._params.entityId];

    const context = stateObj
      ? getEntityContext(
          stateObj,
          this.hass.entities,
          this.hass.devices,
          this.hass.areas,
          this.hass.floors
        )
      : this._entry
        ? getEntityEntryContext(
            this._entry,
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          )
        : undefined;

    const entityName = stateObj
      ? computeEntityName(stateObj, this.hass.entities, this.hass.devices)
      : this._entry
        ? computeEntityEntryName(this._entry, this.hass.devices)
        : this._params.entityId;

    const deviceName = context?.device
      ? computeDeviceName(context.device)
      : undefined;
    const areaName = context?.area ? computeAreaName(context.area) : undefined;

    const breadcrumb = [areaName, deviceName, entityName].filter(
      (v): v is string => Boolean(v)
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        .headerTitle=${this.hass.localize(
          "ui.dialogs.vacuum_segment_mapping.title"
        )}
        .headerSubtitle=${breadcrumb.join(
          computeRTL(this.hass) ? " ◂ " : " ▸ "
        )}
      >
        <ha-vacuum-segment-area-mapper
          .hass=${this.hass}
          entity-id=${this._params.entityId}
          .value=${this._areaMapping}
          @value-changed=${this._valueChanged}
        ></ha-vacuum-segment-area-mapper>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static styles: CSSResultGroup = [haStyleDialog];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-vacuum-segment-mapping": DialogVacuumSegmentMapping;
  }
}
