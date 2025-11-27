import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import bbox from '@turf/bbox';
// @ts-ignore - no type definitions available
import rewind from '@mapbox/geojson-rewind';
import {point, polygon, multiPolygon} from '@turf/helpers';
import {AddIcon, MapOutlineIcon, TrashOutlineIcon} from '../../assets/svgs';
import {BottomSheet, Switch} from '../../components';
import {trpc} from '../../services/trpc';
import {Colors} from '../../styles';
import {styles as settingsStyles} from './Settings';

type Props = {
  radiusLoaderArr: any;
  setRadiusLoaderArr: any;
  setRefreshing: any;
  toast: any;
};

export default function ProtectedSitesSettings({
  radiusLoaderArr,
  setRadiusLoaderArr,
  setRefreshing,
  toast,
}: Props) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [sitesInfoModal, setSitesInfoModal] = useState<boolean>(false);
  const [selectedSiteInfo, setSelectedSiteInfo] = useState<any | null>(null);

  const {data: protectedSites} = (trpc.site as any).getProtectedSites.useQuery(
    ['site', 'getProtectedSites'],
    {
      enabled: true,
      retryDelay: 3000,
      staleTime: 'Infinity',
      cacheTime: 'Infinity',
      keepPreviousData: true,
      onError: () => {
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const pauseAlertForProtectedSite = (
    trpc.site as any
  ).pauseAlertForProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: (res: any) => {
      queryClient.setQueryData(
        [
          ['site', 'getProtectedSites'],
          {input: ['site', 'getProtectedSites'], type: 'query'},
        ],
        (oldData: any) => {
          return oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null;
        },
      );
      const loadingArr = radiusLoaderArr.filter(
        (el: any) => el !== res?.json?.data?.id,
      );
      setRadiusLoaderArr(loadingArr);
      toast.show('Success', {type: 'success'});
    },
  });

  const deleteProtectedSite = trpc.site.deleteProtectedSite.useMutation({
    retryDelay: 3000,
    onMutate: () => {
      setIsDeletingProtected(true);
      if (deleteProtectedTimeout.current) {
        clearTimeout(deleteProtectedTimeout.current);
      }
      deleteProtectedTimeout.current = setTimeout(() => {
        setIsDeletingProtected(false);
      }, 15000);
      setRefreshing(true);
    },
    onSuccess: async (res, req) => {
      await queryClient.invalidateQueries([
        ['site', 'getProtectedSites'],
        {input: ['site', 'getProtectedSites'], type: 'query'},
      ]);
      await queryClient.invalidateQueries([
        ['alert', 'getAlerts'],
        {input: ['alerts', 'getAlerts'], type: 'query'},
      ]);
      setSitesInfoModal(false);
      setRefreshing(false);
      if (deleteProtectedTimeout.current) {
        clearTimeout(deleteProtectedTimeout.current);
      }
      setIsDeletingProtected(false);
      toast.show('Deleted', {type: 'success'});
    },
    onError: () => {
      setRefreshing(false);
      if (deleteProtectedTimeout.current) {
        clearTimeout(deleteProtectedTimeout.current);
      }
      setIsDeletingProtected(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleSiteInformation = (item: any) => {
    console.log('item', item);
    setSelectedSiteInfo(item);
    setSitesInfoModal(!sitesInfoModal);
  };

  const _handleViewMap = (siteInfo: any) => () => {
    let highlightSiteInfo = siteInfo;
    let bboxGeo;
    setSitesInfoModal(false);
    if (siteInfo?.geometry?.type === 'MultiPolygon') {
      bboxGeo = bbox(multiPolygon(rewind(siteInfo?.geometry.coordinates)));
      highlightSiteInfo = rewind(siteInfo?.geometry);
    } else if (siteInfo?.geometry?.type === 'Point') {
      bboxGeo = bbox(point(siteInfo?.geometry.coordinates));
      highlightSiteInfo = siteInfo?.geometry;
    } else {
      bboxGeo = bbox(polygon(siteInfo?.geometry.coordinates));
      highlightSiteInfo = siteInfo?.geometry;
    }

    console.log('siteInfo', siteInfo);

    (navigation as any).navigate('BottomTab', {
      screen: 'Home',
      params: {
        bboxGeo,
        siteInfo: [
          {
            type: 'Feature',
            geometry: highlightSiteInfo,
            properties: {site: siteInfo},
          },
        ],
      },
    });
  };

  // if (!protectedSites?.protectedSites?.json?.data?.length) {
  //   return null;
  // }

  return (
    <View style={[settingsStyles.mySites, settingsStyles.commonPadding]}>
      <View style={settingsStyles.mySitesHead}>
        <Text style={settingsStyles.mainHeading}>Protected Areas</Text>
      </View>
      {/* <Text>{JSON.stringify(protectedSites, null, 2)}</Text> */}
      {protectedSites?.json?.data?.length > 0 ? (
        protectedSites?.json?.data
          ?.filter((site: any) => site?.project === null)
          .map((item: any, index: number) => (
            <TouchableOpacity
              disabled={radiusLoaderArr.includes(item?.id)}
              onPress={() => handleSiteInformation(item)}
              key={`protectedSites_${index}`}
              style={[settingsStyles.mySiteNameContainer]}>
              <Text style={settingsStyles.mySiteName}>
                {item?.name || item?.id}
              </Text>
              <View style={settingsStyles.rightConPro}>
                {radiusLoaderArr.includes(item?.id) ? (
                  <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
                ) : (
                  <Switch
                    value={item?.isActive}
                    onValueChange={(val: boolean) => {
                      pauseAlertForProtectedSite.mutate({
                        json: {
                          params: {
                            siteRelationId: item?.siteRelationId,
                            siteId: item?.id,
                          },
                          body: {isActive: val},
                        },
                      });
                      setRadiusLoaderArr((prevState: any[]) => [
                        ...prevState,
                        item?.id,
                      ]);
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))
      ) : (
        <View
          style={[
            settingsStyles.mySiteNameContainer,
            settingsStyles.paddingVertical20,
          ]}>
          <View>
            <Text style={settingsStyles.emptySiteText}>
              Monitor National Parks, Public Forests{'\n'}
              and Conservation Areas near you.
            </Text>
            <TouchableOpacity
              onPress={() => {
                (navigation as any).navigate('ProtectedAreas');
              }}
              activeOpacity={0.7}
              style={[settingsStyles.addSiteBtn, styles.addProtectedSiteBtn]}>
              <AddIcon width={11} height={11} color={Colors.WHITE} />
              <Text
                style={[
                  settingsStyles.emptySiteText,
                  settingsStyles.colorWhite,
                ]}>
                Add Protected Areas
              </Text>
            </TouchableOpacity>
          </View>
          <View style={settingsStyles.locWaveCon}>{/*<LocationWave />*/}</View>
        </View>
      )}
      {/* Site information modal */}
      <BottomSheet
        isVisible={sitesInfoModal}
        backdropColor={Colors.BLACK + '80'}
        onBackdropPress={() => setSitesInfoModal(false)}>
        <View
          style={[settingsStyles.modalContainer, settingsStyles.commonPadding]}>
          <View style={settingsStyles.modalHeader} />
          <View style={settingsStyles.siteTitleCon}>
            <View>
              <Text style={settingsStyles.siteTitle}>
                {selectedSiteInfo?.name || selectedSiteInfo?.id}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={_handleViewMap(selectedSiteInfo)}
            style={settingsStyles.btn}>
            <MapOutlineIcon />
            <Text style={settingsStyles.siteActionText}>View on Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={deleteProtectedSite?.isLoading || isDeletingProtected}
            onPress={() => {
              deleteProtectedSite.mutate({
                json: {
                  params: {
                    siteRelationId: selectedSiteInfo?.siteRelationId,
                    siteId: selectedSiteInfo?.id,
                  },
                },
              });
            }}
            style={[settingsStyles.btn]}>
            {deleteProtectedSite?.isLoading || isDeletingProtected ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <TrashOutlineIcon />
            )}
            <Text style={settingsStyles.siteActionText}>Delete Site</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addProtectedSiteBtn: {
    width: 166,
  },
});
