import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function VerificationWarning(props) {
  return (
    <Svg
      width={8}
      height={8}
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M7.613 6.015L4.902.828c-.404-.765-1.4-.765-1.804 0L.387 6.015c-.404.764.099 1.736.907 1.736h5.412c.799 0 1.301-.96.907-1.736zm-3.618.622c-.256 0-.444-.218-.444-.491 0-.284.198-.491.444-.491.256 0 .444.218.444.49 0 .274-.188.492-.444.492zm.621-4.171l-.246 2.25c0 .218-.168.414-.375.414-.197 0-.375-.185-.375-.415l-.236-2.25-.01-.087c0-.284.286-.502.621-.502.345 0 .621.218.621.502v.088z"
        fill="#F2994A"
      />
    </Svg>
  );
}

export default VerificationWarning;
