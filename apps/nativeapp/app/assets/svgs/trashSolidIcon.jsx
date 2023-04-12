import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function TrashSolidIcon(props) {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M15.924 3.366h-3.679v-.602A1.809 1.809 0 0010.477.991H6.688c-.97.022-1.74.801-1.762 1.773v.602H1.24a.636.636 0 00-.644.646c0 .365.28.646.644.646h1.14l.694 10.648A1.734 1.734 0 004.8 16.968h7.578c.925 0 1.68-.734 1.724-1.662l.688-10.642h1.14a.636.636 0 00.645-.646c0-.37-.281-.652-.65-.652zM7.509 13.08c0 .365-.281.646-.645.646a.636.636 0 01-.644-.646V7.232c0-.365.28-.646.644-.646s.645.281.645.646v5.848zm3.442 0c0 .365-.281.646-.645.646a.636.636 0 01-.644-.646V7.232c0-.365.281-.646.644-.646.364 0 .645.281.645.646v5.848zm0-9.714H6.215v-.602a.51.51 0 01.473-.475h3.79a.51.51 0 01.473.475v.602z"
        fill="#E86F56"
      />
    </Svg>
  );
}

export default TrashSolidIcon;