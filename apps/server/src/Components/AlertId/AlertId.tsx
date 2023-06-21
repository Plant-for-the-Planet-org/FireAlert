import { memo } from 'react';
import type { FC } from 'react';

import resets from '../_resets.module.css';
import classes from './AlertId.module.css';
import { EllipseIcon } from './SvgImages/EllipseIcon';
import { CopyIcon } from './SvgImages/CopyIcon';
import { AlertIcon } from './SvgImages/AlertIcon';
import { LocationPinIcon } from './SvgImages/LocationPinIcon';
import { MapViewMobile } from './SvgImages/MapViewMobile';
import { RadarIcon } from './SvgImages/RadarIcon';


interface AlertData {
    daysAgo: string;
    formattedDateString: string;
    confidence: string;
    detectedBy: string | null;
    latitude: string;
    longitude: string;
}

interface Props {
    className?: string;
    alertData: AlertData;
}



export const AlertId: FC<Props> = memo(function AlertIdWeb({ alertData, className }: Props) {
    const googleMapUrl = `https://www.google.com/maps/place/${encodeURIComponent(
        `${alertData.latitude},${alertData.longitude}`
    )}/@${alertData.latitude},${alertData.longitude},17z/data=!3m1!4b1!4m4!3m3!8m2!3d${alertData.latitude}!4d${alertData.longitude}?entry=ttu`;

    const handleCopyCoordinates = () => {
        navigator.clipboard.writeText(`${alertData.latitude}, ${alertData.longitude}`);
    };

    return (
        <div className={`${resets.componentsResets} ${classes.root}`}>
            <div className={classes.AlertId}>
                <div className={classes.mapView}>
                    <MapViewMobile className={classes.mapIcon} />
                </div>
                <div className={classes.detectionInfo}>
                    <div className={classes.detectionInfoInner}>
                        <div className={classes.detectedByText}>DETECTED BY {alertData.detectedBy}</div>
                        <div className={classes.detectedDate}>
                            <p className={classes.detectedDateWrapper}>
                                <span className={classes.detectedDays}>{alertData.daysAgo}d ago</span>
                                <span className={classes.detectedDateText}> ({alertData.formattedDateString})</span>
                            </p>
                        </div>
                        <div className={classes.alertConfidence}>
                            <p className={classes.alertConfidenceInner}>
                                <span className={classes.alertConfidenceValue}>{alertData.confidence}</span>
                                <span className={classes.alertConfidenceText}> confidence</span>
                            </p>
                        </div>
                        <div className={classes.alertIconWrapper}>
                            <AlertIcon className={classes.alertIcon} />
                        </div>
                    </div>
                </div>
                <div className={classes.alertLocationParent}>
                    <div className={classes.alertCoordinates}>{alertData.latitude}, {alertData.longitude}</div>
                    <div className={classes.locationText}>LOCATION</div>
                    <div className={classes.locationPinIcon}>
                        <LocationPinIcon className={classes.pinIcon} />
                    </div>
                    <div className={classes.ellipseIconParent}>
                        <EllipseIcon className={classes.ellipseIcon} />
                    </div>
                    <div className={classes.copyIconGrandParent} onClick={handleCopyCoordinates}>
                        <div className={classes.copyIconParent}>
                            <CopyIcon className={classes.copyIcon} />
                        </div>
                    </div>
                </div>
                <div className={classes.actionParent}>
                    <div className={classes.radarIconParent}>
                        <RadarIcon className={classes.radarIcon} />
                    </div>
                    <div className={classes.actionInner}>
                        <p className={classes.actionLabel}>
                            <span className={classes.actionText1}>Search for the fire within a </span>
                            <span className={classes.actionText2}>1km</span>
                            <span className={classes.actionText3}> radius around the location.</span>
                        </p>
                    </div>
                </div>
                <button className={classes.googleMapsButton} onClick={() => window.open(googleMapUrl, '_blank')}>
                    <div className={classes.openInGoogleMapsText}>Open in Google Maps</div>
                </button>
            </div>
        </div>
    );
});


