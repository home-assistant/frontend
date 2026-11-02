import type { ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { Blueprint, BlueprintDomain, Blueprints } from "../data/blueprint";
import { fetchBlueprints } from "../data/blueprint";
import { apiContext, internationalizationContext } from "../data/context";
import type { HaSelectSelectEvent } from "./ha-select";
import "./ha-select";

@customElement("ha-blueprint-picker")
class HaBluePrintPicker extends LitElement {
  @property() public label?: string;

  @property() public value = "";

  @property() public domain: BlueprintDomain = "automation";

  @property({ attribute: false }) public blueprints?: Blueprints;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-select") private _select?: HTMLElement;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  public open() {
    if (this._select) {
      // @ts-expect-error
      this._select.menuOpen = true;
    }
  }

  private _processedBlueprints = memoizeOne(
    (blueprints: Blueprints | undefined, language: string) => {
      if (!blueprints) {
        return [];
      }
      const result = Object.entries(blueprints)
        .filter((entry): entry is [string, Blueprint] => !("error" in entry[1]))
        .map(([path, blueprint]) => ({
          ...blueprint.metadata,
          path,
        }));
      return result.sort((a, b) => stringCompare(a.name, b.name, language));
    }
  );

  protected render() {
    return html`
      <ha-select
        .label=${
          this.label ||
          this._i18n.localize("ui.components.blueprint-picker.select_blueprint")
        }
        .value=${this.value}
        .disabled=${this.disabled}
        @selected=${this._blueprintChanged}
        .options=${this._processedBlueprints(
          this.blueprints,
          this._i18n.locale.language
        ).map((blueprint) => ({
          value: blueprint.path,
          label: blueprint.name,
        }))}
      >
      </ha-select>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (this.blueprints === undefined) {
      fetchBlueprints(this._api.callWS, this.domain).then((blueprints) => {
        this.blueprints = blueprints;
      });
    }
  }

  private _blueprintChanged(ev: HaSelectSelectEvent) {
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      this.value = newValue;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static styles = css`
    :host {
      display: inline-block;
    }
    ha-select {
      width: 100%;
      min-width: 200px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-picker": HaBluePrintPicker;
  }
}
