import React from 'react';
import Image from 'next/image';
import radarIcon from '../../../public/alertPage/radarIcon.svg';

export function ActionInfo() {
  return (
    <div className="w-full flex flex-row p-1.5 lg:p-3.5 outline outline-1 outline-gray-medium rounded-xl bg-white/10 overflow-hidden justify-between items-center mt-2.5 sm:mt-2.5 lg:mt-0">
      <div className="flex flex-row justify-between w-full sm:w-4/5 items-center">
        <div className="hidden sm:block object-contain">
          <Image src={radarIcon} alt="Map Focus" className="w-5 h-5" />
        </div>
        <p className="text-base font-sans flex-grow my-0 text-planet-dark-gray relative w-auto lg:w-60 h-min flex-col ml-2.5">
          <span>Search for the fire within a </span>
          <span className="font-bold">1km</span>
          <span> radius around the location.</span>
        </p>
      </div>
    </div>
  );
}
