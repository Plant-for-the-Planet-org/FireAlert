import { memo } from 'react';
import type { FC } from 'react';
import dynamic from 'next/dynamic';
import classes from './AlertId.module.css';
import alertIcon from '../../../public/alertPage/alertIcon.png'
import copyIcon from '../../../public/alertPage/copy.png'
import locationPinIcon from '../../../public/alertPage/locationPin.png'
import radarIcon from '../../../public/alertPage/radarIcon.png'
import Image from 'next/image';

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
                        <MapComponent alertData={alertData} />
                    </div>
                </div>
                <div className={classes.alertInfo}>
                    <div className={classes.alertInfoSubContainer}>
                        <div className={classes.detectionInfo}>
                            <div className={classes.alertIconWrapper}>
                                <Image src={alertIcon} alt="Alert Icon" className={classes.alertIcon} />
                            </div>
                            <div className={classes.detectionInfoWrapper}>
                                <div className={classes.detectedByText}>DETECTED BY {alertData.detectedBy}</div>
                                <div className={classes.detectedInfoInner}>
                                    <p className={classes.detectedDateWrapper}>
                                        <span className={classes.detectedDays}>{alertData.daysAgo}d ago</span>
                                        <span className={classes.detectedDateText}> ({alertData.formattedDateString})</span>
                                    </p>
                                    <p className={classes.alertConfidence}>
                                        <span className={classes.alertConfidenceValue}>{alertData.confidence}</span>
                                        <span className={classes.alertConfidenceText}> alert confidence</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={classes.alertInfoSecondDiv}>
                            <div className={classes.alertLocationParent}>
                                <div className={classes.eightyPercentSectionLocation}>
                                    <div className={classes.pinIconWrapper}>
                                        <Image src={locationPinIcon} alt="Location Pin Icon" className={classes.pinIcon} />
                                    </div>
                                    <div className={classes.locationInfo}>
                                        <div className={classes.locationText}>LOCATION</div>
                                        <div className={classes.alertCoordinates}>
                                            {alertData.latitude}, {alertData.longitude}
                                        </div>
                                    </div>
                                </div>
                                <div className={classes.copyIconParent} onClick={handleCopyCoordinates}>
                                    <Image src={copyIcon} alt="Copy Icon" className={classes.copyIcon} />
                                </div>
                            </div>
                            <div className={classes.actionParent}>
                                <div className={classes.eightyPercentSectionAction}>
                                    <div className={classes.radarIconWrapper}>
                                        <Image src={radarIcon} alt="Map Focus" className={classes.radarIcon} />
                                    </div>
                                    <p className={classes.actionLabel}>
                                        <span>Search for the fire within a </span>
                                        <span className={classes.actionText2}>1km</span>
                                        <span> radius around the location.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={classes.buttonDiv}>
                        <button className={classes.googleMapsButton} onClick={() => window.open(googleMapUrl, '_blank')}>
                            <div className={classes.openInGoogleMapsText}>Open in Google Maps</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});



