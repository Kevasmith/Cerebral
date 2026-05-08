// Cross-platform Plaid Link helper.
//
// Native (iOS/Android): wraps `react-native-plaid-link-sdk`. Requires a dev
// client / EAS build — the native module does not run in Expo Go.
//
// Web: dynamically loads Plaid's hosted Link.js script the first time it's
// needed, then uses the global `Plaid.create({ token, onSuccess, onExit })`.

import { Platform } from 'react-native';

const PLAID_LINK_JS = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

let webScriptPromise = null;

function loadWebScript() {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Plaid Link.js requires a browser'));
  }
  if (window.Plaid) return Promise.resolve();
  if (webScriptPromise) return webScriptPromise;

  webScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PLAID_LINK_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Plaid Link.js failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = PLAID_LINK_JS;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Plaid Link.js failed to load'));
    document.head.appendChild(s);
  });

  return webScriptPromise;
}

/**
 * Open Plaid Link.
 * @param {object} opts
 * @param {string} opts.linkToken            - link_token from POST /accounts/link-token
 * @param {(publicToken: string, metadata: any) => void} opts.onSuccess
 * @param {(err: any, metadata: any) => void} [opts.onExit]
 * @param {(eventName: string, metadata: any) => void} [opts.onEvent]
 */
export async function openPlaidLink({ linkToken, onSuccess, onExit, onEvent }) {
  if (!linkToken) {
    throw new Error('openPlaidLink: linkToken is required');
  }

  if (Platform.OS === 'web') {
    await loadWebScript();
    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: (publicToken, metadata) => onSuccess?.(publicToken, metadata),
      onExit: (err, metadata) => onExit?.(err, metadata),
      onEvent: (eventName, metadata) => onEvent?.(eventName, metadata),
    });
    handler.open();
    return;
  }

  // Native (iOS / Android). Requires a dev client / EAS build.
  // eslint-disable-next-line global-require
  const Plaid = require('react-native-plaid-link-sdk');
  const create = Plaid.create ?? Plaid.default?.create;
  const open = Plaid.open ?? Plaid.default?.open;

  if (typeof create !== 'function' || typeof open !== 'function') {
    throw new Error(
      'react-native-plaid-link-sdk native module is not linked — build the dev client with EAS',
    );
  }

  create({ token: linkToken });
  open({
    onSuccess: (success) => onSuccess?.(success.publicToken, success.metadata ?? success),
    onExit: (exit) => onExit?.(exit?.error, exit?.metadata),
    onEvent: (event) => onEvent?.(event?.eventName, event?.metadata),
  });
}
