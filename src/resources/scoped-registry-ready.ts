// Imported right after the scoped custom element registry polyfill. The index
// page starts the extra modules from Core only after this has run, so their
// elements are defined in the registry that the app uses.
window.__haScopedRegistryReady = true;
window.__haLoadExtraModules?.();
