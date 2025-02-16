import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {
  recentSearchApplyIcon,
  recentSearchClearIcon,
} from '../../assets/svgs/protectedAreaIcon';
import {Colors, Typography} from '../../styles';

export default function RecentSearches() {
  const recents = useRecentSearches();
  return (
    <View>
      <Text style={styles.highlightText}>Recent searches</Text>
      <ScrollView style={styles.resultsContainer}>
        {recents.map((s, key) => (
          <View key={key} style={styles.listItem}>
            <View style={styles.listItemContainer}>
              <View style={styles.listItemLeftContainer}>
                <Pressable onPress={() => {}}>
                  <SvgXml xml={recentSearchApplyIcon} />
                </Pressable>
                <Text style={styles.listItemTextContent}>{s}</Text>
              </View>
              <Pressable onPress={() => {}}>
                <SvgXml xml={recentSearchClearIcon} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function useRecentSearches() {
  const recents = ['A Place', 'B Place Name', 'A Very Very Long Place Name'];
  return recents;
}

const styles = StyleSheet.create({
  highlightText: {
    marginVertical: 16,
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.TEXT_COLOR,
    fontWeight: 'bold',
  },
  resultsContainer: {
    gap: 16,
  },
  listItem: {
    paddingVertical: 8,
  },
  listItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemTextContent: {
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.TEXT_COLOR,
  },
});
