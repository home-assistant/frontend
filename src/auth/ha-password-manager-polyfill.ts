// All children of ha-authorize with Shadow DOM roots
const SHADOW_ELEMENTS =
  "ha-auth-flow, ha-form, ha-form-string, paper-input, paper-input-container, iron-input, mwc-button";

function findThroughShadowDOM(root, querySelector) {
  // Finds children of root, even across shadow DOM boundaries.
  const results = [...root.querySelectorAll(querySelector)];
  root.querySelectorAll(SHADOW_ELEMENTS).forEach((el) => {
    results.push(...findThroughShadowDOM(el.shadowRoot, querySelector));
  });
  return results;
}

const passwordManagerPolyfill = document.createElement("form");
passwordManagerPolyfill.setAttribute("aria-hidden", "true");
passwordManagerPolyfill.id = "password-manager-polyfill";
passwordManagerPolyfill.innerHTML = `
<input id="username" />
<input id="password" type="password" />
<input type="submit"/>
<style>
  #password-manager-polyfill {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
`;
document.body.appendChild(passwordManagerPolyfill);

passwordManagerPolyfill.addEventListener("submit", (ev) => {
  ev.preventDefault();
  // Click the next button after a delay allowing the inputs to update.
  // The delay also allows the user to see the fields were filled before they disappear.
  setTimeout(() => {
    const authorizeRoot = document.querySelector("ha-authorize")!.shadowRoot;
    findThroughShadowDOM(authorizeRoot, "button")[0].click();
  }, 300);
});

passwordManagerPolyfill.addEventListener("input", (ev) => {
  const authorizeRoot = document.querySelector("ha-authorize")!.shadowRoot;
  const inputs = findThroughShadowDOM(authorizeRoot, "input");
  if (inputs.length !== 2) {
    throw new Error("Username and Password fields not found on page");
  }
  const target = ev.target! as HTMLInputElement;
  // The event notifies the parent element the password field has changed.
  const event = new Event("input", { bubbles: true });
  // Update the fields after some delay so that the username field has time to
  // update before the password is set. This way, when password is set, both fields are passed together.
  setTimeout(() => {
    if (target.id === "username") {
      inputs[0].value = target.value;
      inputs[0].dispatchEvent(event);
    }
    if (target.id === "password") {
      inputs[1].value = target.value;
      inputs[1].dispatchEvent(event);
    }
  }, 1);
});
