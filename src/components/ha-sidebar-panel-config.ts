import "@material/mwc-button/mwc-button";
import { mdiCog } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { throttle } from "../common/util/throttle";
import { subscribeRepairsIssueRegistry } from "../data/repairs";
import { updateCanInstall, UpdateEntity } from "../data/update";
import { haStyleSidebarItem } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

const styles = css`
  :host {
    width: 100%;
  }
  .item.expanded {
    width: 100%;
  }
  .count {
    margin-inline-start: auto;
  }
`;
@customElement("ha-sidebar-panel-config")
class HaSidebarPanelConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public name = "";

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public selected = false;

  @state() private _updatesCount = 0;

  @state() private _issuesCount = 0;

  static styles = [haStyleSidebarItem, styles];

  protected render() {
    const notices = this._updatesCount + this._issuesCount;
    return html`<a
      href="/config"
      aria-selected=${this.selected}
      class="item ${this.expanded ? "expanded" : ""}"
    >
      <span class="icon">
        <ha-svg-icon slot="item-icon" .path=${mdiCog}></ha-svg-icon>
        ${!this.expanded && notices > 0
          ? html`<span class="badge">${notices}</span>`
          : ""}
      </span>
      <span class="name">${this.name}</span>
      ${this.expanded && notices > 0
        ? html`<span class="count">${notices}</span>`
        : ""}
    </a>`;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this._checkUpdates();
  }

  private _checkUpdates = throttle(() => {
    this._updatesCount = Object.keys(this.hass.states).filter(
      (e) =>
        e.startsWith("update.") &&
        updateCanInstall(this.hass.states[e] as UpdateEntity)
    ).length;
  }, 5000);

  public hassSubscribe(): UnsubscribeFunc[] {
    return this.hass.user?.is_admin
      ? [
          subscribeRepairsIssueRegistry(this.hass.connection!, (repairs) => {
            this._issuesCount = repairs.issues.filter(
              (issue) => !issue.ignored
            ).length;
          }),
        ]
      : [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-panel-config": HaSidebarPanelConfig;
  }
}
