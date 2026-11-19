import type { ContextType } from "@lit/context";
import { mdiPuzzleOutline } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import "../../../../components/ha-svg-icon";
import {
  brandsAccessTokenContext,
  configContext,
  uiContext,
} from "../../../../data/context";
import { brandsUrl } from "../../../../util/brands-url";

// Brand icon of an integration, next to its name in the upgrade check.
@customElement("ha-upgrade-check-brand")
export class HaUpgradeCheckBrand extends LitElement {
  @property() public domain!: string;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig?: ContextType<typeof configContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _hassUi?: ContextType<typeof uiContext>;

  @state()
  @consume({ context: brandsAccessTokenContext, subscribe: true })
  // @ts-ignore re-render trigger only, its value is never read
  private _brandsAccessToken?: string;

  // Removed integrations may no longer have a brand image.
  @state() private _missing = false;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("domain")) {
      this._missing = false;
    }
  }

  protected render() {
    const src = brandsUrl(
      {
        domain: this.domain,
        type: "icon",
        darkOptimized: this._hassUi?.themes.darkMode,
      },
      this._hassConfig?.auth.data.hassUrl
    );
    if (this._missing || !src) {
      return html`<ha-svg-icon .path=${mdiPuzzleOutline}></ha-svg-icon>`;
    }
    // The integration's name is always shown next to it.
    return html`<img
      alt=""
      src=${src}
      loading="lazy"
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
      @error=${this._onError}
    />`;
  }

  private _onError() {
    this._missing = true;
  }

  static styles = css`
    :host {
      display: inline-flex;
      flex: none;
      --mdc-icon-size: var(--upgrade-check-brand-size, 24px);
      color: var(--secondary-text-color);
    }
    img {
      width: var(--upgrade-check-brand-size, 24px);
      height: var(--upgrade-check-brand-size, 24px);
      object-fit: contain;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-upgrade-check-brand": HaUpgradeCheckBrand;
  }
}
