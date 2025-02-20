import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {styles as settingsStyles} from './Settings';
import {Switch} from '../../components';
import {Colors} from '../../styles';
import {trpc} from '../../services/trpc';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';

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
  const {navigate} = useNavigation();
  const queryClient = useQueryClient();

  const {data: protectedSites} = trpc.site.getProtectedSites.useQuery(
    ['site', 'getProtectedSites'],
    {
      enabled: true,
      retryDelay: 3000,
      staleTime: 'Infinity',
      cacheTime: 'Infinity',
      keepPreviousData: true,
      onSuccess: () => {
        setRefreshing(false);
      },
      onError: () => {
        setRefreshing(false);
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const updateProtectedSite = trpc.site.updateProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: res => {
      queryClient.setQueryData(
        [
          ['site', 'getProtectedSites'],
          {input: ['site', 'getProtectedSites'], type: 'query'},
        ],
        _prev => {},
      );
      toast.show('Success', {type: 'success'});
    },
  });

  // if (!protectedSites?.protectedSites?.json?.data?.length) {
  //   return null;
  // }

  return (
    <View style={[settingsStyles.mySites, settingsStyles.commonPadding]}>
      <View style={settingsStyles.mySitesHead}>
        <Text style={settingsStyles.mainHeading}>Protected Sites</Text>
      </View>
      {/* <Text>{JSON.stringify(protectedSites, null, 2)}</Text> */}
      {protectedSites?.json?.data?.length > 0 ? (
        protectedSites?.json?.data
          ?.filter(site => site?.project === null)
          .map((item, index) => (
            <TouchableOpacity
              disabled={radiusLoaderArr.includes(item?.id)}
              onPress={() => {
                // handleSiteInformation(item);
              }}
              key={`protectedSites_${index}`}
              style={[
                settingsStyles.mySiteNameContainer,
                styles.verticalPadding,
              ]}>
              <Text style={settingsStyles.mySiteName}>
                {item?.name || item?.id}
              </Text>
              <View style={settingsStyles.rightConPro}>
                {radiusLoaderArr.includes(item?.id) ? (
                  <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
                ) : (
                  <Switch
                    value={item?.isActive}
                    onValueChange={val => {
                      updateProtectedSite.mutate({
                        json: {
                          params: {siteId: item?.id},
                          body: {isActive: val},
                        },
                      });
                      setRadiusLoaderArr(prevState => [...prevState, item?.id]);
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
              Select any Protected Area{'\n'}
              <Text style={settingsStyles.receiveNotifications}>
                and Receive Notifications
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                navigate('ProtectedAreas');
              }}
              activeOpacity={0.7}
              style={[settingsStyles.addSiteBtn, styles.addProtectedSiteBtn]}>
              {/*<AddIcon width={11} height={11} color={Colors.WHITE} />*/}
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
    </View>
  );
}

const styles = StyleSheet.create({
  verticalPadding: {
    paddingVertical: 10,
  },
  addProtectedSiteBtn: {
    width: 162,
  },
});
