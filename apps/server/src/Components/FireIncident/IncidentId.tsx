import React from 'react';
import type {RouterOutputs} from '../../utils/api';

type IncidentResponse = RouterOutputs['siteIncident']['getIncidentPublic'];
type IncidentDataType = IncidentResponse['data'];

interface IncidentData {
  startTimeAgo: string;
  formattedStartDate: string;
  formattedEndDate: string | null;
  alertCount: number;
  isActive: boolean;
  reviewStatus: string;
  siteName: string | null;
  latitude: string;
  longitude: string;
  polygon: IncidentDataType['site']['geometry'];
}

interface IncidentIdProps {
  incidentData: IncidentData;
}

export const IncidentId: React.FC<IncidentIdProps> = ({incidentData}) => {
  const {
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
  } = incidentData;

  return (
    <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
      <h1>Fire Incident Details</h1>

      <div style={{marginBottom: '20px'}}>
        <h2>Site: {siteName}</h2>
        <p>
          <strong>Status:</strong>{' '}
          <span
            style={{
              color: isActive ? '#d32f2f' : '#388e3c',
              fontWeight: 'bold',
            }}>
            {isActive ? 'Active' : 'Closed'}
          </span>
        </p>
        <p>
          <strong>Review Status:</strong>{' '}
          <span style={{textTransform: 'capitalize'}}>
            {reviewStatus.replace('_', ' ')}
          </span>
        </p>
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Timeline</h3>
        <p>
          <strong>Started:</strong> {formattedStartDate} ({startTimeAgo})
        </p>
        {formattedEndDate && (
          <p>
            <strong>Ended:</strong> {formattedEndDate}
          </p>
        )}
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Alert Information</h3>
        <p>
          <strong>Total Alerts:</strong> {alertCount}
        </p>
        {latitude && longitude && (
          <p>
            <strong>Latest Location:</strong> {latitude}, {longitude}
          </p>
        )}
      </div>

      {polygon && (
        <div style={{marginBottom: '20px'}}>
          <h3>Monitored Area</h3>
          <p>Site geometry data available</p>
          {/* TODO: Add map visualization here */}
        </div>
      )}
    </div>
  );
};
