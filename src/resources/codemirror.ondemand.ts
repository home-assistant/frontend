export type CodeMirror = typeof import("./codemirror");

let loaded: CodeMirror;

export const loadCodeMirror = async () => {
  loaded ??= await import("./codemirror");
  return loaded;
};
