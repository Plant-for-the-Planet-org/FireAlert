import * as React from 'react';
import Svg, {G, Path, Defs, ClipPath} from 'react-native-svg';

function LogoutIcon(props) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <G clipPath="url(#clip0_1225_10230)">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.517 18.483a1.382 1.382 0 010-1.952 1.379 1.379 0 011.952 0 6.895 6.895 0 009.752 0 6.895 6.895 0 000-9.752 6.895 6.895 0 00-9.752 0 1.382 1.382 0 01-1.952 0 1.379 1.379 0 010-1.951c3.77-3.77 9.883-3.77 13.655 0 3.77 3.769 3.77 9.882 0 13.655-3.769 3.769-9.882 3.769-13.655 0zm9.928-5.993l-3.162 3.22c-1.3 1.297-3.252-.648-1.952-1.945l.014-.013c.407-.4.272-.724-.3-.724h-6.67A1.379 1.379 0 012 11.645v.017c0-.766.617-1.383 1.376-1.383h6.669c.576 0 .707-.324.3-.724l-.014-.014c-1.3-1.296.652-3.238 1.952-1.944l3.155 3.175a1.22 1.22 0 01.003 1.714l.004.004z"
          fill="#E86F56"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_1225_10230">
          <Path fill="#fff" transform="translate(2 2)" d="M0 0H20V19.3103H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default LogoutIcon;
