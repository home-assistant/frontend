import AbstractFrontendFormComponent from "../AbstractFrontendFormComponent";

class FrontendHiddenComponent extends AbstractFrontendFormComponent {
  render(..._: any[]) {
    return document.createElement("div");
  }
}

customElements.define("frontend-hidden-component", FrontendHiddenComponent);
export default {};
