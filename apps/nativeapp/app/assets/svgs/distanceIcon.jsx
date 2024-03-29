import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function DistanceIcon(props) {
  return (
    <Svg
      width={20}
      height={21}
      viewBox="0 0 20 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path transform="translate(0 .404)" fill="#fff" d="M0 0H20V20H0z" />
      <Path
        d="M9.874 18.404a.905.905 0 01-.388-.347c-1.489-2.103-2.988-4.2-4.468-6.31a5.616 5.616 0 01-.99-2.735C3.78 6.45 5.165 3.986 7.515 2.972c2.28-.987 4.437-.688 6.366.892a5.714 5.714 0 011.42 1.714c.356.66.579 1.383.653 2.128a5.869 5.869 0 01-1.095 4.223 8726.525 8726.525 0 00-4.327 6.09.935.935 0 01-.409.385h-.248zm2.737-9.975a2.607 2.607 0 00-.756-1.845 2.62 2.62 0 00-3.689-.031 2.596 2.596 0 00-.783 1.833c-.01.69.255 1.356.738 1.853.48.494 1.14.78 1.831.792a2.62 2.62 0 001.87-.75c.5-.489.784-1.155.789-1.852z"
        fill="#4F4F4F"
      />
    </Svg>
  );
}

export default DistanceIcon;
