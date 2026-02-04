import type { PropertyValueMap } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { formatLanguageCode } from "../common/language/format_language";
import type { AssistPipeline } from "../data/assist_pipeline";
import { listAssistPipelines } from "../data/assist_pipeline";
import type { HomeAssistant } from "../types";
import "./ha-select";
import type { HaSelectOption } from "./ha-select";

const PREFERRED = "preferred";
const LAST_USED = "last_used";

@customElement("ha-assist-pipeline-picker")
export class HaAssistPipelinePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: false }) public includeLastUsed = false;

  @state() _pipelines?: AssistPipeline[];

  @state() _preferredPipeline: string | null = null;

  private get _default() {
    return this.includeLastUsed ? LAST_USED : PREFERRED;
  }

  protected render() {
    if (!this._pipelines) {
      return nothing;
    }
    const value = this.value ?? this._default;
    const options: HaSelectOption[] = [
      {
        value: PREFERRED,
        label: this.hass.localize("ui.components.pipeline-picker.preferred", {
          preferred: this._pipelines.find(
            (pipeline) => pipeline.id === this._preferredPipeline
          )?.name,
        }),
      },
    ];

    if (this.includeLastUsed) {
      options.unshift({
        value: LAST_USED,
        label: this.hass.localize("ui.components.pipeline-picker.last_used"),
      });
    }

    options.push(
      ...this._pipelines.map((pipeline) => ({
        value: pipeline.id,
        label: `${pipeline.name} (${formatLanguageCode(pipeline.language, this.hass.locale)})`,
      }))
    );

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.pipeline-picker.pipeline")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        .options=${options}
      >
      </ha-select>
    `;
  }

  protected firstUpdated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changedProperties);
    listAssistPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines.pipelines;
      this._preferredPipeline = pipelines.preferred_pipeline;
    });
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
  `;

  private _changed(ev: CustomEvent<{ value: string }>): void {
    const value = ev.detail.value;
    if (
      !this.hass ||
      value === "" ||
      value === this.value ||
      (this.value === undefined && value === this._default)
    ) {
      return;
    }
    this.value = value === this._default ? undefined : value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-pipeline-picker": HaAssistPipelinePicker;
  }
}
