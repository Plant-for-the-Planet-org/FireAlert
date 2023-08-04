import * as React from 'react';
import Svg, {G, Path} from 'react-native-svg';

function EyeIcon(props) {
  return (
    <Svg
      width="25px"
      height="25px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <G
        stroke="#E86F56"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round">
        <Path d="M12 5C8.243 5 5.436 7.44 3.767 9.44a3.96 3.96 0 000 5.12C5.436 16.56 8.243 19 12 19c3.757 0 6.564-2.44 8.233-4.44a3.96 3.96 0 000-5.12C18.564 7.44 15.757 5 12 5z" />
        <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      </G>
    </Svg>
  );
}

export default EyeIcon;
