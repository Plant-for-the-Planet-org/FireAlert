import { memo } from 'react';
import type { FC } from 'react';
import dynamic from 'next/dynamic';
import classes from './AlertId.module.css';
import { Copy } from './AlertIdSvgComponents/Copy';
import { AlertIcon } from './AlertIdSvgComponents/AlertIcon';
import { LocationPinIcon } from './AlertIdSvgComponents/LocationPinIcon';
import { RadarIcon } from './AlertIdSvgComponents/RadarIcon';

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

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

export const AlertId: FC<Props> = memo(function AlertIdWeb({ alertData, className }: Props) {
    const googleMapUrl = `https://maps.google.com/?q=${alertData.latitude},${alertData.longitude}`;

    const handleCopyCoordinates = () => {
        navigator.clipboard.writeText(`${alertData.latitude}, ${alertData.longitude}`);
    };

    return (
        <div className={classes.root}>
            <div className={classes.AlertId}>
                <div className={classes.mapView}>
                    <div id="map" className={classes.mapIcon}>
                        <MapComponent alertData={alertData}/>
                    </div>
                </div>
                <div className={classes.alertInfo}>
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
                        <div className={classes.alertCoordinates}>
                            {alertData.latitude}, {alertData.longitude}
                        </div>
                        <div className={classes.locationText}>LOCATION</div>
                        <div className={classes.locationPinIcon}>
                            <LocationPinIcon className={classes.pinIcon} />
                        </div>
                        <div className={classes.ellipseIconParent}>
                            <Copy className={classes.ellipseIcon} />
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
        </div>
    );
});



