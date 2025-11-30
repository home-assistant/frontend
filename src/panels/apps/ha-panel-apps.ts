import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeLocalize } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import "../../layouts/hass-error-screen";
import "../../layouts/hass-loading-screen";
import { fetchHassioAddonsInfo } from "../../data/hassio/addon";
import { fetchSupervisorStore } from "../../data/supervisor/store";
import type {
  Supervisor,
  SupervisorKeys,
} from "../../data/supervisor/supervisor";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant, Route } from "../../types";
import { getTranslation } from "../../util/common-translation";
import "./apps-store";

@customElement("ha-panel-apps")
class HaPanelApps extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _supervisor?: Partial<Supervisor>;

  @state() private _error?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this._loadSupervisorData();
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("hass") &&
      this._supervisor &&
      this.hass.language !==
        (changedProperties.get("hass") as HomeAssistant | undefined)?.language
    ) {
      this._initializeLocalize();
    }
  }

  protected render() {
    if (!isComponentLoaded(this.hass, "hassio")) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize("ui.panel.apps.not_available")}
        ></hass-error-screen>
      `;
    }

    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._supervisor?.store || !this._supervisor?.addon) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    return html`
      <apps-store
        .hass=${this.hass}
        .supervisor=${this._supervisor as Supervisor}
        .narrow=${this.narrow}
        .route=${this.route}
      ></apps-store>
    `;
  }

  private async _initializeLocalize() {
    const { language, data } = await getTranslation(null, this.hass.language);

    this._supervisor = {
      ...this._supervisor,
      localize: await computeLocalize<SupervisorKeys>(
        this.constructor.prototype,
        language,
        {
          [language]: data,
        }
      ),
    };
  }

  private async _loadSupervisorData(): Promise<void> {
    try {
      // Initialize localize function
      await this._initializeLocalize();

      // Fetch addon and store data
      const [addon, store] = await Promise.all([
        fetchHassioAddonsInfo(this.hass),
        fetchSupervisorStore(this.hass),
      ]);

      this._supervisor = {
        ...this._supervisor,
        addon,
        store,
      };

      this.addEventListener(
        "supervisor-collection-refresh",
        this._handleCollectionRefresh as unknown as EventListener
      );
    } catch (err: any) {
      this._error = err.message || "Failed to load supervisor data";
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.apps.error_loading"),
        text: this._error,
      });
    }
  }

  private _handleCollectionRefresh = async (ev: CustomEvent): Promise<void> => {
    const { collection } = ev.detail;
    try {
      if (collection === "addon") {
        const addon = await fetchHassioAddonsInfo(this.hass);
        this._supervisor = { ...this._supervisor, addon };
      } else if (collection === "store") {
        const store = await fetchSupervisorStore(this.hass);
        this._supervisor = { ...this._supervisor, store };
      }
    } catch (_err: any) {
      // Silently fail on refresh errors
    }
    fireEvent(this, "supervisor-collection-refresh", { collection });
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-apps": HaPanelApps;
  }
}
