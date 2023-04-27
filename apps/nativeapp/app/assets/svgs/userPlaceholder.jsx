import * as React from 'react';
import Svg, {Path, G} from 'react-native-svg';

function UserPlaceholder(props) {
  return (
    <Svg
      id="Layer_1"
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      {...props}>
      <Path
        d="M288 307.2h-64A172.8 172.8 0 0051.2 480a32 32 0 0032 32h345.6a32 32 0 0032-32A172.8 172.8 0 00288 307.2z"
        fill="#E87B6490"
      />
      <Path
        d="M256 0a128 128 0 00-128 128v38.4a128 128 0 0064 110.87v55.53l64 38.4 64-38.4v-55.53a128 128 0 0064-110.87V128A128 128 0 00256 0z"
        fill="#dde5e8"
      />
      <Path
        d="M256 0a128 128 0 00-128 128v25.6l76.8-51.2s109.43 69.86 179.2 38.4V128A128 128 0 00256 0z"
        fill="#E87B64"
      />
      <G opacity={0.06}>
        <Path
          d="M256 0a127.82 127.82 0 00-32 4.2A127.94 127.94 0 01320 128v38.4a127.94 127.94 0 01-96 123.8 127.55 127.55 0 00160-123.8V128A128 128 0 00256 0z"
          fill="#17292d"
        />
      </G>
    </Svg>
  );
}

export default UserPlaceholder;
