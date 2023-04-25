import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function AddIcon(props) {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M16.585 8.985c0-.882-.715-1.597-1.598-1.597h-4.793V2.595a1.598 1.598 0 10-3.194 0v4.793H2.207a1.598 1.598 0 100 3.195H7v4.793a1.598 1.598 0 103.194 0v-4.793h4.793c.883 0 1.598-.716 1.598-1.598z"
        fill="#E86F56"
      />
    </Svg>
  );
}

export default AddIcon;
