import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../../../common/navigate";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-relative-time";
import { UNAVAILABLE, UNKNOWN } from "../../../../../data/entity/entity";
import type { RadioFrequencyTransmitter } from "../../../../../data/radio_frequency";
import { fetchRadioFrequencyTransmitters } from "../../../../../data/radio_frequency";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

interface RadioFrequencyTransmitterRow {
  id: string;
  name: string;
  type: string;
  last_used?: string;
  device_id: string | null;
}

@customElement("radio-frequency-transmitters")
export class RadioFrequencyTransmitters extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _transmitters: RadioFrequencyTransmitter[] = [];

  private _tabs: PageNavigation[] = [
    {
      translationKey: "ui.panel.config.radio_frequency.navigation.transmitters",
      path: "/config/radio-frequency/transmitters",
    },
  ];

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._fetchTransmitters();
    }
  }

  private async _fetchTransmitters(): Promise<void> {
    const result = await fetchRadioFrequencyTransmitters(this.hass);
    this._transmitters = result.transmitters;
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<RadioFrequencyTransmitterRow> = {
        name: {
          title: localize("ui.panel.config.radio_frequency.name"),
          sortable: true,
          filterable: true,
          showNarrow: true,
          main: true,
          flex: 2,
          direction: "asc",
        },
        type: {
          title: localize("ui.panel.config.radio_frequency.type"),
          sortable: true,
          filterable: true,
          groupable: true,
        },
        last_used: {
          title: localize("ui.panel.config.radio_frequency.last_used"),
          sortable: true,
          template: (transmitter) =>
            transmitter.last_used
              ? html`<ha-relative-time
                  .hass=${this.hass}
                  .datetime=${transmitter.last_used}
                  capitalize
                ></ha-relative-time>`
              : "—",
        },
      };

      return columns;
    }
  );

  private _data = memoizeOne(
    (
      transmitters: RadioFrequencyTransmitter[],
      states: HomeAssistant["states"],
      localize: LocalizeFunc
    ): RadioFrequencyTransmitterRow[] =>
      transmitters.map((transmitter) => {
        const stateObj = states[transmitter.entity_id];
        // The entity state holds the timestamp the transmitter was last used
        // (or unknown/unavailable when it never has been).
        const state = stateObj?.state;
        const last_used =
          state &&
          state !== UNAVAILABLE &&
          state !== UNKNOWN &&
          !isNaN(new Date(state).getTime())
            ? state
            : undefined;
        return {
          id: transmitter.entity_id,
          name: stateObj ? computeStateName(stateObj) : transmitter.entity_id,
          type: localize("ui.panel.config.radio_frequency.type_transmitter"),
          last_used,
          device_id: transmitter.device_id,
        };
      })
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${this._tabs}
        back-path="/config/radio-frequency/dashboard"
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(
          this._transmitters,
          this.hass.states,
          this.hass.localize
        )}
        .noDataText=${this.hass.localize(
          "ui.panel.config.radio_frequency.no_transmitters"
        )}
        @row-click=${this._handleRowClicked}
        clickable
      ></hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const transmitter = this._transmitters.find(
      (t) => t.entity_id === ev.detail.id
    );
    if (transmitter?.device_id) {
      navigate(`/config/devices/device/${transmitter.device_id}`);
    }
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "radio-frequency-transmitters": RadioFrequencyTransmitters;
  }
}
