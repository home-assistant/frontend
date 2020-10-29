// @ts-ignore
import _CodeMirror, { Editor } from "codemirror";
// @ts-ignore
import _codeMirrorCss from "codemirror/lib/codemirror.css";
import "codemirror/mode/jinja2/jinja2";
import "codemirror/mode/yaml/yaml";
import { fireEvent } from "../common/dom/fire_event";

// @ts-ignore
_CodeMirror.commands.save = (cm: Editor) => {
  fireEvent(cm.getWrapperElement(), "editor-save");
};
export const codeMirror: any = _CodeMirror;
export const codeMirrorCss: any = _codeMirrorCss;
