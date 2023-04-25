import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function BellIcon(props) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path fill="#fff" d="M0 0H20V20H0z" />
      <Path
        d="M15.737 12.43c-.423-.664-.69-1.407-.69-2.202V8.655c0-2.6-1.52-4.553-3.876-5.066V2.96c0-.53-.409-.96-.91-.96h-.518c-.502 0-.91.43-.91.96v.629c-2.338.53-3.874 2.482-3.874 5.066v1.573c0 .795-.266 1.557-.69 2.202-.175.264-.269.577-.269.909v.134c0 .893.69 1.62 1.537 1.62h8.927c.847 0 1.536-.727 1.536-1.62v-.134a1.632 1.632 0 00-.263-.91zM10.01 18c1.197 0 2.147-1.024 2.168-2.288H7.841C7.863 16.976 8.812 18 10.01 18z"
        fill="#4F4F4F"
      />
    </Svg>
  );
}

export default BellIcon;
