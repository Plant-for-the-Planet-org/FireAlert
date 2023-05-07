import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function CopyIcon(props) {
  return (
    <Svg
      width={39}
      height={39}
      viewBox="0 0 39 39"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M16.25 6.5A3.25 3.25 0 0013 9.75V26a3.25 3.25 0 003.25 3.25H26A3.25 3.25 0 0029.25 26V9.75A3.25 3.25 0 0026 6.5h-9.75zm-1.625 3.25a1.625 1.625 0 011.625-1.625H26a1.625 1.625 0 011.625 1.625V26A1.625 1.625 0 0126 27.625h-9.75A1.625 1.625 0 0114.625 26V9.75z"
        fill="#4F4F4F"
      />
      <Path
        d="M9.75 13a3.25 3.25 0 011.625-2.814v16.627a4.062 4.062 0 004.063 4.062h10.126A3.25 3.25 0 0122.75 32.5h-7.313a5.688 5.688 0 01-5.687-5.687V13z"
        fill="#4F4F4F"
      />
    </Svg>
  );
}

export default CopyIcon;
