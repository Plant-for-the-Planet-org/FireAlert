import React from 'react';

import {OrangeFireIcon, BlueFireIcon, PurpleFireIcon} from '../assets/svgs';

export function getFireIcon(days: number) {
  switch (true) {
    case days === 0:
      return <OrangeFireIcon />;
    case days > 0 && days <= 3:
      return <PurpleFireIcon />;
    case days > 3:
      return <BlueFireIcon />;

    default:
      return null;
  }
}
