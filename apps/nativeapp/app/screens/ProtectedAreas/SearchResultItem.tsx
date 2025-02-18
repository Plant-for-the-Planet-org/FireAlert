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
import {Colors, Typography} from '../../styles';
import {trpc} from '../../services/trpc';
import Toast, {useToast} from 'react-native-toast-notifications';
import {useNavigation} from '@react-navigation/native';

export type Result = {
  name: string;
  country: string;
  area?: number;
};
type Props = {
  results: Result[];
};

export default function SearchResultItem({results}: Props) {
  const toast = useToast();
  // const {navigate} = useNavigation();

  const modalToast = useRef();

  const createProtectedSite = trpc.site.createProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: res => {
      console.log(res);
      if (res?.json && res?.json?.status === 'success') {
        console.log(res.json.data);
        toast.show('Success', {type: 'success'});
        // navigate("")
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
                createProtectedSite.mutate({
                  json: {externalId: r?.externalId},
                });
              }}>
              <SvgXml height={52} xml={protectedAreaSearchResultIcon} />
              <View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode={'tail'}
                  style={styles.listItemName}>
                  {r.name}
                </Text>
                {/* <Text style={styles.listItemDescription}>
                {r.country} · {r?.area ? `${r.area} mha` : 'Unknown'}
                </Text> */}
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
    fontWeight: 'bold',
  },
  listItemDescription: {
    fontSize: Typography.FONT_SIZE_12,
  },
});
