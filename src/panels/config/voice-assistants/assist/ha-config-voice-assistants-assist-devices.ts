import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { navigate } from "../../../../common/navigate";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../../components/data-table/ha-data-table";
import type {
  AssistDevice,
  AssistPipeline,
} from "../../../../data/assist_pipeline";
import {
  listAssistDevices,
  listAssistPipelines,
} from "../../../../data/assist_pipeline";
import "../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../types";

interface AssistDeviceExtra extends AssistDevice {
  name: string;
  pipeline: string;
  area: string;
}

@customElement("ha-config-voice-assistants-assist-devices")
class AssistDevicesPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _pipelines: Record<string, AssistPipeline> = {};

  @state() private _preferred: string | null = null;

  @state() private _devices?: AssistDevice[];

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<AssistDeviceExtra> = {
        name: {
          title: localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.device"
          ),
          filterable: true,
          sortable: true,
          flex: 2,
        },
        pipeline: {
          title: localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.pipeline"
          ),
          filterable: true,
          sortable: true,
        },
        area: {
          title: localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.devices.area"
          ),
          filterable: true,
          sortable: true,
        },
      };

      return columns;
    }
  );

  private _data = memoizeOne(
    (
      localize: LocalizeFunc,
      deviceReg: HomeAssistant["devices"],
      areaReg: HomeAssistant["areas"],
      states: HomeAssistant["states"],
      pipelines: Record<string, AssistPipeline>,
      preferred: string | null,
      assistDevices: AssistDevice[]
    ): AssistDeviceExtra[] =>
      assistDevices.map((assistDevice) => {
        const device = deviceReg[assistDevice.device_id];
        const selected = states[assistDevice.pipeline_entity]?.state;
        const isPreferred = selected === "preferred";
        const pipeline = isPreferred ? preferred : selected;
        const pipelineName =
          (pipeline && pipelines[pipeline]?.name) || pipeline;

        return {
          ...assistDevice,
          name: device ? computeDeviceNameDisplay(device, this.hass) : "",
          pipeline: isPreferred
            ? localize("ui.components.pipeline-picker.preferred", {
                preferred: pipelineName,
              })
            : pipelineName || "",
          area:
            (device && device.area_id && areaReg[device.area_id]?.name) || "",
        };
      })
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
          .columns=${this._columns(this.hass.localize)}
          .data=${this._data(
            this.hass.localize,
            this.hass.devices,
            this.hass.areas,
            this.hass.states,
            this._pipelines,
            this._preferred,
            this._devices || []
          )}
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
