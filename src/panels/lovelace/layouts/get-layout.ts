// @ts-nocheck
const CUSTOM_PREFIX = "custom:";

const layouts: { [key: string]: () => Promise<any> } = {
  default: () => Promise.resolve(DefaultLovelaceViewLayout),
  grid: () => import("./grid").GridLovelaceViewLayout,
};

export const getLovelaceViewLayout = (
  name: string
): Promise<LovelaceViewLayout> => {
  if (name in layouts) {
    return layouts[name]();
  }

  if (!name.startsWith(CUSTOM_PREFIX)) {
    // This will just generate a view with a single error card
    return errorLayout(`Unknown layout specified: ${name}`);
  }

  const tag = `ll-layout-${name.substr(CUSTOM_PREFIX.length)}`;

  return customElements.whenDefined(tag).then(() => customElements.get(tag));
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
    * View Config

<ll-layout-grid 
    .config=${this.lovelace.config.views[this.index!]} 
    .cards=${this._cards} 
    .badges=${this._badges}
    .editMode=${this._editMode}
    .columns=${this._columns}
></ll-layout-grid>

In my mind, this is a lit element (I guess it doesn't have to be) 
that has updated() and checks what changes. Similar to how our current view does it

*/
