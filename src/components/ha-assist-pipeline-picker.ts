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
import { formatLanguageCode } from "../common/language/format_language";
import { AssistPipeline, listAssistPipelines } from "../data/assist_pipeline";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const PREFERRED = "preferred";
const LAST_USED = "last_used";

@customElement("ha-assist-pipeline-picker")
export class HaAssistPipelinePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public includeLastUsed = false;

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
        ${this.includeLastUsed
          ? html`
              <ha-list-item .value=${LAST_USED}>
                ${this.hass!.localize(
                  "ui.components.pipeline-picker.last_used"
                )}
              </ha-list-item>
            `
          : null}
        <ha-list-item .value=${PREFERRED}>
          ${this.hass!.localize("ui.components.pipeline-picker.preferred", {
            preferred: this._pipelines.find(
              (pipeline) => pipeline.id === this._preferredPipeline
            )?.name,
          })}
        </ha-list-item>
        ${this._pipelines.map(
          (pipeline) =>
            html`<ha-list-item .value=${pipeline.id}>
              ${pipeline.name}
              (${formatLanguageCode(pipeline.language, this.hass.locale)})
            </ha-list-item>`
        )}
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
      (this.value === undefined && target.value === this._default)
    ) {
      return;
    }
    this.value = target.value === this._default ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-pipeline-picker": HaAssistPipelinePicker;
  }
}
