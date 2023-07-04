import {Linking} from 'react-native';

export default function handleLink(
  link: string | undefined,
  lat: number,
  lng: number,
) {
  Linking.canOpenURL(link).then(supported => {
    if (supported) {
      Linking.openURL(link);
    } else {
      const browser_url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      return Linking.openURL(browser_url);
    }
  });
}
