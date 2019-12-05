import { PaperInputElement } from "@polymer/paper-input/paper-input";

// Force file to be a module to augment global scope.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paper-input": Partial<PaperInputElement>;
      "ha-config-section": any;
      "ha-card": any;
      "paper-radio-button": any;
      "paper-radio-group": any;
      "ha-entity-picker": any;
      "paper-listbox": any;
      "paper-item": any;
      "paper-menu-button": any;
      "paper-dropdown-menu-light": any;
      "paper-icon-button": any;
      "ha-device-picker": any;
      "ha-device-condition-picker": any;
      "ha-textarea": any;
      "ha-code-editor": any;
      "ha-service-picker": any;
      "mwc-button": any;
      "ha-automation-trigger": any;
      "ha-automation-condition": any;
      "ha-automation-condition-editor": any;
      "ha-device-trigger-picker": any;
      "ha-device-action-picker": any;
      "ha-form": any;
    }
  }
}
