import * as React from 'react';
import Svg, {Rect, Path} from 'react-native-svg';

function PencilRoundIcon(props) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Rect width={22} height={22} rx={11} fill="#E86F56" />
      <Path
        d="M15.718 8.528l-2.24-2.24a.344.344 0 00-.243-.099.355.355 0 00-.235.1l-1.054 1.05 2.715 2.714L15.715 9a.34.34 0 00.097-.238.318.318 0 00-.094-.234zM6.293 12.993a.333.333 0 00-.097.235l-.008 2.25c0 .092.035.177.1.242.064.064.149.1.24.1l2.248-.01a.324.324 0 00.235-.1l5.181-5.178-2.715-2.715-5.184 5.176z"
        fill="#fff"
      />
    </Svg>
  );
}

export default PencilRoundIcon;
