import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-slider";
import type { CoverEntity } from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../data/entity_attributes";
import type { HomeAssistant } from "../../types";

export function generateTiltSliderTrackBackgroundGradient() {
  const count = 24;
  const minStrokeWidth = 0.2;
  const gradient: [number, string][] = [];

  for (let i = 0; i < count; i++) {
    const stopOffset1 = i / count;
    const stopOffset2 =
      stopOffset1 +
      (i / count ** 2) * (1 - minStrokeWidth) +
      minStrokeWidth / count;

    if (i !== 0) {
      gradient.push([stopOffset1, "transparent"]);
    }
    gradient.push([stopOffset1, "var(--control-slider-color)"]);
    gradient.push([stopOffset2, "var(--control-slider-color)"]);
    gradient.push([stopOffset2, "transparent"]);
  }

  return unsafeCSS(
    gradient
      .map(([stop, color]) => `${color} ${(stop as number) * 100}%`)
      .join(", ")
  );
}

const GRADIENT = generateTiltSliderTrackBackgroundGradient();

@customElement("ha-state-control-cover-tilt-position")
export class HaStateControlInfoCoverTiltPosition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.current_tilt_position != null
          ? Math.round(this.stateObj.attributes.current_tilt_position)
          : undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("cover", "set_cover_tilt_position", {
      entity_id: this.stateObj!.entity_id,
      tilt_position: value,
    });
  }

  protected render(): TemplateResult {
    const openColor = stateColorCss(this.stateObj, "open");
    const color = stateColorCss(this.stateObj);

    return html`
      <ha-control-slider
        touch-action="none"
        vertical
        .value=${this.value}
        min="0"
        max="100"
        mode="cursor"
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "current_tilt_position"
        )}
        style=${styleMap({
          // Use open color for inactive state to avoid grey slider that looks disabled
          "--state-cover-inactive-color": openColor,
          "--control-slider-color": color,
          "--control-slider-background": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.cover.current_tilt_position}
        .locale=${this.hass.locale}
      >
        <div slot="background" class="gradient"></div>
      </ha-control-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-slider {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-slider-thickness: 130px;
        --control-slider-border-radius: 36px;
        --control-slider-color: var(--primary-color);
        --control-slider-background: var(--disabled-color);
        --control-slider-background-opacity: 0.2;
        --control-slider-tooltip-font-size: var(--ha-font-size-xl);
      }
      .gradient {
        background: -webkit-linear-gradient(top, ${GRADIENT});
        opacity: 0.6;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-cover-tilt-position": HaStateControlInfoCoverTiltPosition;
  }
}
