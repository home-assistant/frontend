import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/entity/state-info";
import "../components/ha-button";
import { apiContext } from "../data/context";
import { activateScene } from "../data/scene";
import { haStyle } from "../resources/styles";

@customElement("state-card-scene")
class StateCardScene extends LitElement {
  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render() {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-button appearance="plain" size="s" @click=${this._activateScene}
          >${this._localize("ui.card.scene.activate")}</ha-button
        >
      </div>
    `;
  }

  private _activateScene(ev) {
    ev.stopPropagation();
    activateScene(this._api.callService, this.stateObj.entity_id);
  }

  static get styles(): CSSResultGroup {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-scene": StateCardScene;
  }
}
