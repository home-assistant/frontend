import { LitElement, PropertyValues, html } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property, state } from "lit/decorators";
import "../../../../layouts/hass-subpage";
import "../../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../../components/data-table/ha-data-table";
import { HomeAssistant } from "../../../../types";
import {
  AssistDevice,
  AssistPipeline,
  listAssistDevices,
  listAssistPipelines,
} from "../../../../data/assist_pipeline";
import { computeDeviceName } from "../../../../data/device_registry";
import { navigate } from "../../../../common/navigate";

interface AssistDeviceExtra {
  pipeline: string | undefined;
  last_used: string | undefined;
}

@customElement("ha-config-voice-assistants-assist-devices")
class AssistDevicesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _pipelines: Record<string, AssistPipeline> = {};

  @state() private _preferred: string | null = null;

  @state() private _devices?: (AssistDevice | AssistDeviceExtra)[];

  private _columns = memoizeOne(
    (
      hass: HomeAssistant,
      pipelines: Record<string, AssistPipeline>,
      preferred: string | null
    ): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<AssistDevice> = {
        name: {
          title: hass.localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.device"
          ),
          width: "50%",
          filterable: true,
          sortable: true,
          template: (assistDevice) =>
            computeDeviceName(hass.devices[assistDevice.device_id], hass),
        },
        pipeline: {
          title: hass.localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.pipeline"
          ),
          width: "30%",
          filterable: true,
          sortable: true,
          template: (assistDevice) => {
            let selected = hass.states[assistDevice.pipeline_entity].state;
            if (!pipelines) {
              return selected;
            }
            let isPreferred = false;

            if (selected === "preferred") {
              isPreferred = true;
              selected = preferred!;
            }

            const name = pipelines[selected].name;

            return isPreferred
              ? hass.localize("ui.components.pipeline-picker.preferred", {
                  preferred: name,
                })
              : name;
          },
        },
        area: {
          title: hass.localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.area"
          ),
          width: "20%",
          template: (assistDevice) => {
            const device = hass.devices[assistDevice.device_id];
            return (
              (device && device.area_id && hass.areas[device.area_id]?.name) ||
              ""
            );
          },
        },
      };

      return columns;
    }
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    listAssistPipelines(this.hass).then((pipelines) => {
      const lookup: Record<string, AssistPipeline> = {};
      for (const pipeline of pipelines.pipelines) {
        lookup[pipeline.id] = pipeline;
      }

      this._pipelines = lookup;
      this._preferred = pipelines.preferred_pipeline;
    });

    listAssistDevices(this.hass).then((devices) => {
      this._devices = devices;
    });
  }

  render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.devices.title"
        )}
      >
        <ha-data-table
          clickable
          id="device_id"
          .hass=${this.hass}
          .columns=${this._columns(this.hass, this._pipelines, this._preferred)}
          .data=${this._devices || []}
          auto-height
          @row-click=${this._handleRowClicked}
        ></ha-data-table>
      </hass-subpage>
    `;
  }

  private _handleRowClicked(ev: CustomEvent) {
    const device: AssistDevice = ev.detail.id;
    navigate(`/config/devices/device/${device}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-voice-assistants-assist-devices": AssistDevicesPage;
  }
}
