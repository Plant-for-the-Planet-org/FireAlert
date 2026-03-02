// To access this page visit: ${URL}/incident/${incidentId}

import {createServerSideHelpers} from '@trpc/react-query/server';
import {api} from '../../utils/api';
import {
  GetStaticPropsContext,
  GetStaticPaths,
  InferGetStaticPropsType,
} from 'next';
import {appRouter} from '../../server/api/root';
import superjson from 'superjson';
import ErrorDisplay from '../../Components/Assets/ErrorDisplay';
import ErrorPage from 'next/error';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {DetectionInfo} from '../../Components/FireIncident/DetectionInfo';
import {LocationInfo} from '../../Components/FireIncident/LocationInfo';
import {ActionInfo} from '../../Components/FireIncident/ActionInfo';
import {GoogleMapsButton} from '../../Components/FireIncident/GoogleMapsButton';
import {IncidentSummary} from '../../Components/FireIncident/IncidentSummary';
import {AlertTheme} from '../../Components/FireIncident/MapComponent';
import {useState, useEffect} from 'react';

const MapComponent = dynamic(
  () => import('../../Components/FireIncident/MapComponent'),
  {ssr: false},
);

function getTimePassedSince(date: Date): {
  days: number;
  hours: number;
  minutes: number;
} {
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const millisecondsPerHour = 60 * 60 * 1000;
  const millisecondsPerMinute = 60 * 1000;

  // Calculate the difference in days, hours, and minutes
  const timeDiff = now.getTime() - date.getTime();
  const daysPassed = Math.floor(timeDiff / millisecondsPerDay);
  const hoursPassed = Math.floor(timeDiff / millisecondsPerHour);
  const minutesPassed = Math.floor(timeDiff / millisecondsPerMinute);

  return {days: daysPassed, hours: hoursPassed, minutes: minutesPassed};
}

function getDaysSince(date: Date): number {
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const timeDiff = now.getTime() - date.getTime();
  return Math.floor(timeDiff / millisecondsPerDay);
}

function getAlertTheme(days: number): AlertTheme {
  if (days === 0) return 'orange';
  if (days > 0 && days <= 3) return 'brown';
  return 'gray';
}

function formatDateString(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('default', {month: 'short'});
  const year = date.getFullYear();
  const hour = date.getHours();
  const minute = date.getMinutes();

  const formattedDate = `${day} ${month} ${year} at ${hour}:${minute
    .toString()
    .padStart(2, '0')}`;
  return formattedDate;
}

function getIdentityGroup(identityKey: string): string | null {
  const identityMap = new Map<string, string>([
    ['MODIS_NRT', 'MODIS'],
    ['VIIRS_NOAA20_NRT', 'VIIRS'],
    ['VIIRS_SNPP_NRT', 'VIIRS'],
    ['LANDSAT_NRT', 'LANDSAT'],
    ['GEOSTATIONARY', 'GEOSTATIONARY'],
    ['MODIS_SP', 'MODIS'],
    ['VIIRS_SNPP_SP', 'VIIRS'],
  ]);
  return identityMap.get(identityKey) ?? null;
}

const IncidentPage = (
  props: InferGetStaticPropsType<typeof getStaticProps>,
) => {
  const {incidentId} = props;
  const incidentQuery = api.siteIncident.getIncidentPublic.useQuery(
    {incidentId},
    {retry: 0},
  );

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (incidentQuery.status === 'success' && !selectedAlertId) {
      const initialAlert =
        incidentQuery.data.data.latestSiteAlert ||
        incidentQuery.data.data.startSiteAlert;
      if (initialAlert) {
        setSelectedAlertId(initialAlert.id);
      }
    }
  }, [incidentQuery.status, incidentQuery.data, selectedAlertId]);

  if (incidentQuery.isError) {
    const error = incidentQuery.error;
    const message = error?.shape?.message || 'Unknown error';
    const httpStatus = error?.data?.httpStatus || 500;
    if (httpStatus === 503) {
      return (
        <ErrorDisplay
          message="Server under Maintenance. Please check back in a few minutes."
          httpStatus={httpStatus}
        />
      );
    }
    if (httpStatus === 404) {
      return <ErrorPage statusCode={httpStatus} />;
    }
    return <ErrorDisplay message={message} httpStatus={httpStatus} />;
  }

  if (incidentQuery.status !== 'success') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  const {data} = incidentQuery;
  const incident = data.data; // siteIncidentRouter returns { status: 'success', data: incident }

  // Use selectedAlertId if it matches an alert in siteAlerts, otherwise fallback
  const displayAlert =
    incident.siteAlerts.find(a => a.id === selectedAlertId) ||
    incident.latestSiteAlert ||
    incident.startSiteAlert;

  if (!displayAlert) {
    return (
      <ErrorDisplay
        message="No alert data found for this incident"
        httpStatus={404}
      />
    );
  }

  const timePassed = getTimePassedSince(displayAlert.eventDate);
  let timeAgo: string;

  if (timePassed.days > 0) {
    timeAgo = `${timePassed.days} days ago`;
  } else if (timePassed.hours > 0) {
    timeAgo = `${timePassed.hours} hours ago`;
  } else {
    timeAgo = `${timePassed.minutes} minutes ago`;
  }

  const formattedDateString = formatDateString(displayAlert.eventDate);

  const confidence = displayAlert.confidence as string;
  const detectedBy =
    getIdentityGroup(displayAlert.detectedBy) || displayAlert.detectedBy;
  const latitude = `${displayAlert.latitude}`;
  const longitude = `${displayAlert.longitude}`;
  const polygon = incident.site.geometry;

  const markers = incident.siteAlerts.map(alert => {
    const days = getDaysSince(alert.eventDate);
    return {
      latitude: Number(alert.latitude),
      longitude: Number(alert.longitude),
      id: alert.id,
      theme: getAlertTheme(days),
    };
  });

  const googleMapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  const startAlert = incident.startSiteAlert;
  const latestAlert = incident.latestSiteAlert || incident.startSiteAlert;

  return (
    <div id="incident-page">
      <Head>
        <title>Incident Details</title>
      </Head>

      <div className="w-screen min-h-screen bg-gray-page-bg flex flex-col justify-center items-center overflow-auto py-10">
        <div className="w-11/12 lg:w-4/5 max-w-5xl">
          {/* Main Interactive Card */}
          <div className="relative w-full bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col lg:flex-row items-stretch lg:h-[433px]">
            {/* Map View - Left/Top */}
            <div className="relative w-full h-80 md:h-[400px] lg:h-auto lg:w-1/2">
              <div id="map" className="w-full h-full">
                <MapComponent
                  polygon={
                    polygon as React.ComponentProps<
                      typeof MapComponent
                    >['polygon']
                  }
                  markers={markers}
                  selectedMarkerId={displayAlert.id}
                  onMarkerClick={id => setSelectedAlertId(id)}
                  incidentCircleColor={incident?.isActive ? 'orange' : 'gray'}
                />
              </div>
            </div>

            {/* Alert Info - Right/Bottom */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4 justify-between p-4 lg:p-8 bg-white overflow-y-scroll">
              <div className="flex flex-col gap-4">
                {/* Incident Summary Card */}
                {startAlert && (
                  <IncidentSummary
                    isActive={incident.isActive}
                    startAlert={{
                      id: startAlert.id,
                      eventDate: new Date(startAlert.eventDate),
                      latitude: Number(startAlert.latitude),
                      longitude: Number(startAlert.longitude),
                    }}
                    latestAlert={{
                      id: latestAlert.id,
                      eventDate: new Date(latestAlert.eventDate),
                      latitude: Number(latestAlert.latitude),
                      longitude: Number(latestAlert.longitude),
                    }}
                    allAlerts={incident.siteAlerts.map(a => ({
                      id: a.id,
                      eventDate: new Date(a.eventDate),
                      latitude: Number(a.latitude),
                      longitude: Number(a.longitude),
                    }))}
                  />
                )}
                <DetectionInfo
                  detectedBy={detectedBy}
                  timeAgo={timeAgo}
                  formattedDateString={formattedDateString}
                  confidence={confidence}
                />

                <div className="flex flex-col sm:flex-row md:flex-col space-y-4">
                  <LocationInfo latitude={latitude} longitude={longitude} />
                  <ActionInfo />
                </div>
              </div>

              <GoogleMapsButton googleMapUrl={googleMapUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export async function getStaticProps(
  context: GetStaticPropsContext<{incidentId: string}>,
) {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {
      req: {} as any,
      prisma: {} as any,
      user: null,
      isAdmin: false,
      isImpersonatedUser: false,
    },
    transformer: superjson,
  });
  const incidentId = context.params?.incidentId as string;

  try {
    await helpers.siteIncident.getIncidentPublic.prefetch({incidentId});
  } catch (e) {
    console.error('Error prefetching incident', e);
  }

  return {
    props: {
      trpcState: helpers.dehydrate(),
      incidentId,
    },
    revalidate: 1,
  };
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export default IncidentPage;
