// To access this page visit: ${URL}/alert/${alertId}

import {createServerSideHelpers} from '@trpc/react-query/server';
import type {
  GetStaticPaths,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next';
import Head from 'next/head';
import ErrorPage from 'next/error';
import superjson from 'superjson';
import {AlertId} from '../../Components/AlertId/AlertId';
import ErrorDisplay from '../../Components/Assets/ErrorDisplay';
import {appRouter} from '../../server/api/root';
import {api} from '../../utils/api';
import type {AlertData, AlertIdProps, GeoJSONGeometry} from '../../types/alert.types';
import type {GeoEventProviderClientId} from '../../Interfaces/GeoEventProvider';
import {prisma} from '../../server/db';
import type {NextApiRequest} from 'next';

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

function formatDateString(dateString: string): string {
  const date = new Date(dateString);

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

function getIdentityGroup(identityKey: GeoEventProviderClientId | string): string | null {
  const identityMap = new Map<string, string>([
    ['MODIS_NRT', 'MODIS'],
    ['VIIRS_NOAA20_NRT', 'VIIRS'],
    ['VIIRS_SNPP_NRT', 'VIIRS'],
    ['LANDSAT_NRT', 'LANDSAT'],
    ['GEOSTATIONARY', 'GEOSTATIONARY'],
    ['MODIS_SP', 'MODIS'],
    ['VIIRS_SNPP_SP', 'VIIRS'],
  ]);
  // Return the corresponding identity group based on the provided identity key
  return identityMap.get(identityKey) ?? null;
}

export default function Alert(
  props: InferGetStaticPropsType<typeof getStaticProps>,
) {
  const {id} = props;
  const alertQuery = api.alert.getAlert.useQuery({id}, {retry: 0});

  if (alertQuery.isError) {
    const error = alertQuery.error;
    let message = error?.shape?.message || 'Unknown error';
    const httpStatus = error?.data?.httpStatus || 500;
    if (httpStatus === 503) {
      message = 'Server under Maintenance. Please check back in a few minutes.';
    }
    if (httpStatus === 404) {
      return <ErrorPage statusCode={httpStatus} />;
    }
    return <ErrorDisplay message={message} httpStatus={httpStatus} />;
  }

  if (alertQuery.status !== 'success') {
    return <>Loading...</>;
  }

  const {data} = alertQuery;

  const alert: AlertData = data.data;
  const timePassed = getTimePassedSince(alert.eventDate);
  let timeAgo: string;

  if (timePassed.days > 0) {
    timeAgo = `${timePassed.days} days ago`;
  } else if (timePassed.hours > 0) {
    timeAgo = `${timePassed.hours} hours ago`;
  } else {
    timeAgo = `${timePassed.minutes} minutes ago`;
  }
  const formattedDateString = formatDateString(alert.localEventDate);
  const confidence = String(alert.confidence);
  const detectedBy = getIdentityGroup(alert.detectedBy);
  const latitude = String(alert.latitude);
  const longitude = String(alert.longitude);
  
  // Ensure polygon is a valid GeoJSON geometry
  const siteGeometry = alert.site.geometry;
  const polygon: GeoJSONGeometry = (() => {
    if (typeof siteGeometry === 'object' && siteGeometry !== null) {
      const geom = siteGeometry as Record<string, unknown>;
      if (
        typeof geom.type === 'string' &&
        Array.isArray(geom.coordinates) &&
        (geom.type === 'Point' || geom.type === 'Polygon' || geom.type === 'MultiPolygon')
      ) {
        return siteGeometry as GeoJSONGeometry;
      }
    }
    // Fallback to Point if invalid
    return {
      type: 'Point',
      coordinates: [alert.longitude, alert.latitude],
    };
  })();
  
  const siteId = alert.site.id;
  const siteName = alert.site.name;

  const alertData: AlertIdProps = {
    timeAgo,
    formattedDateString,
    confidence,
    detectedBy,
    latitude,
    longitude,
    polygon,
    siteId,
  };

  // Generate dynamic title based on alert data
  const generateTitle = (): string => {
    if (!siteName) {
      return 'Fire Alert';
    }

    // Check if alert is from today
    const today = new Date();
    const eventDate = new Date(alert.eventDate);
    const isToday =
      today.getFullYear() === eventDate.getFullYear() &&
      today.getMonth() === eventDate.getMonth() &&
      today.getDate() === eventDate.getDate();

    // Convert 24-hour time to 12-hour format with AM/PM
    const formatTime = (dateString: string): string => {
      const timeMatch = dateString.match(/at (\d{1,2}):(\d{2})/);
      if (!timeMatch) return '';
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      
      return `${hours}:${minutes} ${ampm}`;
    };

    // Format date-time to be more human readable
    const formatDateTime = (dateString: string): string => {
      // Parse the date string (format: "DD MMM YYYY at HH:MM")
      const dateMatch = dateString.match(/(\d{1,2}) (\w{3}) (\d{4}) at (\d{1,2}):(\d{2})/);
      if (!dateMatch) return dateString;
      
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3];
      let hours = parseInt(dateMatch[4], 10);
      const minutes = dateMatch[5];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      
      return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    };

    if (isToday) {
      // Format: <satellite> detected fire at <time> in <Site.name>
      const satellite = alert.detectedBy; // Use raw GeoEventProviderClientId
      const time = formatTime(alert.localEventDate);
      return `${satellite} detected fire at ${time} in ${siteName}`;
    } else {
      // Format: Fire in <Site.name> on <date-time>
      const dateTime = formatDateTime(alert.localEventDate);
      return `Fire in ${siteName} on ${dateTime}`;
    }
  };

  const pageTitle = generateTitle();

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div>
        <AlertId alertData={alertData} />
      </div>
    </>
  );
}

export async function getStaticProps(
  context: GetStaticPropsContext<{alertId: string}>,
) {
  // Create a minimal context for static props (public procedure doesn't require auth)
  const mockReq = {
    headers: {},
    url: '',
  } as unknown as NextApiRequest;

  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {
      req: mockReq,
      prisma,
      user: null,
      isAdmin: false,
      isImpersonatedUser: false,
    },
    transformer: superjson,
  });
  const id = context.params?.alertId;
  
  if (!id || typeof id !== 'string') {
    return {
      notFound: true,
    };
  }

  await helpers.alert.getAlert.prefetch({id});

  return {
    props: {
      trpcState: helpers.dehydrate(),
      id,
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
