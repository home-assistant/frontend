import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { transform } from "../common/decorators/transform";
import { stopPropagation } from "../common/dom/stop_propagation";
import type { HASSDomTargetEvent } from "../common/dom/fire_event";
import "../components/entity/state-badge";
import "../components/input/ha-input";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HaInput } from "../components/input/ha-input";
import { apiContext, formattersContext } from "../data/context";
import { UNAVAILABLE, UNKNOWN } from "../data/entity/entity";
import type { TextEntity } from "../data/text";
import { setValue } from "../data/text";
import type { HomeAssistantFormatters } from "../types";

@customElement("state-card-text")
class StateCardText extends LitElement {
  @property({ attribute: false }) public stateObj!: TextEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityName,
  })
  private _formatEntityName?: HomeAssistantFormatters["formatEntityName"];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render(): TemplateResult {
    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <ha-input
        .label=${this._formatEntityName?.(this.stateObj, { type: "entity" })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .value=${this.stateObj.state}
        .minlength=${this.stateObj.attributes.min}
        .maxlength=${this.stateObj.attributes.max}
        .autoValidate=${this.stateObj.attributes.pattern}
        .pattern=${this.stateObj.attributes.pattern}
        .type=${this.stateObj.attributes.mode}
        @change=${this._valueChanged}
        @click=${stopPropagation}
        .placeholder=${this._localize("ui.card.text.empty_value")}
      ></ha-input>
    `;
  }

  private _valueChanged(ev: InputEvent & HASSDomTargetEvent<HaInput>): void {
    const value = (ev.target as HaInput).value ?? "";

    // Filter out invalid text states
    if (value && (value === UNAVAILABLE || value === UNKNOWN)) {
      (ev.target as HaInput).value = this.stateObj.state;
      return;
    }

    if (value === this.stateObj.state) {
      return;
    }
    setValue(this._api.callService, this.stateObj.entity_id, value);
  }

  static styles = css`
    :host {
      display: flex;
    }

    state-badge {
      float: left;
      margin-top: 10px;
    }

    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-text": StateCardText;
  }
}
