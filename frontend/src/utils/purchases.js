import { Platform } from 'react-native';

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// RevenueCat API key — set EXPO_PUBLIC_REVENUECAT_IOS_KEY in your .env
const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

let Purchases = null;

async function getRC() {
  if (!IS_NATIVE) return null;
  if (!Purchases) {
    Purchases = require('react-native-purchases').default;
  }
  return Purchases;
}

export async function initPurchases(userId) {
  const RC = await getRC();
  if (!RC || !RC_IOS_KEY) return;
  await RC.configure({ apiKey: RC_IOS_KEY, appUserID: userId ?? null });
}

export async function getOfferings() {
  const RC = await getRC();
  if (!RC) return null;
  try {
    const offerings = await RC.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(rcPackage) {
  const RC = await getRC();
  if (!RC) throw new Error('Purchases not available on this platform');
  const { customerInfo } = await RC.purchasePackage(rcPackage);
  return customerInfo;
}

export async function restorePurchases() {
  const RC = await getRC();
  if (!RC) throw new Error('Purchases not available on this platform');
  return RC.restorePurchases();
}

export async function getCustomerInfo() {
  const RC = await getRC();
  if (!RC) return null;
  try {
    return await RC.getCustomerInfo();
  } catch {
    return null;
  }
}

export function isNativePurchasesAvailable() {
  return IS_NATIVE && !!RC_IOS_KEY;
}
