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
import {Prisma} from '@prisma/client';
import {DetectionInfo} from '../../Components/FireIncident/DetectionInfo';
import {LocationInfo} from '../../Components/FireIncident/LocationInfo';
import {ActionInfo} from '../../Components/FireIncident/ActionInfo';
import {GoogleMapsButton} from '../../Components/FireIncident/GoogleMapsButton';

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

  if (incidentQuery.isError) {
    const error = incidentQuery.error;
    let message = error?.shape?.message || 'Unknown error';
    let httpStatus = error?.data?.httpStatus || 500;
    if (httpStatus === 503) {
      message = 'Server under Maintenance. Please check back in a few minutes.';
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

  // Use latestSiteAlert for display data if available, or startSiteAlert
  const displayAlert = incident.latestSiteAlert || incident.startSiteAlert;

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

  const markers = [
    {
      latitude: parseFloat(`${displayAlert.latitude}`), // ensure string is parsed
      longitude: parseFloat(`${displayAlert.longitude}`),
      id: displayAlert.id,
    },
  ];

  const googleMapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  return (
    <div
      id="incident-page"
      className="w-screen min-h-screen bg-neutral-300 flex justify-center items-center overflow-visible relative">
      <Head>
        <title>Incident Details</title>
      </Head>

      {/* Card Container */}
      <div className="relative w-11/12 lg:w-4/5 max-w-5xl bg-white rounded-2xl overflow-hidden flex flex-col lg:flex-row items-center my-5 min-h-[604px] md:min-h-[650px] lg:h-[433px] lg:min-h-0">
        {/* Map View - Left/Top */}
        <div className="relative w-full h-1/2 md:h-1/2 lg:w-1/2 lg:h-full items-center justify-center">
          <div id="map" className="w-full h-full items-center">
            <MapComponent
              polygon={polygon as Prisma.JsonValue}
              markers={markers}
              selectedMarkerId={displayAlert.id}
            />
          </div>
        </div>

        {/* Alert Info - Right/Bottom */}
        <div className="w-full h-1/2 md:h-1/2 lg:w-1/2 lg:h-full flex flex-col justify-center items-center px-1 sm:px-4 py-1.5 lg:py-0">
          {/* Sub Container */}
          <div className="h-full w-full flex flex-col justify-between items-center p-1.5 sm:p-2.5 lg:p-4.5 mt-2.5 lg:mt-5 mb-2.5 lg:mb-0 lg:h-3/4">
            <DetectionInfo
              detectedBy={detectedBy}
              timeAgo={timeAgo}
              formattedDateString={formattedDateString}
              confidence={confidence}
            />

            <div className="w-full flex flex-col sm:flex-row items-center mt-2.5 lg:mt-0">
              <LocationInfo latitude={latitude} longitude={longitude} />
              <ActionInfo />
            </div>
          </div>

          <GoogleMapsButton googleMapUrl={googleMapUrl} />
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
    ctx: {},
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
