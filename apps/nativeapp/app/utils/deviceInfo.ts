import {getUniqueId, getDeviceName} from 'react-native-device-info';

export async function getDeviceInfo() {
  const deviceId = await getUniqueId();
  const deviceName = await getDeviceName();
  return {deviceId, deviceName};
}
