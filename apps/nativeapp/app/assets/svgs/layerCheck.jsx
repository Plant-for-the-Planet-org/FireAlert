import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function LayerCheck(props) {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path fill="#fff" d="M0 0H12V12H0z" />
      <Path
        d="M9.86 2a1.08 1.08 0 00-.76.345C7.374 4.129 6.042 5.628 4.458 7.298l-1.61-1.403a1.092 1.092 0 00-.816-.29 1.099 1.099 0 00-.771.404 1.165 1.165 0 00-.256.85c.029.307.178.59.412.78l2.398 2.092c.213.187.483.282.763.268.277-.011.54-.132.74-.334 1.992-2.059 3.405-3.7 5.352-5.712.213-.216.334-.51.33-.82 0-.308-.12-.601-.338-.818A1.11 1.11 0 009.86 2z"
        fill="#E86F56"
      />
    </Svg>
  );
}

export default LayerCheck;
