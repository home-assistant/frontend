interface LoadedCodeMirror {
  codeMirror: any;
  codeMirrorCss: any;
}

let loaded: Promise<LoadedCodeMirror>;

export const loadCodeMirror = async (): Promise<LoadedCodeMirror> => {
  if (!loaded) {
    loaded = import("./codemirror");
  }
  return loaded;
};
