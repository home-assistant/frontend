import { LovelaceViewElement } from "../../../data/lovelace";

// @ts-noceck
const CUSTOM_PREFIX = "custom:";

const layouts: { [key: string]: () => Promise<any> } = {
  masonry: () => import("./masonry-view"),
  panel: () => import("./panel-view"),
  // grid: () => import("./grid").GridLovelaceViewLayout,
};

export const getLovelaceViewElement = (name: string): LovelaceViewElement => {
  let tag = "ll-view-";

  if (name in layouts) {
    layouts[name]();
    tag += name;
  }

  if (name.startsWith(CUSTOM_PREFIX)) {
    // This will just generate a view with a single error card
    // return errorLayout(`Unknown layout specified: ${name}`);
    tag += name.substr(CUSTOM_PREFIX.length);
  }

  const element = document.createElement(tag) as LovelaceViewElement;

  console.log(
    customElements.whenDefined(tag).then(() => customElements.get(tag))
  );

  return element;
};

/*

Layout needs to handle:

    * Config Changing
    * Columns Changing
    * Edit Mode Changing

HA will provide the layout:

    * Cards
    * Badges
    * Edit Mode
    * Columns (though maybe this should be done in the layout?)
    * Lovelace
    * Index

<ll-layout-grid 
    .config=${this.lovelace.config.views[this.index!]} 
    .cards=${this._cards} 
    .badges=${this._badges}
    .editMode=${this._editMode}
    .columns=${this._columns}
></ll-layout-grid>

Or more like

this._layout = document.createElement(getLovelaceViewLayout(viewConfig.layout));
this._layout.config = viewConfig;
this._layout.cards = this._cards;
this._layout.badges = this._badges;
this._layout.columns = this._columns;
this._layout.editMode = editMode;

In my mind, this is a lit element (I guess it doesn't have to be lit) 
that has updated() and checks what changes. Similar to how our current view does it

*/
