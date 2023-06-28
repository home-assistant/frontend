import { mdiArrowUpBoldCircle, mdiPuzzle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { navigate } from "../../../src/common/navigate";
import { caseInsensitiveStringCompare } from "../../../src/common/string/compare";
import "../../../src/components/ha-card";
import "../../../src/components/search-input";
import { HassioAddonInfo } from "../../../src/data/hassio/addon";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-addons")
class HassioAddons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _filter?: string;

  protected render(): TemplateResult {
    return html`
      <div class="search">
        <search-input
          .hass=${this.hass}
          suffix
          .filter=${this._filter}
          @value-changed=${this._handleSearchChange}
          .label=${this.supervisor.localize("dashboard.search_addons")}
        >
        </search-input>
      </div>
      <div class="content">
        ${!atLeastVersion(this.hass.config.version, 2021, 12)
          ? html`<h1>${this.supervisor.localize("dashboard.addons")}</h1>`
          : ""}
        <div class="card-group">
          ${!this.supervisor.addon.addons.length
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <button class="link" @click=${this._openStore}>
                      ${this.supervisor.localize("dashboard.no_addons")}
                    </button>
                  </div>
                </ha-card>
              `
            : this._getAddons(this.supervisor.addon.addons, this._filter).map(
                (addon) => html`
                  <ha-card outlined .addon=${addon} @click=${this._addonTapped}>
                    <div class="card-content">
                      <hassio-card-content
                        .hass=${this.hass}
                        .title=${addon.name}
                        .description=${addon.description}
                        available
                        .showTopbar=${addon.update_available}
                        topbarClass="update"
                        .icon=${addon.update_available!
                          ? mdiArrowUpBoldCircle
                          : mdiPuzzle}
                        .iconTitle=${addon.state !== "started"
                          ? this.supervisor.localize("dashboard.addon_stopped")
                          : addon.update_available!
                          ? this.supervisor.localize(
                              "dashboard.addon_new_version"
                            )
                          : this.supervisor.localize("dashboard.addon_running")}
                        .iconClass=${addon.update_available
                          ? addon.state === "started"
                            ? "update"
                            : "update stopped"
                          : addon.state === "started"
                          ? "running"
                          : "stopped"}
                        .iconImage=${atLeastVersion(
                          this.hass.config.version,
                          0,
                          105
                        ) && addon.icon
                          ? `/api/hassio/addons/${addon.slug}/icon`
                          : undefined}
                      ></hassio-card-content>
                    </div>
                  </ha-card>
                `
              )}
        </div>
      </div>
    `;
  }

  private _getAddons = memoizeOne(
    (addons: HassioAddonInfo[], filter?: string) => {
      if (filter) {
        addons = addons.filter((addon) => {
          const lowerCaseFilter = filter.toLowerCase();
          return (
            addon.name.toLowerCase().includes(lowerCaseFilter) ||
            addon.description.toLowerCase().includes(lowerCaseFilter) ||
            addon.slug.toLowerCase().includes(lowerCaseFilter)
          );
        });
      }
      return addons.sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        ha-card {
          cursor: pointer;
          overflow: hidden;
        }
        .search {
          position: sticky;
          top: 0;
          z-index: 2;
        }
        search-input {
          display: block;
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
        }
        .content {
          margin-bottom: 72px;
        }
      `,
    ];
  }

  private _addonTapped(ev: any): void {
    navigate(`/hassio/addon/${ev.currentTarget.addon.slug}/info`);
  }

  private _openStore(): void {
    navigate("/hassio/store");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addons": HassioAddons;
  }
}
