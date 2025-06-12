import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { loadIcon } from "../data/load_icon";
import "./ha-svg-icon";

@customElement("ha-icon")
export class HaIcon extends LitElement {
  @property() public icon?: string;

  @state() private _path?: string;

  @state() private _secondaryPath?: string;

  @state() private _viewBox?: string;

  @state() private _legacy = false;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("icon")) {
      this._path = undefined;
      this._secondaryPath = undefined;
      this._viewBox = undefined;
      this._loadIcon();
    }
  }

  protected render() {
    if (!this.icon) {
      return nothing;
    }
    if (this._legacy) {
      return html`<!-- @ts-ignore we don't provide the iron-icon element -->
        <iron-icon .icon=${this.icon}></iron-icon>`;
    }
    return html`<ha-svg-icon
      .path=${this._path}
      .secondaryPath=${this._secondaryPath}
      .viewBox=${this._viewBox}
    ></ha-svg-icon>`;
  }

  private async _loadIcon() {
    if (!this.icon) {
      return;
    }
    const result = await loadIcon(this.icon, this._handleWarning);

    if (result.icon !== this.icon) {
      // The icon was changed while we were loading it, so we don't update the state
      return;
    }
    this._legacy = result.legacy || false;
    this._path = result.path;
    this._secondaryPath = result.secondaryPath;
    this._viewBox = result.viewBox;
  }

  private _handleWarning = (message: string) => {
    fireEvent(this, "write_log", {
      level: "warning",
      message,
    });
  };

  static styles = css`
    :host {
      fill: currentcolor;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}
