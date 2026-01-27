import React, {useRef} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {protectedAreaSearchResultIcon} from '../../assets/svgs';
import bbox from '@turf/bbox';
// @ts-ignore - no type definitions available
import rewind from '@mapbox/geojson-rewind';
import {point, polygon, multiPolygon} from '@turf/helpers';
import {Colors, Typography} from '../../styles';
import {trpc} from '../../services/trpc';
import Toast, {useToast} from 'react-native-toast-notifications';
import {useNavigation} from '@react-navigation/native';

export type Result = {
  name: string;
  wdpaid: string;
  wdpa_pid: string;
  gis_area?: number;
  iso3: string;
  country: string;
  areaInHectare: string;
  remoteId: string;
};
type Props = {
  results: Result[];
};

export default function SearchResultItems({results}: Props) {
  const toast = useToast();
  const {navigate} = useNavigation();

  const modalToast = useRef();

  const createProtectedSite = trpc.site.createProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: res => {
      if (res?.json && res?.json?.status === 'success') {
        const site = res?.json?.data?.site;
        if (site?.geometry?.type) {
          let highlightSiteInfo = site;
          let bboxGeo;
          if (site?.geometry?.type === 'MultiPolygon') {
            bboxGeo = bbox(multiPolygon(rewind(site?.geometry.coordinates)));
            highlightSiteInfo = rewind(site?.geometry);
          } else if (site?.geometry?.type === 'Point') {
            bboxGeo = bbox(point(site?.geometry.coordinates));
            highlightSiteInfo = site?.geometry;
          } else {
            bboxGeo = bbox(polygon(site?.geometry.coordinates));
            highlightSiteInfo = site?.geometry;
          }
          setTimeout(() => {
            toast.show('Success', {type: 'success'});
            navigate('BottomTab', {
              screen: 'Home',
              params: {
                bboxGeo,
                siteInfo: [
                  {
                    type: 'Feature',
                    geometry: highlightSiteInfo,
                    properties: {site},
                  },
                ],
              },
            });
          }, 500);
        } else {
          toast.show('Success', {type: 'success'});
          navigate('BottomTab', {screen: 'Home'});
        }
      }
    },
  });

  return (
    <View>
      <Toast ref={modalToast} offsetBottom={100} duration={2000} />
      <ScrollView style={styles.resultsContainer}>
        {results.map((r, key) => (
          <View key={key} style={styles.listItem}>
            <TouchableOpacity
              style={styles.listItemTouchable}
              onPress={() => {
                createProtectedSite.mutate({json: {remoteId: r?.remoteId}});
              }}>
              <SvgXml height={52} xml={protectedAreaSearchResultIcon} />
              <View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode={'tail'}
                  style={styles.listItemName}>
                  {r.name}
                </Text>
                <Text style={styles.listItemDescription}>
                  {r.country} · {r.areaInHectare}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  resultsContainer: {
    marginTop: 16,
  },
  listItem: {
    borderTopColor: Colors.GRAY_LIGHT,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  listItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemContainer: {},
  listItemName: {
    fontSize: Typography.FONT_SIZE_14,
    lineHeight: Typography.LINE_HEIGHT_20,
    color: Colors.TEXT_COLOR,
    fontWeight: 'bold',
  },
  listItemDescription: {
    fontSize: Typography.FONT_SIZE_12,
    color: Colors.TEXT_COLOR,
  },
});
