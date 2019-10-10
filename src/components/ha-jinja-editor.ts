import { HaCodeEditor } from "./ha-code-editor";
import "codemirror/mode/jinja2/jinja2";
import { customElement } from "lit-element";

@customElement("ha-jinja-editor")
export class HaJinjaEditor extends HaCodeEditor {
  public constructor() {
    super("jinja2");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-jinja-editor": HaJinjaEditor;
  }
}
