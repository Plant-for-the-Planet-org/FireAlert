import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function DisabledTrashOutlineIcon(props) {
  return (
    <Svg
      width={21}
      height={22}
      viewBox="0 0 21 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M1.5 5h18M17.5 5v14a2 2 0 01-2 2h-10a2 2 0 01-2-2V5m3 0V3a2 2 0 012-2h4a2 2 0 012 2v2M8.5 10v6M12.5 10v6"
        stroke="#707070"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default DisabledTrashOutlineIcon;
