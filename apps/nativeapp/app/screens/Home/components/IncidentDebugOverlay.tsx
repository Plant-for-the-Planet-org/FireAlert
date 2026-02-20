import React from 'react';
import {View, Text} from 'react-native';
import {actionStyles} from '../styles/actionStyles';
import type {IncidentCircleResult} from '../../../types/incident';

/**
 * Props for IncidentDebugOverlay component
 */
export interface IncidentDebugOverlayProps {
  /** Incident circle data containing radius and area metrics */
  incidentCircleData: IncidentCircleResult | null;
  /** Whether to show the debug overlay */
  visible?: boolean;
}

/**
 * IncidentDebugOverlay Component
 *
 * Displays debug information for incident circles when enabled.
 * Shows the circle's radius in kilometers and area in square kilometers.
 *
 * @param props - Component props
 * @returns Debug overlay component or null if not visible
 */
export const IncidentDebugOverlay: React.FC<IncidentDebugOverlayProps> = ({
  incidentCircleData,
  visible = true,
}) => {
  // Don't render if not visible or no data
  if (!visible || !incidentCircleData) {
    return null;
  }

  return (
    <View style={actionStyles.debugOverlay}>
      <Text style={actionStyles.debugTitle}>[CIRCLE] Rendered</Text>
      <Text style={actionStyles.debugText}>
        Radius: {incidentCircleData.radiusKm.toFixed(1)}km
      </Text>
      <Text style={actionStyles.debugText}>
        Area: {incidentCircleData.areaKm2.toFixed(2)}km²
      </Text>
    </View>
  );
};
