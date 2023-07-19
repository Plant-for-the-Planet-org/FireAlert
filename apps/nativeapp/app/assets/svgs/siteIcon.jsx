import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function SiteIcon(props) {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width="22px"
      height="22px"
      viewBox="-1.6 -1.6 35.20 35.20"
      xmlSpace="preserve"
      fill="#4F4F4F"
      stroke="#4F4F4F"
      strokeWidth={1.7600000000000002}
      {...props}>
      <Path d="M.943 28.222l9.371 3.742a.488.488 0 00.372 0l9.823-3.923 9.48 3.441a1.498 1.498 0 002.012-1.41V9.194c0-.629-.397-1.195-.988-1.41l-5.997-2.177a.5.5 0 10-.342.941l5.997 2.177c.196.071.329.26.329.469v20.879a.498.498 0 01-.67.47L21 27.156V19a.5.5 0 00-1 0v8.167l-9 3.594V20a.5.5 0 00-1 0v10.762l-8.686-3.468A.499.499 0 011 26.829V5.976c0-.168.08-.319.22-.414a.493.493 0 01.466-.05l3.24 1.294a.5.5 0 00.371-.929l-3.24-1.294A1.501 1.501 0 000 5.976v20.853c0 .617.37 1.164.943 1.393z" />
      <Path d="M14.057 22.467a1.235 1.235 0 002.036-.003l3.696-5.308L21.863 14c1.475-1.868 2.104-4.207 1.771-6.586C23.1 3.585 19.912.491 16.054.056c-5.233-.58-9.681 3.494-9.681 8.595 0 1.997.648 3.77 2.096 5.738l5.588 8.078zM15.047 1c.295 0 .594.017.896.051 3.41.384 6.229 3.119 6.701 6.502a7.651 7.651 0 01-1.592 5.862l-2.092 3.18-3.691 5.301c-.123.18-.268.179-.391.001l-5.596-8.089c-1.321-1.797-1.91-3.388-1.91-5.158C7.373 4.432 10.815 1 15.047 1z" />
      <Path d="M15.002 11.651c1.654 0 3-1.346 3-3s-1.346-3-3-3-3 1.346-3 3 1.346 3 3 3zm0-5c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2z" />
    </Svg>
  );
}

export default SiteIcon;