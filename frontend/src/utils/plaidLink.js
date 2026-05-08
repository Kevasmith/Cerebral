// Plaid Link helper (native only).
//
// Wraps `react-native-plaid-link-sdk` so callers don't reach into the SDK
// directly. Requires a dev client / EAS build — the native module does not
// run in Expo Go.

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
