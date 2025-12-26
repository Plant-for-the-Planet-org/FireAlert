import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function LoginIcon(props) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M10.6 14.275l3.2-3.2-3.2-3.2m-9.6 3.2h12.713"
        stroke="#E86F56"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 1c5.525 0 10 3.75 10 10s-4.475 10-10 10"
        stroke="#E86F56"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default LoginIcon;
