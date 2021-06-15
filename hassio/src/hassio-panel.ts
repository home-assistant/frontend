import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  Supervisor,
  supervisorApplyUpdateDetails,
  supervisorCollection,
} from "../../src/data/supervisor/supervisor";
import { HomeAssistant, Route } from "../../src/types";
import "./hassio-panel-router";

declare global {
  interface HASSDomEvents {
    "supervisor-applying-update": supervisorApplyUpdateDetails;
  }
}

@customElement("hassio-panel")
class HassioPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _applyingUpdate?: supervisorApplyUpdateDetails;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._applyingUpdate = undefined;
    this.addEventListener("supervisor-applying-update", (ev) => {
      this._applyingUpdate = ev.detail;
    });
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (
      Object.keys(supervisorCollection).some(
        (collection) => !this.supervisor[collection]
      )
    ) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (this._applyingUpdate !== undefined) {
      return html`<hass-loading-screen no-toolbar>
        ${this.supervisor.localize("dialog.update.updating", {
          name: this._applyingUpdate.name,
          version: this._applyingUpdate.version,
        })}
      </hass-loading-screen>`;
    }

    return html`
      <hassio-panel-router
        .hass=${this.hass}
        .supervisor=${this.supervisor}
        .route=${this.route}
        .narrow=${this.narrow}
      ></hassio-panel-router>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --app-header-background-color: var(--sidebar-background-color);
        --app-header-text-color: var(--sidebar-text-color);
        --app-header-border-bottom: 1px solid var(--divider-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel": HassioPanel;
  }
}
