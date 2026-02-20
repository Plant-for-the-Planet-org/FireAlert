/**
 * useHomeMapSelection Hook
 *
 * Manages map selection state for the Home screen including:
 * - Selected site (when user taps a site polygon/marker)
 * - Selected alert (when user taps an alert marker)
 * - Selected area (array of site features for highlighting)
 *
 * This hook encapsulates selection state management and provides
 * a unified clearSelection function to reset all selections.
 *
 * @returns {UseHomeMapSelectionReturn} Selection state and setter functions
 *
 * @example
 * const {
 *   selectedSite,
 *   selectedAlert,
 *   selectedArea,
 *   setSelectedSite,
 *   setSelectedAlert,
 *   setSelectedArea,
 *   clearSelection
 * } = useHomeMapSelection();
 *
 * // Select a site
 * setSelectedSite(siteProperties);
 *
 * // Clear all selections
 * clearSelection();
 */

import {useState, useCallback} from 'react';
import type {
  UseHomeMapSelectionReturn,
  SiteProperties,
  AlertData,
  SiteFeature,
} from '../types';

export function useHomeMapSelection(): UseHomeMapSelectionReturn {
  // State for selected site (site properties when a site is tapped)
  const [selectedSite, setSelectedSite] = useState<SiteProperties | null>(null);

  // State for selected alert (alert data when an alert marker is tapped)
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);

  // State for selected area (array of site features for map highlighting)
  const [selectedArea, setSelectedArea] = useState<SiteFeature[] | null>(null);

  /**
   * Clears all selection states
   * Used when user navigates away, closes sheets, or explicitly deselects
   */
  const clearSelection = useCallback(() => {
    setSelectedSite(null);
    setSelectedAlert(null);
    setSelectedArea(null);
  }, []);

  return {
    selectedSite,
    selectedAlert,
    selectedArea,
    setSelectedSite,
    setSelectedAlert,
    setSelectedArea,
    clearSelection,
  };
}
