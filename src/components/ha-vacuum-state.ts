import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassEntity } from "home-assistant-js-websocket";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { apiContext } from "../data/context";
import { haStyle } from "../resources/styles";
import "./ha-button";

const STATES_INTERCEPTABLE: Record<
  string,
  {
    action:
      | "return_to_base"
      | "start_cleaning"
      | "turn_on"
      | "turn_off"
      | "resume_cleaning";
    service: string;
  }
> = {
  cleaning: {
    action: "return_to_base",
    service: "return_to_base",
  },
  docked: {
    action: "start_cleaning",
    service: "start",
  },
  idle: {
    action: "start_cleaning",
    service: "start",
  },
  off: {
    action: "turn_on",
    service: "turn_on",
  },
  on: {
    action: "turn_off",
    service: "turn_off",
  },
  paused: {
    action: "resume_cleaning",
    service: "start",
  },
};

@customElement("ha-vacuum-state")
export class HaVacuumState extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public stateObj!: HassEntity;

  protected render(): TemplateResult {
    const interceptable = this._computeInterceptable(
      this.stateObj.state,
      this.stateObj.attributes.supported_features
    );
    return html`
      <ha-button
        appearance="plain"
        size="s"
        @click=${this._callService}
        .disabled=${!interceptable}
      >
        ${this._computeLabel(this.stateObj.state, interceptable)}
      </ha-button>
    `;
  }

  private _computeInterceptable(
    stateString: string,
    supportedFeatures: number | undefined
  ) {
    return stateString in STATES_INTERCEPTABLE && supportedFeatures !== 0;
  }

  private _computeLabel(stateString: string, interceptable: boolean) {
    return interceptable
      ? this._localize(
          `ui.card.vacuum.actions.${STATES_INTERCEPTABLE[stateString].action}`
        )
      : this._localize(
          `component.vacuum.entity_component._.state.${stateString}`
        );
  }

  private async _callService(ev) {
    ev.stopPropagation();
    const stateObj = this.stateObj;
    const service = STATES_INTERCEPTABLE[stateObj.state].service;
    await this._api.callService("vacuum", service, {
      entity_id: stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
          margin-inline-end: -0.57em;
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-vacuum-state": HaVacuumState;
  }
}
