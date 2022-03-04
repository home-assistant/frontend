import "@material/mwc-button/mwc-button";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-icon-next";
import "../../../components/ha-logo-svg";
import "../../../components/ha-svg-icon";
import { UpdateDescription } from "../../../data/update";
import { showUpdateDialog } from "../../../dialogs/update-dialog/show-ha-update-dialog";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

const sortUpdates = memoizeOne((a: UpdateDescription, b: UpdateDescription) => {
  if (a.domain === "hassio" && b.domain === "hassio") {
    if (a.identifier === "core") {
      return -1;
    }
    if (b.identifier === "core") {
      return 1;
    }
    if (a.identifier === "supervisor") {
      return -1;
    }
    if (b.identifier === "supervisor") {
      return 1;
    }
    if (a.identifier === "os") {
      return -1;
    }
    if (b.identifier === "os") {
      return 1;
    }
  }
  if (a.domain === "hassio") {
    return -1;
  }
  if (b.domain === "hassio") {
    return 1;
  }
  return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1;
});

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public updates?: UpdateDescription[] | null;

  @state() private _showAll = false;

  protected render(): TemplateResult {
    if (!this.updates?.length) {
      return html``;
    }

    // Make sure the first updates shown are for the Supervisor
    const sortedUpdates = this.updates.sort((a, b) => sortUpdates(a, b));

    const updates =
      this._showAll || sortedUpdates.length <= 3
        ? sortedUpdates
        : sortedUpdates.slice(0, 2);

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: sortedUpdates.length,
        })}
      </div>
      ${updates.map(
        (update) => html`
          <paper-icon-item @click=${this._showUpdate} .update=${update}>
            <span slot="item-icon" class="icon">
              <img
                src=${update.icon_url ||
                brandsUrl({
                  domain: update.domain,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
              />
            </span>
            <paper-item-body two-line>
              ${update.name}
              <div secondary>
                ${this.hass.localize(
                  "ui.panel.config.updates.version_available",
                  {
                    version_available: update.available_version,
                  }
                )}
              </div>
            </paper-item-body>
          </paper-icon-item>
        `
      )}
      ${!this._showAll && this.updates.length >= 4
        ? html`
            <button class="show-more" @click=${this._showAllClicked}>
              ${this.hass.localize("ui.panel.config.updates.more_updates", {
                count: this.updates!.length - updates.length,
              })}
            </button>
          `
        : ""}
    `;
  }

  private _showAllClicked() {
    this._showAll = true;
  }

  private _showUpdate(ev) {
    const update = ev.currentTarget.update as UpdateDescription;
    showUpdateDialog(this, {
      update,
      refreshCallback: () => fireEvent(this, "ha-refresh-updates"),
    });
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
        .icon {
          display: inline-flex;
          height: 100%;
          align-items: center;
        }
        img,
        ha-svg-icon,
        ha-logo-svg {
          --mdc-icon-size: 32px;
          max-height: 32px;
          width: 32px;
        }
        ha-logo-svg {
          color: var(--secondary-text-color);
        }
        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }
        button.show-more {
          color: var(--primary-color);
          text-align: left;
          cursor: pointer;
          background: none;
          border-width: initial;
          border-style: none;
          border-color: initial;
          border-image: initial;
          padding: 16px;
          font: inherit;
        }
        button.show-more:focus {
          outline: none;
          text-decoration: underline;
        }
        paper-icon-item {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}
