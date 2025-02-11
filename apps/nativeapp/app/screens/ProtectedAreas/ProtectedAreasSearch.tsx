import React from 'react';
import SearchInput from '../../components/inputs/SearchInput';
import {ScrollView, View} from 'react-native';
import SearchResultItem from './SearchResultItem';

export default function ProtectedAreasSearch() {
  return (
    <View>
      <SearchInput placeholder="Search" />
      <ScrollView>
        <SearchResultItem />
      </ScrollView>
    </View>
  );
}
