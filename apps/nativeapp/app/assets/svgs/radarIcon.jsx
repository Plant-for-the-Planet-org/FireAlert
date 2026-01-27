import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function RadarIcon(props) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M5 3c1.67-1.25 3.75-2 6-2 5.52 0 10 4.48 10 10s-4.48 10-10 10S1 16.52 1 11c0-1.81.48-3.51 1.33-4.98L11 11"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default RadarIcon;
