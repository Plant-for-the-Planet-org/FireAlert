// To access this page visit: ${URL}/alert/${alertId}

import { api } from '../../utils/api';
import { useEffect } from 'react';
import { type GetServerSidePropsContext } from 'next';
import { AlertId } from '../../Components/AlertId/AlertId';

function getDaysPassedSince(date: Date): number {
    const now = new Date();
    const millisecondsPerDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day

    // Calculate the difference in days
    const timeDiff = now.getTime() - date.getTime();
    const daysPassed = Math.floor(timeDiff / millisecondsPerDay);

    return daysPassed;
}

function formatDateString(dateString: string): string {
    const date = new Date(dateString);

    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hour = date.getHours();
    const minute = date.getMinutes();

    const formattedDate = `${day} ${month} ${year} at ${hour}:${minute.toString().padStart(2, '0')}`;
    return formattedDate;
}


function getIdentityGroup(identityKey: string): string | null {
    const identityMap = new Map<string, string>([
        ["MODIS_NRT", "MODIS"],
        ["VIIRS_NOAA20_NRT", "VIIRS"],
        ["VIIRS_SNPP_NRT", "VIIRS"],
        ["LANDSAT_NRT", "LANDSAT"],
        ["GEOSTATIONARY", "GEOSTATIONARY"],
        ["MODIS_SP", "MODIS"],
        ["VIIRS_SNPP_SP", "VIIRS"],
    ]);
    // Return the corresponding identity group based on the provided identity key
    return identityMap.get(identityKey) ?? null;
}


const Alert = ({ alertId, errorMessage }: { alertId: string, errorMessage: string }) => {
    const { data, isLoading, isError } = api.alert.getAlert.useQuery({ id: alertId });

    useEffect(() => {
        if (alertId) {
            console.log(`alertId: ${alertId}`);
        }
    }, [alertId]);

    if (errorMessage) {
        return <div>Error: {errorMessage}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error: Failed to load alert data</div>;
    }

    const alert = data.data
    const daysAgo = `${getDaysPassedSince(alert.eventDate)}`;
    const formattedDateString = formatDateString(alert.localEventDate)
    const confidence = alert.confidence as string;
    const detectedBy = getIdentityGroup(alert.detectedBy)
    const latitude = `${alert.latitude}`
    const longitude = `${alert.longitude}`

    const alertData = {
        daysAgo,
        formattedDateString,
        confidence,
        detectedBy,
        latitude,
        longitude
    }

    return (
        <div>
            <AlertId alertData={alertData} />
        </div>
    );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
    if (!context.params) {
        return {
            props: {
                errorMessage: 'Context params is not present',
            },
        };
    }
    const alertId = context.params.alertId;

    if (!alertId) {
        return {
            props: {
                errorMessage: 'Invalid alertId',
            },
        };
    }

    return {
        props: {
            alertId: alertId,
        },
    };
}

export default Alert;
