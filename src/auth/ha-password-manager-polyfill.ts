import { DataEntryFlowStep } from "../data/data_entry_flow";

const ENABLED_HANDLERS = [
  "homeassistant",
  "legacy_api_password",
  "command_line",
];

export class PasswordManagerPolyfill {
  private _polyfill: HTMLFormElement;

  private _username: HTMLInputElement;

  private _password: HTMLInputElement;

  private _justPassword = false;

  // Add a form element to the page that password managers can see
  constructor(ondata: (data: any) => void, onsubmit: (ev: Event) => void) {
    this._polyfill = document.createElement("form");
    this._polyfill.setAttribute("aria-hidden", "true");
    this._polyfill.className = "password-manager-polyfill";
    // The left+top and input styles position the polyfill fields directly over the existing ones
    // This makes sure password managers place their UI elements in the correct spot
    this._polyfill.innerHTML = `
      <input id="username" />
      <input id="password" type="password" />
      <input type="submit"/>
      <style>
        .password-manager-polyfill {
          position: absolute;
          top: 170px;
          left: 50%;
          width: 0;
          height: 0;
          overflow: hidden;
        }
        .password-manager-polyfill input {
          width: 210px;
          height: 60px;
        }
      </style>
    `;
    this._username = this._polyfill.querySelector("#username")!;
    this._password = this._polyfill.querySelector("#password")!;

    this._polyfill.addEventListener("submit", (ev) => onsubmit(ev));
    this._polyfill.addEventListener("input", () => {
      if (this._justPassword) {
        ondata({ password: this._password.value });
      } else {
        ondata({
          username: this._username.value,
          password: this._password.value,
        });
      }
    });
  }

  public setStep(step: DataEntryFlowStep) {
    const [handler, _handler_id] = step.handler;
    if (
      step.type === "form" &&
      ENABLED_HANDLERS.includes(handler) &&
      step.step_id === "init"
    ) {
      // disable username field for login flows with just a password
      this._justPassword = handler === "legacy_api_password";
      this._username.style.display = this._justPassword ? "none" : "block";
      if (!document.body.contains(this._polyfill)) {
        document.body.appendChild(this._polyfill);
      }
    } else if (document.body.contains(this._polyfill)) {
      document.body.removeChild(this._polyfill);
    }
  }

  public update(stepData: any) {
    this._username.value = stepData.username ?? "";
    this._password.value = stepData.password ?? "";
  }
}
