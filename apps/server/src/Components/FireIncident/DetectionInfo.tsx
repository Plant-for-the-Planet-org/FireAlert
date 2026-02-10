import React from 'react';
import Image from 'next/image';
import alertIcon from '../../../public/alertPage/alertIcon.svg';
import {BaseCard} from './BaseCard';

interface DetectionInfoProps {
  detectedBy: string;
  timeAgo: string;
  formattedDateString: string;
  confidence: string;
}

export function DetectionInfo({
  detectedBy,
  timeAgo,
  formattedDateString,
  confidence,
}: DetectionInfoProps) {
  return (
    <BaseCard
      className="outline outline-gray-card-border"
      icon={
        <Image
          src={alertIcon as string}
          alt="Alert Icon"
          className="w-12 h-12"
        />
      }
      iconClassName="self-start"
      contentClassName="ml-2.5">
      <div className="text-planet-dark-gray text-[10px] font-semibold font-sans pt-2 sm:pt-0 uppercase">
        DETECTED BY {detectedBy}
      </div>
      <div className="flex flex-col">
        <p className="text-sm sm:text-lg font-sans my-1.5">
          <span className="text-primary font-semibold">{timeAgo}</span>
          <span className="text-planet-dark-gray">
            {' '}
            ({formattedDateString})
          </span>
        </p>
        <p className="block mt-0 mb-2.5">
          <span className="text-planet-dark-gray text-sm font-bold font-sans">
            {confidence}
          </span>
          <span className="text-planet-dark-gray text-sm font-sans">
            {' '}
            alert confidence
          </span>
        </p>
      </div>
    </BaseCard>
  );
}
