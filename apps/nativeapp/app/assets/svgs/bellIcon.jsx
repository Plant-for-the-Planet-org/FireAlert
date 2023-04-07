import * as React from "react"
import Svg, { Path } from "react-native-svg"

function BellIcon(props) {
  return (
    <Svg
      width={18}
      height={24}
      viewBox="0 0 18 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M8.998 2.939c-3.29 0-5.964 2.74-5.964 6.111v2.944c0 .621-.259 1.568-.567 2.098l-1.143 1.946c-.706 1.201-.219 2.536 1.074 2.984a20.322 20.322 0 0013.19 0c1.203-.407 1.73-1.864 1.074-2.984l-1.143-1.946c-.298-.53-.557-1.477-.557-2.098V9.05c0-3.361-2.684-6.111-5.964-6.111z"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
      />
      <Path
        d="M10.837 3.234a6.559 6.559 0 00-3.678 0 1.975 1.975 0 011.839-1.283c.835 0 1.55.53 1.839 1.283z"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.98 19.389c0 1.68-1.342 3.056-2.982 3.056-.815 0-1.57-.347-2.107-.897a3.104 3.104 0 01-.875-2.16"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeMiterlimit={10}
      />
    </Svg>
  )
}

export default BellIcon
