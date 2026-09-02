import { LitElement } from "lit";
import { property } from "lit/decorators";
import type { Hacs } from "./data/hacs";
import { HacsLogger } from "./tools/hacs-logger";
import { ProvideHassLitMixin } from "../../mixins/provide-hass-lit-mixin";
import {
  fetchHacsInfo,
  getRepositories,
  websocketSubscription,
} from "./data/websocket";
import { HacsDispatchEvent } from "./data/common";

export class HacsElement extends ProvideHassLitMixin(LitElement) {
  @property({ attribute: false }) public hacs: Partial<Hacs> = {};

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasUpdated) {
      return;
    }
    this._initHacs();
  }

  protected willUpdate() {
    if (!this.hasUpdated) {
      this._initHacs();
    }
  }

  private async _initHacs(): Promise<void> {
    websocketSubscription(
      this.hass,
      () => this._updateProperties("configuration"),
      HacsDispatchEvent.CONFIG
    );

    websocketSubscription(
      this.hass,
      () => this._updateProperties("status"),
      HacsDispatchEvent.STATUS
    );

    websocketSubscription(
      this.hass,
      () => this._updateProperties("status"),
      HacsDispatchEvent.STAGE
    );

    websocketSubscription(
      this.hass,
      () => this._updateProperties("repositories"),
      HacsDispatchEvent.REPOSITORY
    );

    this.hass.connection.subscribeEvents(
      async () => this._updateProperties("lovelace"),
      "lovelace_updated"
    );

    this._updateHacs({
      log: new HacsLogger(),
    });

    this._updateProperties();

    this.addEventListener("update-hacs", (e) =>
      this._updateHacs((e as any).detail as Partial<Hacs>)
    );
  }

  private async _updateProperties(prop = "all") {
    const _updates: any = {};
    const _fetch: any = {};

    if (prop === "all") {
      [_fetch.repositories, _fetch.info] = await Promise.all([
        getRepositories(this.hass),
        fetchHacsInfo(this.hass),
      ]);
    } else if (prop === "info") {
      _fetch.info = await fetchHacsInfo(this.hass);
    } else if (prop === "repositories") {
      _fetch.repositories = await getRepositories(this.hass);
    }

    Object.keys(_fetch).forEach((update) => {
      if (_fetch[update] !== undefined) {
        _updates[update] = _fetch[update];
      }
    });
    if (_updates) {
      this._updateHacs(_updates);
      this.requestUpdate();
    }
  }

  protected _updateHacs(update: Partial<Hacs>) {
    this.hacs = { ...this.hacs, ...update };
  }
}
