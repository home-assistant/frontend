import { PaperInputElement } from "@polymer/paper-input/paper-input";

// Force file to be a module to augment global scope.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paper-input": Partial<PaperInputElement>;
    }
  }
}
