import {
  css,
  TemplateResult,
  html,
  LitElement,
  property,
  CSSResultArray,
} from "lit-element";
import "@polymer/paper-card/paper-card";

import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";
import { HomeAssistant } from "../../../src/types";
import {
  HassioAddonInfo,
  HassioAddonRepository,
} from "../../../src/data/hassio";
import { navigate } from "../../../src/common/navigate";

class HassioAddonRepositoryEl extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public repo!: HassioAddonRepository;
  @property() public addons!: HassioAddonInfo[];

  protected render(): TemplateResult | void {
    const repo = this.repo;
    return html`
      <div class="card-group">
        <div class="title">
          ${repo.name}
          <div class="description">
            Maintained by ${repo.maintainer}<br />
            <a class="repo" href=${repo.url} target="_blank">${repo.url}</a>
          </div>
        </div>

        ${this.addons
          .sort((a, b) =>
            a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
          )
          .map(
            (addon) => html`
              <paper-card
                .addon=${addon}
                class=${addon.available ? "" : "not_available"}
                @click=${this.addonTapped}
              >
                <div class="card-content">
                  <hassio-card-content
                    .hass=${this.hass}
                    .title=${addon.name}
                    .description=${addon.description}
                    .available=${addon.available}
                    .icon=${this.computeIcon(addon)}
                    .iconTitle=${this.computeIconTitle(addon)}
                    .iconClass=${this.computeIconClass(addon)}
                  ></hassio-card-content>
                </div>
              </paper-card>
            `
          )}
      </div>
    `;
  }

  private computeIcon(addon) {
    return addon.installed && addon.installed !== addon.version
      ? "hassio:arrow-up-bold-circle"
      : "hassio:puzzle";
  }

  private computeIconTitle(addon) {
    if (addon.installed) {
      return addon.installed !== addon.version
        ? "New version available"
        : "Add-on is installed";
    }
    return addon.available
      ? "Add-on is not installed"
      : "Add-on is not available on your system";
  }

  private computeIconClass(addon) {
    if (addon.installed) {
      return addon.installed !== addon.version ? "update" : "installed";
    }
    return !addon.available ? "not_available" : "";
  }

  private addonTapped(ev) {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  static get styles(): CSSResultArray {
    return [
      hassioStyle,
      css`
        paper-card {
          cursor: pointer;
        }
        .not_available {
          opacity: 0.6;
        }
        a.repo {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

customElements.define("hassio-addon-repository", HassioAddonRepositoryEl);
