import { DeviceInfo, DeviceOS, DeviceType, RegisteredDevice } from '../types';

const DEVICE_ID_STORAGE_KEY = 'kfh_hardware_device_id_v1';
const REGISTERED_DEVICES_KEY = 'kfh_registered_devices_list_v1';

/**
 * Gets or creates a stable persistent hardware/browser device ID
 * e.g. "KFH-WIN-8492" or "KFH-DESK-3190"
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length > 4) {
      return existing;
    }
  } catch (err) {
    console.warn('Could not read localStorage for device ID', err);
  }

  // Generate prefix based on OS
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let prefix = 'KFH-DEV';
  if (/Windows/i.test(ua)) prefix = 'KFH-WIN';
  else if (/android/i.test(ua)) prefix = 'KFH-AND';
  else if (/iPad|iPhone|iPod/.test(ua)) prefix = 'KFH-IOS';
  else if (/Macintosh/i.test(ua)) prefix = 'KFH-MAC';
  else if (/Linux/i.test(ua)) prefix = 'KFH-LNX';

  // Random 4-character hex suffix
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const newDeviceId = `${prefix}-${randomSuffix}`;

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, newDeviceId);
  } catch (err) {
    console.warn('Could not save device ID to localStorage', err);
  }

  return newDeviceId;
}

/**
 * Returns full device information including persistent hardware ID and readable name
 */
export function detectDeviceInfo(): DeviceInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let os: DeviceOS = 'Other';
  let deviceType: DeviceType = 'Desktop';

  // OS Detection
  if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iOS';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'Mac';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Device Type Detection
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  const browser = getBrowserName(ua);
  const deviceId = getOrCreateDeviceId();
  const registeredDevices = getStoredRegisteredDevices();
  const matchingRegistered = registeredDevices.find(d => d.id === deviceId);

  // Friendly name
  let deviceName = matchingRegistered?.name || `${os} ${deviceType} (${browser} • ${deviceId})`;

  // Biometrics Check
  const supportsBiometrics = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined && 
    typeof window.PublicKeyCredential === 'function';

  return {
    deviceId,
    deviceName,
    os,
    deviceType,
    browser,
    userAgent: ua,
    supportsBiometrics,
    isRegistered: !!matchingRegistered
  };
}

function getBrowserName(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Browser';
}

/**
 * Storage helpers for Registered Devices
 */
export function getStoredRegisteredDevices(): RegisteredDevice[] {
  try {
    const raw = localStorage.getItem(REGISTERED_DEVICES_KEY);
    if (!raw) {
      // Auto-register default shop counter device if empty
      const defaultDevices: RegisteredDevice[] = [
        {
          id: getOrCreateDeviceId(),
          name: 'Main Counter POS (This Windows PC)',
          os: 'Windows',
          deviceType: 'Desktop',
          browser: 'Chrome',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          registeredAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          isTrusted: true,
          notes: 'Default authorized shop billing counter'
        }
      ];
      saveStoredRegisteredDevices(defaultDevices);
      return defaultDevices;
    }
    const parsed = JSON.parse(raw) as RegisteredDevice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading registered devices:', err);
    return [];
  }
}

export function saveStoredRegisteredDevices(devices: RegisteredDevice[]): void {
  try {
    localStorage.setItem(REGISTERED_DEVICES_KEY, JSON.stringify(devices));
  } catch (err) {
    console.error('Error saving registered devices:', err);
  }
}

export function registerCurrentDevice(customName?: string): RegisteredDevice {
  const info = detectDeviceInfo();
  const devices = getStoredRegisteredDevices();
  const existingIdx = devices.findIndex(d => d.id === info.deviceId);

  const newEntry: RegisteredDevice = {
    id: info.deviceId,
    name: customName || (existingIdx >= 0 ? devices[existingIdx].name : `${info.os} Counter Terminal (${info.deviceId})`),
    os: info.os,
    deviceType: info.deviceType,
    browser: info.browser,
    userAgent: info.userAgent,
    registeredAt: existingIdx >= 0 ? devices[existingIdx].registeredAt : new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    isTrusted: true,
  };

  if (existingIdx >= 0) {
    devices[existingIdx] = newEntry;
  } else {
    devices.unshift(newEntry);
  }

  saveStoredRegisteredDevices(devices);
  return newEntry;
}

export function deleteRegisteredDevice(deviceId: string): void {
  const devices = getStoredRegisteredDevices().filter(d => d.id !== deviceId);
  saveStoredRegisteredDevices(devices);
}

