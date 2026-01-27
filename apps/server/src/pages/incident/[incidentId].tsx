// To access this page visit: ${URL}/incident/${incidentId}

import {createServerSideHelpers} from '@trpc/react-query/server';
import {api, type RouterOutputs} from '../../utils/api';
import type {
  GetStaticPropsContext,
  GetStaticPaths,
  InferGetStaticPropsType,
} from 'next';
import {IncidentId} from '../../Components/IncidentId/IncidentId';
import {appRouter} from '../../server/api/root';
import superjson from 'superjson';
import ErrorDisplay from '../../Components/Assets/ErrorDisplay';
import ErrorPage from 'next/error';

type IncidentResponse = RouterOutputs['siteIncident']['getIncidentPublic'];

function getTimePassedSince(date: Date): {
  days: number;
  hours: number;
  minutes: number;
} {
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const millisecondsPerHour = 60 * 60 * 1000;
  const millisecondsPerMinute = 60 * 1000;

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

const Incident = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
  const {id} = props;
  const incidentQuery = api.siteIncident.getIncidentPublic.useQuery(
    {incidentId: id},
    {retry: 0},
  );

  if (incidentQuery.isError) {
    const error = incidentQuery.error;
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

  if (incidentQuery.status !== 'success') {
    return <>Loading...</>;
  }

  const response = incidentQuery.data;
  const incident = response.data;

  const startTime = getTimePassedSince(incident.startedAt);
  let startTimeAgo: string;

  if (startTime.days > 0) {
    startTimeAgo = `${startTime.days} days ago`;
  } else if (startTime.hours > 0) {
    startTimeAgo = `${startTime.hours} hours ago`;
  } else {
    startTimeAgo = `${startTime.minutes} minutes ago`;
  }

  const formattedStartDate = formatDateString(incident.startedAt.toString());
  const formattedEndDate = incident.endedAt
    ? formatDateString(incident.endedAt.toString())
    : null;

  const alertCount = incident.siteAlerts.length;
  const isActive = incident.isActive;
  const reviewStatus = incident.reviewStatus;
  const siteName = incident.site.name;
  const polygon = incident.site.geometry;

  // Get coordinates from the latest alert or start alert
  const latestAlert = incident.latestSiteAlert || incident.startSiteAlert;
  const latitude = latestAlert ? `${latestAlert.latitude}` : '';
  const longitude = latestAlert ? `${latestAlert.longitude}` : '';

  const incidentData = {
    startTimeAgo,
    formattedStartDate,
    formattedEndDate,
    alertCount,
    isActive,
    reviewStatus,
    siteName,
    latitude,
    longitude,
    polygon,
  };

  return (
    <div>
      <IncidentId incidentData={incidentData} />
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
  const id = context.params?.incidentId as string;

  await helpers.siteIncident.getIncidentPublic.prefetch({incidentId: id});

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

export default Incident;
