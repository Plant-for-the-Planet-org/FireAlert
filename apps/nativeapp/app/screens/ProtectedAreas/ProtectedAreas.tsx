import React, {useState} from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {Colors, Typography} from '../../styles';
import NoResult from './NoResult';
import ProtectedAreasSearch from './ProtectedAreasSearch';
import RecentSearches from './RecentSearches';
import SearchResultItem, {Result} from './SearchResultItem';

const IS_ANDROID = Platform.OS === 'android';

const ProtectedAreas = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [noResults, setNoResults] = useState(false);

  function handleSubmit() {
    const _result = filterSampleData(query);
    if (_result.length === 0) {
      setNoResults(true);
      return;
    }
    setResults(_result);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={Colors.TRANSPARENT}
      />
      <View style={[styles.headingContainer, styles.commonPadding]}>
        {/* <Text style={styles.mainHeading}>Protected Areas</Text> */}
        <ProtectedAreasSearch
          value={query}
          onChangeText={text => {
            setQuery(text);
            setResults([]);
            setNoResults(false);
          }}
          onSubmit={input => {
            handleSubmit();
          }}
        />
        {/* Remove Unncessary Abstraction */}
      </View>

      <View style={[styles.bodyContainer, styles.commonPadding]}>
        {query.length === 0 && <RecentSearches />}
        {noResults && <NoResult />}
        {results.length > 0 && <SearchResultItem results={results} />}
      </View>
    </SafeAreaView>
  );
};

export default ProtectedAreas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    paddingTop: IS_ANDROID ? StatusBar.currentHeight : 0,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  headingContainer: {
    marginTop: 20,
  },
  mainHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  bodyContainer: {
    flex: 1,
  },
});

function filterSampleData(query: string) {
  const sampleData = require('./sample.json');
  return sampleData.filter(item => {
    return item.name.toLowerCase().includes(query.toLowerCase());
  });
}
