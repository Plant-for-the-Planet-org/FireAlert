import {useEffect} from 'react';
import {Linking} from 'react-native';

const useAppLinkHandler = (handleUrl: (url: string) => void) => {
  useEffect(() => {
    const handleUrlOpen = (event: {url: string}) => {
      console.log('Received App Link:', event.url);
      handleUrl(event.url);
    };

    Linking.addEventListener('url', handleUrlOpen);

    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App Link opened the app:', url);
        handleUrl(url);
      }
    });

    return () => {
      Linking.removeAllListeners('url');
    };
  }, [handleUrl]);
};

export default useAppLinkHandler;
