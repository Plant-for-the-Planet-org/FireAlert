import React from 'react';
import Image from 'next/image';
import radarIcon from '../../../public/alertPage/radarIcon.svg';
import {BaseCard} from './BaseCard';

export function ActionInfo() {
  return (
    <BaseCard
      className="bg-white/10 gap-2 flex items-center outline outline-gray-card-border"
      icon={
        <Image
          src={radarIcon as string}
          alt="Radar Icon"
          className="p-3 w-12 h-12"
        />
      }
      iconClassName=""
      contentClassName="">
      <p className="text-base font-sans flex-grow my-0 text-planet-dark-gray relative w-auto lg:w-60 h-min flex-col">
        <span>Search for the fire within a </span>
        <span className="font-bold">1 km radius</span>
      </p>
    </BaseCard>
  );
}
