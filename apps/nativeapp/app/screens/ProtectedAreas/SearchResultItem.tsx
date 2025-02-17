import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {protectedAreaSearchResultIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';

export type Result = {
  name: string;
  country: string;
  area?: number;
};
type Props = {
  results: Result[];
};

export default function SearchResultItem({results}: Props) {
  return (
    <View>
      <ScrollView style={styles.resultsContainer}>
        {results.map((r, key) => (
          <View key={key} style={styles.listItem}>
            <SvgXml height={52} xml={protectedAreaSearchResultIcon} />
            <View>
              <Text
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={styles.listItemName}>
                {r.name}
              </Text>
              <Text style={styles.listItemDescription}>
                {r.country} · {r?.area ? `${r.area} mha` : 'Unknown'}
              </Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopColor: Colors.GRAY_LIGHT,
    borderTopWidth: 1,
    paddingVertical: 8,
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
