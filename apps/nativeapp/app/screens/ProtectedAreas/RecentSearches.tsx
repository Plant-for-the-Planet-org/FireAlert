import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {
  recentSearchApplyIcon,
  recentSearchClearIcon,
} from '../../assets/svgs/protectedAreaIcon';
import {Colors, Typography} from '../../styles';
import {getData, storeData} from '../../utils/localStorage';

const MAX_RECENT_SEARCHES = 20;

export default function RecentSearches() {
  const recents = useRecentSearches();

  const handleClearRecentSearches = (array: any[], index: number) => {
    array.splice(index, 1);
    array.reverse();
    storeData('recentSearches', array);
  };

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
              <Pressable
                onPress={() => {
                  handleClearRecentSearches(recents, key);
                }}>
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
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      let _recents = (await getData('recentSearches')) as string[];

      if (!_recents) {
        _recents = [];
      }
      setRecents(_recents.reverse());
    })();
  }, []);

  return recents;
}

export async function addToRecentSearches(search: string) {
  let searches = (await getData('recentSearches')) as string[];

  if (searches) {
    if (searches.length >= 20) {
      searches.shift();
    }
    if (searches.includes(search)) {
      return;
    } else {
      searches.push(search);
    }
    storeData('recentSearches', searches);
  } else {
    searches = [];
  }
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
