const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `<dom-module id="ha-date-picker-vaadin-date-picker-styles" theme-for="vaadin-date-picker">
  <template>
    <style>
      :host([required]) [part~="clear-button"] {
        display: none;
      }

      [part~="toggle-button"] {
        color: var(--secondary-text-color);
        font-size: var(--paper-font-subhead_-_font-size);
        margin-right: 5px;
      }

      :host([opened]) [part~="toggle-button"] {
        color: var(--primary-color);
      }
    </style>
  </template>
</dom-module><dom-module id="ha-date-picker-text-field-styles" theme-for="vaadin-text-field">
  <template>
    <style>
      :host {
        padding: 8px 0;
      }

      [part~="label"] {
        color: var(--paper-input-container-color, var(--secondary-text-color));
        font-family: var(--paper-font-caption_-_font-family);
        font-size: var(--paper-font-caption_-_font-size);
        font-weight: var(--paper-font-caption_-_font-weight);
        letter-spacing: var(--paper-font-caption_-_letter-spacing);
        line-height: var(--paper-font-caption_-_line-height);
      }
      :host([focused]) [part~="label"] {
          color: var(--paper-input-container-focus-color, var(--primary-color));
      }

      [part~="input-field"] {
        padding-bottom: 1px;
        border-bottom: 1px solid var(--paper-input-container-color, var(--secondary-text-color));
        line-height: var(--paper-font-subhead_-_line-height);
      }

      :host([focused]) [part~="input-field"] {
        padding-bottom: 0;
        border-bottom: 2px solid var(--paper-input-container-focus-color, var(--primary-color));
      }
      [part~="value"]:focus {
        outline: none;
      }

      [part~="value"] {
        font-size: var(--paper-font-subhead_-_font-size);
        font-family: inherit;
        color: inherit;
        border: none;
        background: transparent;
      }
    </style>
  </template>
</dom-module><dom-module id="ha-date-picker-button-styles" theme-for="vaadin-button">
  <template>
    <style>
      :host([part~="today-button"]) [part~="button"]::before {
        content: "⦿";
        color: var(--primary-color);
      }

      [part~="button"] {
        font-family: inherit;
        font-size: var(--paper-font-subhead_-_font-size);
        border: none;
        background: transparent;
        cursor: pointer;
        min-height: var(--paper-item-min-height, 48px);
        padding: 0px 16px;
        color: inherit;
      }

      [part~="button"]:focus {
        outline: none;
      }
    </style>
  </template>
</dom-module><dom-module id="ha-date-picker-overlay-styles" theme-for="vaadin-date-picker-overlay">
  <template>
    <style include="vaadin-date-picker-overlay-default-theme">
      :host {
        background-color: var(--paper-card-background-color, var(--primary-background-color));
      }

      [part~="toolbar"] {
        padding: 0.3em;
        background-color: var(--secondary-background-color);
      }

      [part="years"] {
        background-color: var(--paper-grey-200);
      }

    </style>
  </template>
</dom-module><dom-module id="ha-date-picker-month-styles" theme-for="vaadin-month-calendar">
  <template>
    <style include="vaadin-month-calendar-default-theme">
      :host([focused]) [part="date"][focused],
      [part="date"][selected] {
        background-color: var(--paper-grey-200);
      }
      [part="date"][today] {
        color: var(--primary-color);
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild(documentContainer.content);
