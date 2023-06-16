import * as React from 'react';
import Svg, {Circle, G, Path, Defs, ClipPath} from 'react-native-svg';

function CompassIcon(props) {
  return (
    <Svg
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Circle
        cx={16}
        cy={16}
        r={15.619}
        fill="#fff"
        stroke="#fff"
        strokeWidth={0.761905}
      />
      <G clipPath="url(#clip0_1225_10850)">
        <Path
          d="M21.655 8.07l-8.701 3.58c-.26.104-.454.33-.551.591l-3.338 9.334c-.308.851.486 1.686 1.264 1.355l8.701-3.597c.26-.105.454-.33.551-.591l3.354-9.334c.292-.834-.486-1.669-1.28-1.321V8.07zm-7.065 9.577c-1.36-1.043-1.36-3.199 0-4.241a2.303 2.303 0 012.788 0c1.36 1.042 1.36 3.198 0 4.24-.794.626-1.961.626-2.787 0z"
          fill="#333"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_1225_10850">
          <Path fill="#fff" transform="translate(9 8)" d="M0 0H14V15H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

export default CompassIcon;
