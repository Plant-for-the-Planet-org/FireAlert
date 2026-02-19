import React from 'react';
import {twJoin, twMerge} from 'tailwind-merge';

interface BaseCardProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  contentClassName?: string;
}

export function BaseCard({
  icon,
  children,
  className = '',
  iconClassName = '',
  contentClassName = '',
}: BaseCardProps) {
  return (
    <div
      className={twMerge(
        'w-full p-4 rounded-xl flex items-center overflow-hidden',
        className,
      )}>
      {icon && (
        <div className={twMerge('flex-shrink-0', iconClassName)}>{icon}</div>
      )}
      <div className={twMerge('w-full flex flex-col', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
