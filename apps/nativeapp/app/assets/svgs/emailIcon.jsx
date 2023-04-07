import * as React from "react"
import Svg, { Path } from "react-native-svg"

function EmailIcon(props) {
  return (
    <Svg
      width={20}
      height={17}
      viewBox="0 0 20 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M2.75 1.513h14c.962 0 1.75.79 1.75 1.757v10.54c0 .965-.788 1.756-1.75 1.756h-14c-.962 0-1.75-.79-1.75-1.757V3.27c0-.965.788-1.756 1.75-1.756z"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 3.27L9.75 9.418 1 3.27"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default EmailIcon
