import { consume } from "@lit/context";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { transform } from "../../common/decorators/transform";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-slider";
import {
  apiContext,
  formattersContext,
  internationalizationContext,
} from "../../data/context";
import type { CoverEntity } from "../../data/cover";
import { UNAVAILABLE } from "../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../data/entity/entity_attributes";
import type { FrontendLocaleData } from "../../data/translation";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../types";

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
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @state() value?: number;

  protected updated(changedProp: PropertyValues<this>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.current_tilt_position != null
          ? Math.round(this.stateObj.attributes.current_tilt_position)
          : undefined;
    }
  }

  private _valueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    const { value } = ev.detail;
    if (typeof value !== "number" || isNaN(value)) return;

    this._api.callService("cover", "set_cover_tilt_position", {
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
        .label=${this._formatters.formatEntityAttributeName(
          this.stateObj,
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
        .locale=${this._locale}
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
        --control-slider-border-radius: var(--ha-border-radius-6xl);
        --control-slider-color: var(--primary-color);
        --control-slider-background: var(--disabled-color);
        --control-slider-background-opacity: 0.2;
        --control-slider-tooltip-font-size: var(--ha-font-size-xl);
      }
      .gradient {
        background: linear-gradient(to bottom, ${GRADIENT});
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
