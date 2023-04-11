import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function EmailIcon(props) {
  return (
    <Svg
      width={17}
      height={13}
      viewBox="0 0 17 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.847 1.518L10.101 7.78a1.592 1.592 0 01-2.205 0L1.147 1.518c-.097.237-.15.5-.15.779v8.212c0 1.047.767 1.895 1.715 1.895h12.57c.948 0 1.715-.848 1.715-1.896V2.297c0-.28-.055-.542-.15-.78zM1.94.603l6.69 6.211a.532.532 0 00.734 0L16.055.603A1.576 1.576 0 0015.282.4H2.712c-.278 0-.54.072-.773.202z"
        fill="#4F4F4F"
      />
    </Svg>
  );
}

export default EmailIcon;
