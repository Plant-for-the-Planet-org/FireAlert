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

  // const {data: protectedSites} = trpc.site.getProtectedSites.useQuery(
  //   ['site', 'getProtectedSites'],
  //   {
  //     enabled: true,
  //     retryDelay: 3000,
  //     staleTime: 'Infinity',
  //     cacheTime: 'Infinity',
  //     keepPreviousData: true,
  //     onSuccess: () => {
  //       setRefreshing(false);
  //     },
  //     onError: () => {
  //       setRefreshing(false);
  //       toast.show('something went wrong', {type: 'danger'});
  //     },
  //   },
  // );

  return (
    <View style={[settingsStyles.mySites, settingsStyles.commonPadding]}>
      <View style={settingsStyles.mySitesHead}>
        <Text style={settingsStyles.mainHeading}>Protected Sites</Text>
      </View>
      {/* <Text>{JSON.stringify(protectedSites, null, 2)}</Text> */}
      {
        protectedSites?.json?.data?.filter(site => site?.project === null)
          .length > 0
          ? protectedSites?.json?.data
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
                      <ActivityIndicator
                        size={'small'}
                        color={Colors.PRIMARY}
                      />
                    ) : (
                      <Switch
                        value={item?.isActive}
                        onValueChange={val => {
                          // updateSite.mutate({
                          //   json: {
                          //     params: {siteId: item?.id},
                          //     body: {isMonitored: val},
                          //   },
                          // });
                          setRadiusLoaderArr(prevState => [
                            ...prevState,
                            item?.id,
                          ]);
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
          : null
        // <View style={[styles.mySiteNameContainer, styles.paddingVertical20]}>
        //   <View>
        //     <Text style={styles.emptySiteText}>
        //       Create Your Own{'\n'}Fire Alert Site{'\n'}
        //       <Text style={styles.receiveNotifications}>
        //         and Receive Notifications
        //       </Text>
        //     </Text>
        //     <TouchableOpacity
        //       onPress={openModal}
        //       activeOpacity={0.7}
        //       style={styles.addSiteBtn}>
        //       <AddIcon width={11} height={11} color={Colors.WHITE} />
        //       <Text style={[styles.emptySiteText, styles.colorWhite]}>
        //         Add Site
        //       </Text>
        //     </TouchableOpacity>
        //   </View>
        //   <View style={styles.locWaveCon}>
        //     <LocationWave />
        //   </View>
        // </View>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  verticalPadding: {
    paddingVertical: 10,
  },
});
