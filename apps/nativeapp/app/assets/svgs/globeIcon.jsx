import * as React from "react"
import Svg, { Path } from "react-native-svg"

function GlobeIcon(props) {
  return (
    <Svg
      width={22}
      height={24}
      viewBox="0 0 22 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M11 22.235c5.523 0 10-4.588 10-10.247C21 6.328 16.523 1.74 11 1.74S1 6.328 1 11.988c0 5.659 4.477 10.247 10 10.247z"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 2.765h1A29.808 29.808 0 008 21.21H7m7-18.445a29.808 29.808 0 010 18.445"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 16.086v-1.024a27.775 27.775 0 0018 0v1.024M2 8.914a27.775 27.775 0 0118 0"
        stroke="#4F4F4F"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default GlobeIcon
