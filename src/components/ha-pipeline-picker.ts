import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValueMap,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { AssistPipeline, fetchAssistPipelines } from "../data/assist_pipeline";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const DEFAULT = "default_pipeline_option";

@customElement("ha-pipeline-picker")
export class HaPipelinePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _pipelines?: AssistPipeline[];

  @state() _defaultPipeline: string | null = null;

  protected render() {
    if (!this._pipelines) {
      return nothing;
    }
    const value = this.value ?? DEFAULT;
    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.pipeline-picker.pipeline")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        <ha-list-item .value=${DEFAULT}>
          ${this.hass!.localize("ui.components.pipeline-picker.default", {
            default: this._pipelines.find(
              (pipeline) => pipeline.id === this._defaultPipeline
            )?.name,
          })}
        </ha-list-item>
        ${this._pipelines.map(
          (pipeline) =>
            html`<ha-list-item .value=${pipeline.id}>
              ${pipeline.name} (${pipeline.language})
            </ha-list-item>`
        )}
      </ha-select>
    `;
  }

  protected firstUpdated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changedProperties);
    fetchAssistPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines.pipelines;
      this._defaultPipeline = pipelines.preferred_pipeline;
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (
      !this.hass ||
      target.value === "" ||
      target.value === this.value ||
      (this.value === undefined && target.value === DEFAULT)
    ) {
      return;
    }
    this.value = target.value === DEFAULT ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pipeline-picker": HaPipelinePicker;
  }
}
