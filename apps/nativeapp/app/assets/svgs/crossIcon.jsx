import * as React from "react"
import Svg, { Path } from "react-native-svg"

function CrossIcon(props) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        clipRule="evenodd"
        d="M21 4.8L19.2 3 12 10.2 4.8 3 3 4.8l7.2 7.2L3 19.2 4.8 21l7.2-7.2 7.2 7.2 1.8-1.8-7.2-7.2L21 4.8z"
      />
    </Svg>
  )
}

export default CrossIcon
