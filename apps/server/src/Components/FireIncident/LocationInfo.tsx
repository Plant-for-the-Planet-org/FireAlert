import React, {useState} from 'react';
import Image from 'next/image';
import locationPinIcon from '../../../public/alertPage/locationPin.svg';
import copyIcon from '../../../public/alertPage/copy.svg';
import {BaseCard} from './BaseCard';
import {twJoin} from 'tailwind-merge';

interface LocationInfoProps {
  latitude: string;
  longitude: string;
}

export function LocationInfo({latitude, longitude}: LocationInfoProps) {
  const [isCoordinatesCopied, setIsCoordinatesCopied] = useState(false);

  const handleCopyCoordinates = () => {
    void navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setIsCoordinatesCopied(true);
    setTimeout(() => {
      setIsCoordinatesCopied(false);
    }, 2000);
  };

  return (
    <BaseCard
      className="gap-2 flex items-center outline outline-gray-card-border"
      icon={
        <Image
          src={locationPinIcon as string}
          alt="Location Pin"
          className="p-3 w-12 h-12"
        />
      }
      iconClassName="self-start"
      contentClassName="flex-row">
      <div className="h-full flex-grow">
        <p className="text-[10px] font-sans font-semibold text-planet-dark-gray/50 uppercase my-0">
          LOCATION
        </p>
        <p className="text-base text-planet-dark-gray font-sans my-0">
          {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
        </p>
      </div>
      <div className="flex justify-center items-center">
        <button
          className="border-none bg-transparent cursor-pointer p-0"
          onClick={handleCopyCoordinates}>
          <Image
            src={copyIcon as string}
            alt="Copy Coordinates"
            className={twJoin(
              'w-8 h-8 transition-opacity',
              isCoordinatesCopied ? 'opacity-50' : 'opacity-100',
            )}
          />
        </button>
      </div>
    </BaseCard>
  );
}
