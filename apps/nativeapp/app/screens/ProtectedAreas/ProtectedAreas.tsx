import React from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Colors, Typography} from '../../styles';
import ProtectedAreasSearch from './ProtectedAreasSearch';

const IS_ANDROID = Platform.OS === 'android';

const ProtectedAreas = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={Colors.TRANSPARENT}
      />
      <View style={[styles.headingContainer, styles.commonPadding]}>
        {/* <Text style={styles.mainHeading}>Protected Areas</Text> */}
        <ProtectedAreasSearch />
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
});
