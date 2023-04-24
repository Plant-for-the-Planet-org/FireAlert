import * as React from "react"
import Svg, { G, Path, Defs, ClipPath } from "react-native-svg"

function ListIcon(props) {
  return (
    <Svg
      width={18}
      height={24}
      viewBox="0 0 18 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <G clipPath="url(#clip0_435_215)">
        <Path d="M15.75 3h-2.526c-.62-1.744-2.27-3-4.224-3-1.955 0-3.605 1.256-4.223 3H2.25A2.25 2.25 0 000 5.25v16.5A2.25 2.25 0 002.25 24h13.5A2.25 2.25 0 0018 21.75V5.25A2.25 2.25 0 0015.75 3zM9 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4.5 18.375a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25zm.75-4.875a.75.75 0 01-.53-.22l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.47-2.47a.75.75 0 111.06 1.061l-3 3a.756.756 0 01-.53.219zm9 4.5h-6a.752.752 0 01-.75-.75c0-.413.338-.75.75-.75h6c.412 0 .75.337.75.75s-.338.75-.75.75zm0-4.5h-4.5a.752.752 0 01-.75-.75c0-.412.338-.75.75-.75h4.5c.412 0 .75.338.75.75s-.338.75-.75.75z" />
      </G>
      <Defs>
        <ClipPath id="clip0_435_215">
          <Path d="M0 0H18V24H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  )
}

export default ListIcon
