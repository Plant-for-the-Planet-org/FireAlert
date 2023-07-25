import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function EyeOffIcon(props) {
  return (
    <Svg
      width="25px"
      height="25px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="#E86F56"
      {...props}>
      <Path
        d="M9.764 5.295A8.619 8.619 0 0112 5c3.757 0 6.564 2.44 8.233 4.44a3.96 3.96 0 010 5.12c-.192.23-.4.466-.621.704M12.5 9.04a3.002 3.002 0 012.459 2.459M3 3l18 18m-9.5-6.041A3.004 3.004 0 019.17 13M4.35 8.778c-.208.223-.402.445-.582.661a3.961 3.961 0 000 5.122C5.435 16.56 8.242 19 12 19a8.62 8.62 0 002.274-.306"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default EyeOffIcon;
