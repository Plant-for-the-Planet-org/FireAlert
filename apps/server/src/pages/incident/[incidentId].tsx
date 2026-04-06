// To access this page visit: ${URL}/incident/${incidentId}
import type {
  AlertTheme,
  IncidentFirePoint,
  RelatedIncidentBoundary,
} from '../../Components/FireIncident/MapComponent';

import {createServerSideHelpers} from '@trpc/react-query/server';
import type {
  GetStaticPaths,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next';
import dynamic from 'next/dynamic';
import ErrorPage from 'next/error';
import Head from 'next/head';
import {useEffect, useState} from 'react';
import superjson from 'superjson';
import ErrorDisplay from '../../Components/Assets/ErrorDisplay';
import {ActionInfo} from '../../Components/FireIncident/ActionInfo';
import {DetectionInfo} from '../../Components/FireIncident/DetectionInfo';
import {GoogleMapsButton} from '../../Components/FireIncident/GoogleMapsButton';
import {IncidentSummary} from '../../Components/FireIncident/IncidentSummary';
import {LocationInfo} from '../../Components/FireIncident/LocationInfo';
import {RelatedIncidentsList} from '../../Components/FireIncident/RelatedIncidentsList';
import {INCIDENT_PAGE_FEATURE_FLAGS} from './featureFlags';
import {appRouter} from '../../server/api/root';
import {api} from '../../utils/api';

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

interface IncidentAlertSummary {
  id: string;
  eventDate: Date;
  latitude: number;
  longitude: number;
}

const IncidentPage = (
  props: InferGetStaticPropsType<typeof getStaticProps>,
) => {
  const {incidentId} = props;
  const incidentQuery = api.siteIncident.getIncidentPublic.useQuery(
    {incidentId},
    {retry: 0},
  );
  const relatedIncidentsQuery = api.siteIncident.getRelatedIncidentsPublic.useQuery(
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
  const relatedIncidents =
    relatedIncidentsQuery.status === 'success'
      ? relatedIncidentsQuery.data.data.relatedIncidents
      : [];
  const allIncidentsById = new Map<string, typeof incident>();
  allIncidentsById.set(incident.id, incident);
  relatedIncidents.forEach(relatedIncident => {
    if (!allIncidentsById.has(relatedIncident.id)) {
      allIncidentsById.set(relatedIncident.id, relatedIncident);
    }
  });
  const allIncidents = Array.from(allIncidentsById.values());

  const combinedAlertsById = new Map<string, IncidentAlertSummary>();
  allIncidents.forEach(currentIncident => {
    currentIncident.siteAlerts.forEach(alert => {
      if (!combinedAlertsById.has(alert.id)) {
        combinedAlertsById.set(alert.id, {
          id: alert.id,
          eventDate: new Date(alert.eventDate),
          latitude: Number(alert.latitude),
          longitude: Number(alert.longitude),
        });
      }
    });
  });
  const combinedAlerts = Array.from(combinedAlertsById.values());

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

  const relatedIncidentBoundaries: RelatedIncidentBoundary[] = relatedIncidents
    .map(relatedIncident => ({
      incidentId: relatedIncident.id,
      isActive: relatedIncident.isActive,
      fires: relatedIncident.siteAlerts.map(
        alert =>
          ({
            latitude: Number(alert.latitude),
            longitude: Number(alert.longitude),
          }) as IncidentFirePoint,
      ),
    }))
    .filter(relatedIncident => relatedIncident.fires.length > 0);
  const combinedIncidentFires: IncidentFirePoint[] = combinedAlerts.map(
    alert => ({
      latitude: alert.latitude,
      longitude: alert.longitude,
    }),
  );
  const shouldShowCombinedSummary =
    INCIDENT_PAGE_FEATURE_FLAGS.SHOW_COMBINED_INCIDENT_SUMMARY &&
    relatedIncidents.length > 0;
  const shouldShowRelatedIncidentsOnMap =
    INCIDENT_PAGE_FEATURE_FLAGS.SHOW_RELATED_INCIDENTS_ON_MAP &&
    relatedIncidentBoundaries.length > 0;
  const shouldShowCombinedBoundary =
    INCIDENT_PAGE_FEATURE_FLAGS.SHOW_COMBINED_INCIDENT_BOUNDARY &&
    relatedIncidents.length > 0 &&
    combinedIncidentFires.length > 0;
  const relatedIncidentListRows = relatedIncidents.map(relatedIncident => ({
    id: relatedIncident.id,
    isActive: relatedIncident.isActive,
    startedAt: new Date(relatedIncident.startedAt),
    latestAt: new Date(
      relatedIncident.latestSiteAlert?.eventDate || relatedIncident.startedAt,
    ),
    fireCount: relatedIncident.siteAlerts.length,
  }));

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
                  relatedIncidentBoundaries={relatedIncidentBoundaries}
                  showRelatedIncidentBoundaries={shouldShowRelatedIncidentsOnMap}
                  combinedIncidentFires={combinedIncidentFires}
                  showCombinedIncidentBoundary={shouldShowCombinedBoundary}
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
                    combinedAlerts={combinedAlerts}
                    showCombinedSummary={shouldShowCombinedSummary}
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

                {INCIDENT_PAGE_FEATURE_FLAGS.SHOW_RELATED_INCIDENTS_LIST &&
                  relatedIncidentListRows.length > 0 && (
                    <RelatedIncidentsList incidents={relatedIncidentListRows} />
                  )}
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
      req: {} as never,
      prisma: {} as never,
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

  try {
    await helpers.siteIncident.getRelatedIncidentsPublic.prefetch({incidentId});
  } catch (e) {
    // This is intentionally non-blocking. The page still renders with current incident data.
    console.error('Error prefetching related incidents', e);
  }

  return {
    props: {
      trpcState: helpers.dehydrate(),
      incidentId,
    },
    revalidate: 1,
  };
}

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export default IncidentPage;
