const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `
<dom-module id="ha-date-picker-text-field-styles" theme-for="vaadin-text-field">
  <template>
    <style>
      :host {
        padding: 8px 0 11px 0;
        margin: 0;
      }

      [part~="label"] {
        top: 6px;
        font-size: var(--paper-font-subhead_-_font-size);
        color: var(--paper-input-container-color, var(--secondary-text-color));
      }

      :host([focused]) [part~="label"] {
        color: var(--paper-input-container-focus-color, var(--primary-color));
      }

      [part~="input-field"] {
        color: var(--primary-text-color);
        top: 3px;
      }

      [part~="input-field"]::before, [part~="input-field"]::after {
        background-color: var(--paper-input-container-color, var(--secondary-text-color));
        opacity: 1;
      }

      :host([focused]) [part~="input-field"]::before, :host([focused]) [part~="input-field"]::after {
        background-color: var(--paper-input-container-focus-color, var(--primary-color));
      }

      [part~="value"] {
        font-size: var(--paper-font-subhead_-_font-size);
        height: 24px;
        padding-top: 4px;
        padding-bottom: 0;
      }
    </style>
  </template>
</dom-module>
<dom-module id="ha-date-picker-button-styles" theme-for="vaadin-button">
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
</dom-module>
<dom-module id="ha-date-picker-overlay-styles" theme-for="vaadin-date-picker-overlay">
  <template>
    <style include="vaadin-date-picker-overlay-default-theme">
      [part~="toolbar"] {
        padding: 0.3em;
        background-color: var(--secondary-background-color);
      }

      [part="years"] {
        background-color: var(--secondary-text-color);
        --material-body-text-color: var(--primary-background-color);
      }

      [part="overlay"] {
        background-color: var(--primary-background-color);
        --material-body-text-color: var(--secondary-text-color);
      }

    </style>
  </template>
</dom-module>
<dom-module id="ha-date-picker-month-styles" theme-for="vaadin-month-calendar">
  <template>
    <style include="vaadin-month-calendar-default-theme">
      [part="date"][today] {
        color: var(--primary-color);
      }
    </style>
  </template>
</dom-module>
`;

document.head.appendChild(documentContainer.content);
