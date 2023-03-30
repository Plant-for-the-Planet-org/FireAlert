import {Linking} from 'react-native';

export default function handleLink(link: string) {
  Linking.canOpenURL(link).then(supported => {
    if (supported) {
      Linking.openURL(link);
    } else {
      console.log('Cannot open the link');
    }
  });
}
