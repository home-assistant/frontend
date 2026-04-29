import {
  mdiAlertCircleOutline,
  mdiCheckCircleOutline,
  mdiChevronDown,
  mdiHelpCircleOutline,
  mdiProgressClock,
  mdiProgressWrench,
  mdiStopCircleOutline,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { HomeAssistant } from "../types";
import type { Trace } from "../data/trace";
import "./ha-button";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import { formatDateTimeWithSeconds } from "../common/datetime/format_date_time";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

@customElement("ha-trace-picker")
class HaTracePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public traces!: Trace[];

  @property({ attribute: false }) public value?: string;

  @query("ha-generic-picker") private tracePicker?: HaGenericPicker;

  protected render() {
    return html` <ha-generic-picker
      name="trace"
      .hass=${this.hass}
      .label=${this.hass.localize(
        "ui.panel.config.automation.trace.select_trace"
      )}
      .value=${this.value}
      .getItems=${this._getTraces}
      required
    >
      <ha-button
        slot="field"
        appearance="filled"
        variant="neutral"
        size="small"
        @click=${this._openPicker}
      >
        ${this._renderTracePickerValue(this.value!)}
        <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
      </ha-button>
    </ha-generic-picker>`;
  }

  private _openPicker(ev: Event) {
    ev.stopPropagation();
    this.tracePicker?.open();
  }

  private _getTraces = (): PickerComboBoxItem[] =>
    this.traces?.map((trace) => {
      const renderRuntime = () =>
        (
          (new Date(trace.timestamp.finish!).getTime() -
            new Date(trace.timestamp.start).getTime()) /
          1000
        ).toFixed(2);

      const item: PickerComboBoxItem = {
        id: trace.run_id,
        primary: formatDateTimeWithSeconds(
          new Date(trace.timestamp.start),
          this.hass.locale,
          this.hass.config
        ),
      };
      if (trace.state === "running") {
        item.secondary = this.hass.localize(
          "ui.panel.config.automation.trace.picker.still_running"
        );
        item.icon_path = mdiProgressClock;
      } else if (trace.state === "debugged") {
        item.secondary = this.hass.localize(
          "ui.panel.config.automation.trace.picker.debugged"
        );
        item.icon_path = mdiProgressWrench;
      } else if (trace.script_execution === "finished") {
        item.secondary = this.hass.localize(
          "ui.panel.config.automation.trace.picker.finished",
          {
            executiontime: renderRuntime(),
          }
        );
        item.icon_path = mdiCheckCircleOutline;
      } else if (trace.script_execution === "aborted") {
        item.secondary = this.hass.localize(
          "ui.panel.config.automation.trace.picker.aborted",
          {
            executiontime: renderRuntime(),
          }
        );
        item.icon_path = mdiAlertCircleOutline;
      } else if (trace.script_execution === "cancelled") {
        item.secondary = this.hass.localize(
          "ui.panel.config.automation.trace.picker.cancelled",
          {
            executiontime: renderRuntime(),
          }
        );
        item.icon_path = mdiAlertCircleOutline;
      } else {
        let message:
          | "stopped_failed_conditions"
          | "stopped_failed_single"
          | "stopped_failed_max_runs"
          | "stopped_error"
          | "stopped_unknown_reason";
        let error: string | undefined;
        let icon: string;

        switch (trace.script_execution) {
          case "failed_conditions":
            message = "stopped_failed_conditions";
            icon = mdiStopCircleOutline;
            break;
          case "failed_single":
            message = "stopped_failed_single";
            icon = mdiStopCircleOutline;
            break;
          case "failed_max_runs":
            message = "stopped_failed_max_runs";
            icon = mdiStopCircleOutline;
            break;
          case "error":
            message = "stopped_error";
            error = trace.error!;
            icon = mdiAlertCircleOutline;
            break;
          default:
            message = "stopped_unknown_reason";
            icon = mdiHelpCircleOutline;
        }

        item.secondary = this.hass.localize(
          `ui.panel.config.automation.trace.picker.${message}`,
          {
            error,
            executiontime: renderRuntime(),
          }
        );
        item.icon_path = icon;
      }
      return item;
    }) ?? [];

  private _renderTracePickerValue = (runId: string) => {
    const trace = this.traces?.find((t) => t.run_id === runId);
    return html`${trace
      ? formatDateTimeWithSeconds(
          new Date(trace.timestamp.start),
          this.hass.locale,
          this.hass.config
        )
      : runId}`;
  };

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-generic-picker {
          width: 100%;
        }
        ha-button {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-trace-picker": HaTracePicker;
  }
}
