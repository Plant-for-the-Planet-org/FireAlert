/**
 * HomeMapSources Component
 *
 * Renders all GeoJSON sources and layers for sites, alerts, and incident circles.
 * This component handles the map data visualization including:
 * - Site polygons and multipolygons (user-created and protected areas)
 * - Site points (point-based monitoring sites)
 * - Fire alert markers
 * - Incident circles (encompassing multiple fires)
 * - Selection highlighting
 *
 * @component
 */

import React from 'react';
import {Platform, Dimensions} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
// @ts-ignore - no type definitions available
import rewind from '@mapbox/geojson-rewind';
import bbox from '@turf/bbox';
import {multiPolygon, polygon} from '@turf/helpers';
import {Colors} from '../../../styles';
import {getFireIcon} from '../../../utils/getFireIcon';
import {daysFromToday} from '../../../utils/moment';
import {PointSiteIcon, OrangeFireIcon} from '../../../assets/svgs';
import type {HomeMapSourcesProps, SiteProperties} from '../types';
import type {SiteFeature} from '../../../types/navigation';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_HEIGHT = Dimensions.get('window').height;

const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

/**
 * HomeMapSources - Renders all map data sources and layers
 *
 * @param props - Component props
 * @returns The map sources and layers
 */
export const HomeMapSources: React.FC<HomeMapSourcesProps> = ({
  sites,
  alerts,
  protectedSites,
  selectedArea,
  incidentCircleData,
  incident,
  cameraRef,
  onAlertPress,
  onSitePress,
}) => {
  /**
   * Renders fire alert markers as point annotations
   */
  const renderAlertAnnotations = () => {
    if (!alerts || alerts.length === 0) {
      return null;
    }

    return alerts.map(alert => {
      const coordinate = [alert.longitude, alert.latitude];
      const title = `Longitude: ${alert.longitude} Latitude: ${alert.latitude}`;

      return (
        <MapboxGL.PointAnnotation
          id={alert.id}
          key={alert.id}
          title={title}
          onSelected={() => {
            if (cameraRef?.current?.setCamera) {
              cameraRef.current.setCamera({
                centerCoordinate: [alert.longitude, alert.latitude],
                padding: {
                  paddingBottom: IS_ANDROID
                    ? SCREEN_HEIGHT / 2.8
                    : SCREEN_HEIGHT / 4,
                  paddingTop: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                },
                zoomLevel: ZOOM_LEVEL,
                animationDuration: ANIMATION_DURATION,
              });
            }
            setTimeout(() => {
              console.log(
                `[incident] Fire alert marker tapped - alertId: ${
                  alert.id
                }, siteIncidentId: ${
                  alert.siteIncidentId || 'none'
                }, latitude: ${alert.latitude}, longitude: ${alert.longitude}`,
              );
              onAlertPress(alert);
            }, ANIMATION_DURATION);
          }}
          coordinate={coordinate}>
          {getFireIcon(daysFromToday(new Date(alert.eventDate))) || (
            <OrangeFireIcon />
          )}
        </MapboxGL.PointAnnotation>
      );
    });
  };

  /**
   * Renders site point markers as point annotations
   */
  const renderSitePointAnnotations = () => {
    const pointSites = sites.filter(
      (site): site is SiteFeature & {geometry: GeoJSON.Point} =>
        site.geometry?.type === 'Point',
    );

    if (!pointSites || pointSites.length === 0) {
      return null;
    }

    return pointSites.map(site => {
      const coordinate = site.geometry.coordinates as [number, number];
      const title = `Longitude: ${coordinate[0]} Latitude: ${coordinate[1]}`;

      return (
        <MapboxGL.PointAnnotation
          id={site.properties.id}
          key={site.properties.id}
          title={title}
          onSelected={() => {
            if (cameraRef?.current?.setCamera) {
              cameraRef.current.setCamera({
                centerCoordinate: coordinate,
                zoomLevel: 15,
                animationDuration: 500,
              });
            }
            onSitePress(site.properties);
          }}
          coordinate={coordinate}>
          <PointSiteIcon />
        </MapboxGL.PointAnnotation>
      );
    });
  };

  /**
   * Renders polygon and multipolygon sites as shape sources
   */
  const renderSitePolygonSource = () => {
    const polygonSites = sites.filter(
      site =>
        site.geometry?.type === 'Polygon' ||
        site.geometry?.type === 'MultiPolygon',
    );

    if (!polygonSites || polygonSites.length === 0) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource
        id="polygon"
        shape={{
          type: 'FeatureCollection',
          features: polygonSites.map(site => ({
            type: 'Feature',
            properties: {site: site.properties},
            geometry: site.geometry,
          })),
        }}
        onPress={e => {
          if (!e?.features || e.features.length === 0) return;

          let bboxGeo = null;
          const feature = e.features[0];

          if (feature.geometry.type === 'MultiPolygon') {
            bboxGeo = bbox(multiPolygon(rewind(feature.geometry.coordinates)));
          } else if (feature.geometry.type === 'Polygon') {
            bboxGeo = bbox(polygon(feature.geometry.coordinates));
          }

          if (bboxGeo && cameraRef?.current?.fitBounds) {
            cameraRef.current.fitBounds(
              [bboxGeo[0], bboxGeo[1]],
              [bboxGeo[2], bboxGeo[3]],
              60,
              500,
            );
          }

          if (feature.properties?.site) {
            onSitePress(feature.properties.site as SiteProperties);
          }
        }}>
        <MapboxGL.FillLayer
          id="polyFill"
          layerIndex={2}
          style={{
            fillColor: Colors.WHITE,
            fillOpacity: 0.4,
          }}
        />
        <MapboxGL.LineLayer
          id="polyline"
          style={{
            lineWidth: 2,
            lineColor: Colors.WHITE,
            lineOpacity: 1,
            lineJoin: 'bevel',
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  /**
   * Renders protected area sites as shape sources
   */
  const renderProtectedAreasSource = () => {
    if (!protectedSites || protectedSites.length === 0) {
      return null;
    }

    const protectedPolygons = protectedSites
      .filter((site: any) => site.project === null)
      .filter(
        (site: SiteFeature) =>
          site.geometry?.type === 'Polygon' ||
          site.geometry?.type === 'MultiPolygon',
      );

    if (protectedPolygons.length === 0) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource
        id="protected-polygons"
        shape={{
          type: 'FeatureCollection',
          features: protectedPolygons.map((site: SiteFeature) => ({
            type: 'Feature',
            properties: {site: site.properties},
            geometry:
              site.geometry.type === 'MultiPolygon'
                ? (rewind(site.geometry) as any)
                : site.geometry.type === 'Polygon'
                ? (rewind(site.geometry) as any)
                : site.geometry,
          })),
        }}
        onPress={e => {
          if (!e?.features || e.features.length === 0) return;

          let bboxGeo = null;
          const feature = e.features[0];

          if (feature.geometry.type === 'MultiPolygon') {
            bboxGeo = bbox(multiPolygon(rewind(feature.geometry.coordinates)));
          } else if (feature.geometry.type === 'Polygon') {
            bboxGeo = bbox(polygon(feature.geometry.coordinates));
          }

          if (bboxGeo && cameraRef?.current?.fitBounds) {
            cameraRef.current.fitBounds(
              [bboxGeo[0], bboxGeo[1]],
              [bboxGeo[2], bboxGeo[3]],
              60,
              500,
            );
          }

          if (feature.properties?.site) {
            onSitePress(feature.properties.site as SiteProperties);
          }
        }}>
        <MapboxGL.FillLayer
          id="protected-polyFill"
          layerIndex={2}
          style={{
            fillColor: Colors.WHITE,
            fillOpacity: 0.4,
          }}
        />
        <MapboxGL.LineLayer
          id="protected-polyline"
          style={{
            lineWidth: 2,
            lineColor: Colors.WHITE,
            lineOpacity: 1,
            lineJoin: 'bevel',
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  /**
   * Renders highlighted/selected area with different styling
   */
  const renderHighlightedMapSource = () => {
    if (!selectedArea || selectedArea.length === 0) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource
        id="fillSource"
        shape={{
          type: 'FeatureCollection',
          features: selectedArea.map(singleSite => ({
            type: 'Feature',
            properties: {site: singleSite.properties},
            geometry:
              singleSite.geometry?.type === 'MultiPolygon'
                ? (rewind(singleSite.geometry) as any)
                : singleSite.geometry?.type === 'Polygon'
                ? (rewind(singleSite.geometry) as any)
                : singleSite.geometry,
          })),
        }}>
        <MapboxGL.FillLayer
          id="fillLayer"
          style={{
            fillColor: Colors.GRADIENT_PRIMARY,
            fillOpacity: 0.25,
          }}
        />
        <MapboxGL.LineLayer
          id="fillOutline"
          style={{
            lineWidth: 1.5,
            lineColor: Colors.WHITE,
            lineOpacity: 0.9,
            lineJoin: 'bevel',
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  /**
   * Renders the incident circle on the map
   * Shows a circular polygon encompassing all fires in the incident
   */
  const renderIncidentCircle = () => {
    if (!incidentCircleData) {
      console.log(
        '[incident] No incident circle data available - skipping render',
      );
      return null;
    }

    if (!incident) {
      console.log('[incident] No incident data available - skipping render');
      return null;
    }

    const circleColor = incident.isActive
      ? Colors.INCIDENT_ACTIVE_COLOR
      : Colors.INCIDENT_RESOLVED_COLOR;

    console.log(
      `[incident] Rendering incident circle on map - incidentId: ${incident.id}, isActive: ${incident.isActive}, color: ${circleColor}`,
    );
    console.log(
      `[incident] Circle polygon details - type: ${
        incidentCircleData.circlePolygon.geometry.type
      }, coordinates: ${
        incidentCircleData.circlePolygon.geometry.coordinates[0]?.length || 0
      } points, radius: ${incidentCircleData.radiusKm.toFixed(
        2,
      )}km, area: ${incidentCircleData.areaKm2.toFixed(2)}km²`,
    );
    console.log(
      `[incident] Circle centroid - lat: ${incidentCircleData.centroid[1]}, lon: ${incidentCircleData.centroid[0]}`,
    );

    return (
      <MapboxGL.ShapeSource
        id="incident-circle"
        shape={incidentCircleData.circlePolygon}>
        <MapboxGL.FillLayer
          id="incident-circle-fill"
          style={{
            fillColor: circleColor,
            fillOpacity: 0.25,
          }}
        />
        <MapboxGL.LineLayer
          id="incident-circle-line"
          style={{
            lineWidth: 3,
            lineColor: circleColor,
            lineOpacity: 1,
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  return (
    <>
      {/* Render site polygons and multipolygons */}
      {renderSitePolygonSource()}

      {/* Render protected area polygons */}
      {renderProtectedAreasSource()}

      {/* Render highlighted/selected area */}
      {renderHighlightedMapSource()}

      {/* Render incident circle */}
      {renderIncidentCircle()}

      {/* Render fire alert markers */}
      {renderAlertAnnotations()}

      {/* Render site point markers */}
      {renderSitePointAnnotations()}
    </>
  );
};
