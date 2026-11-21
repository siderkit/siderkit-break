/** The web platform features every Siderkit Break window relies on. */
export interface WebFeatures {
  dialog: boolean;
  structuredClone: boolean;
}

/**
 * `<dialog>` and `structuredClone` both arrived in Safari 15.4, which is the
 * floor for macOS 10.15.7. Checking them separately keeps the diagnosis clear
 * when a user has an older system webview.
 */
export function isWebviewSupported(features: WebFeatures): boolean {
  return features.dialog && features.structuredClone;
}

export function detectWebFeatures(): WebFeatures {
  return {
    dialog:
      typeof HTMLDialogElement !== 'undefined' &&
      typeof HTMLDialogElement.prototype.showModal === 'function',
    structuredClone: typeof globalThis.structuredClone === 'function',
  };
}
