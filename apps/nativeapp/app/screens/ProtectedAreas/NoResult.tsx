import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {noResultIcon} from '../../assets/svgs';

export default function NoResult() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <SvgXml xml={noResultIcon} />
        </View>
        <Text style={styles.highlightText}>No results found</Text>
        <Text style={styles.descriptionText}>
          Please make sure you are connected to the internet
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // borderColor: 'red',
    // borderWidth: 1,
    flex: 1,
    paddingHorizontal: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  highlightText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
