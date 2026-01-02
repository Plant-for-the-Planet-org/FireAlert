import Image from 'next/image';
import type {FC} from 'react';
import {useState, useEffect} from 'react';
import type {AlertThemeConfig} from './alertTheme.utils';
import classes from './AlertId.module.css';

export interface CollapsibleAlertCardProps {
  detectedBy: string | null;
  timeAgo: string;
  formattedDateString: string;
  confidence: string;
  latitude: string;
  longitude: string;
  collapsed?: boolean;
  onCopyCoordinates?: (latitude: string, longitude: string) => void;
  isCoordinatesCopied?: boolean;
  className?: string;
  isControlled?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  themeConfig?: AlertThemeConfig;
}

export const CollapsibleAlertCard: FC<CollapsibleAlertCardProps> = ({
  detectedBy,
  timeAgo,
  formattedDateString,
  confidence,
  latitude,
  longitude,
  collapsed = true,
  onCopyCoordinates,
  isCoordinatesCopied = false,
  className,
  isControlled = false,
  isExpanded,
  onToggle,
  onClick,
  themeConfig,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);

  useEffect(() => {
    if (!isControlled) {
      setInternalCollapsed(collapsed);
    }
  }, [collapsed, isControlled]);

  const isCollapsed = isControlled
    ? isExpanded === undefined
      ? collapsed
      : !isExpanded
    : internalCollapsed;

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleCopyClick = () => {
    if (onCopyCoordinates) {
      onCopyCoordinates(latitude, longitude);
    }
  };

  const googleMapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  // Use theme config if provided, otherwise use default
  // Cards always use satellite icon (alertIcon.svg), not fire icons
  const iconPath = '/alertPage/alertIcon.svg';
  const backgroundColor = themeConfig?.backgroundColor;
  const textColor = themeConfig?.textColor;

  return (
    <div className={`${classes.alertInfoSubContainer} ${className ?? ''}`}>
      <div className={classes.alertInfoFirstDiv}>
        <div
          className={classes.detectionInfo}
          onClick={onClick ? handleCardClick : undefined}
          style={{
            ...(onClick ? {cursor: 'pointer'} : {}),
            ...(backgroundColor ? {backgroundColor} : {}),
          }}>
          <div className={classes.alertIconWrapper}>
            <Image
              src={iconPath}
              width={45}
              height={45}
              alt="Alert Icon"
              className={classes.alertIcon}
            />
          </div>
          <div className={classes.detectionInfoWrapper}>
            <div 
              className={classes.detectedByText}
              style={textColor ? {color: textColor} : undefined}>
              DETECTED BY {detectedBy}
            </div>
            <div className={classes.detectedInfoInner}>
              <div className={classes.detectedDateWrapper}>
                <div 
                  className={classes.detectedDays}
                  style={textColor ? {color: textColor} : undefined}>
                  {timeAgo}
                </div>
                <div className={classes.detectedDateText}>
                  ({formattedDateString})
                </div>
              </div>
              <p className={classes.alertConfidence}>
                <span 
                  className={classes.alertConfidenceValue}
                  style={textColor ? {color: textColor} : undefined}>
                  {confidence}
                </span>
                <span className={classes.alertConfidenceText}>
                  {' '}
                  alert confidence
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={classes.collapseButton}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            type="button"
            aria-expanded={!isCollapsed}>
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className={classes.alertInfoSecondDiv}>
          <div className={classes.alertLocationParent}>
            <div className={classes.eightyPercentSectionLocation}>
              <div className={classes.pinIconWrapper}>
                <Image
                  src="/alertPage/locationPin.svg"
                  width={20}
                  height={20}
                  alt="Location Pin Icon"
                  className={classes.pinIcon}
                />
              </div>
              <div className={classes.locationInfo}>
                <div className={classes.locationText}>LOCATION</div>
                <div className={classes.alertCoordinates}>
                  {latitude}, {longitude}
                </div>
              </div>
            </div>
            <div className={classes.copyIconParent} onClick={handleCopyClick}>
              <Image
                src="/alertPage/copy.svg"
                width={31}
                height={31}
                alt="Copy Icon"
                className={`${classes.copyIcon} ${
                  isCoordinatesCopied ? classes.copyIconClicked : ''
                }`}
              />
            </div>
          </div>
          <div className={classes.actionParent}>
            <div className={classes.eightyPercentSectionAction}>
              <div className={classes.radarIconWrapper}>
                <Image
                  src="/alertPage/radarIcon.svg"
                  width={20}
                  height={20}
                  alt="Map Focus"
                  className={classes.radarIcon}
                />
              </div>
              <p className={classes.actionLabel}>
                <span>Search for the fire within a </span>
                <span className={classes.actionText2}>1km</span>
                <span> radius around the location.</span>
              </p>
            </div>
          </div>
          <br/>
          <div className={classes.buttonDiv}>
            <button
              className={classes.googleMapsButton}
              onClick={() => window.open(googleMapUrl, '_blank')}
              type="button">
              <div className={classes.openInGoogleMapsText}>
                Open in Google Maps
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
