import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function SmsIcon(props) {
  return (
    <Svg
      width={17}
      height={16}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.526 13.761v.132c-.009.625-.08 1.472-.08 1.472a.55.55 0 00.88.488c-.001 0 5.404-4.057 5.799-4.446 1.172-1.154 1.87-2.641 1.87-4.253.002-3.623-3.555-6.623-8-6.623-4.444 0-7.998 3-7.998 6.62 0 3.49 3.308 6.407 7.529 6.61zm.47-7.714a1.103 1.103 0 10-.002 2.206 1.103 1.103 0 00.002-2.206zm3.861 0a1.103 1.103 0 10-.001 2.206 1.103 1.103 0 00.001-2.206zm-7.723 0a1.103 1.103 0 10-.002 2.206 1.103 1.103 0 00.002-2.206z"
        fill="#4F4F4F"
      />
    </Svg>
  );
}

export default SmsIcon;
