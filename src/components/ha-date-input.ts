import "@vaadin/vaadin-date-picker/theme/material/vaadin-date-picker";

const VaadinDatePicker = customElements.get("vaadin-date-picker");

export class HaDateInput extends VaadinDatePicker {
  constructor() {
    super();

    this.i18n.formatDate = this._formatISODate;
    this.i18n.parseDate = this._parseISODate;
  }

  ready() {
    super.ready();
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      :host {
        width: 12ex;
        margin-top: -6px;
        --material-body-font-size: 16px;
        --_material-text-field-input-line-background-color: var(--primary-text-color);
        --_material-text-field-input-line-opacity: 1;
        --material-primary-color: var(--primary-text-color);
      }
    `;
    this.shadowRoot.appendChild(styleEl);
    this._inputElement.querySelector("[part='toggle-button']").style.display =
      "none";
  }

  private _formatISODate(d) {
    return [
      ("0000" + String(d.year)).slice(-4),
      ("0" + String(d.month + 1)).slice(-2),
      ("0" + String(d.day)).slice(-2),
    ].join("-");
  }

  private _parseISODate(text) {
    const parts = text.split("-");
    const today = new Date();
    let date;
    let month = today.getMonth();
    let year = today.getFullYear();
    if (parts.length === 3) {
      year = parseInt(parts[0]);
      if (parts[0].length < 3 && year >= 0) {
        year += year < 50 ? 2000 : 1900;
      }
      month = parseInt(parts[1]) - 1;
      date = parseInt(parts[2]);
    } else if (parts.length === 2) {
      month = parseInt(parts[0]) - 1;
      date = parseInt(parts[1]);
    } else if (parts.length === 1) {
      date = parseInt(parts[0]);
    }

    if (date !== undefined) {
      return { day: date, month, year };
    }
    return undefined;
  }
}

customElements.define("ha-date-input", HaDateInput as any);

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-input": HaDateInput;
  }
}
