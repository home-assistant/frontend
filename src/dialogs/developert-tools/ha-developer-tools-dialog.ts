import { mdiClose } from "@mdi/js";
import "@polymer/paper-tabs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "../../components/ha-dialog";
import "../../components/ha-tabs";
import "../../components/ha-icon-button";
import "../../panels/developer-tools/developer-tools-router";
import type { HaDialog } from "../../components/ha-dialog";
import "@material/mwc-button/mwc-button";

@customElement("ha-developer-tools-dialog")
export class HaDeveloperToolsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _route: Route = {
    prefix: "/developer-tools",
    path: "/state",
  };

  @query("ha-dialog", true) private _dialog!: HaDialog;

  public async showDialog(): Promise<void> {
    this._opened = true;
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog open @closed=${this.closeDialog}>
        <div class="header">
          <ha-tabs
            scrollable
            attr-for-selected="page-name"
            .selected=${this._route.path.substr(1)}
            @iron-activate=${this.handlePageSelected}
          >
            <paper-tab page-name="state">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.states.title"
              )}
            </paper-tab>
            <paper-tab page-name="service">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.services.title"
              )}
            </paper-tab>
            <paper-tab page-name="template">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.templates.title"
              )}
            </paper-tab>
            <paper-tab page-name="event">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.events.title"
              )}
            </paper-tab>
            <paper-tab page-name="statistics">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.statistics.title"
              )}
            </paper-tab>
          </ha-tabs>
          <ha-icon-button
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
        </div>
        <developer-tools-router
          .route=${this._route}
          .narrow=${document.body.clientWidth < 600}
          .hass=${this.hass}
        ></developer-tools-router>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this.hass.loadBackendTranslation("title");
    this.hass.loadFragmentTranslation("developer-tools");
  }

  private handlePageSelected(ev) {
    const newPage = ev.detail.item.getAttribute("page-name");
    if (newPage !== this._route.path.substr(1)) {
      this._route = {
        prefix: "/developer-tools",
        path: `/${newPage}`,
      };
    } else {
      // scrollTo(0, 0);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-min-width: 100vw;
          --mdc-dialog-min-height: 100vh;
        }
        .header {
          display: flex;
        }
        ha-tabs {
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-developer-tools-dialog": HaDeveloperToolsDialog;
  }
}
