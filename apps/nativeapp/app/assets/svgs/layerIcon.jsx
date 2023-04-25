import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function LayerIcon(props) {
  return (
    <Svg
      height="800px"
      width="800px"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 502.664 502.664"
      xmlSpace="preserve"
      {...props}>
      <Path d="M502.664 156.474L251.343 19.867 0 156.474 251.343 293.104z" />
      <Path d="M251.343 337.151L46.722 225.975 0 251.364 251.343 387.929 502.664 251.364 455.942 225.975z" />
      <Path d="M251.343 432.02L46.722 320.822 0 346.168 251.343 482.797 502.664 346.168 455.942 320.822z" />
    </Svg>
  );
}

export default LayerIcon;
