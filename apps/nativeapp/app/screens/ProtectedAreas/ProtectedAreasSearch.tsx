import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {BackArrowIcon} from '../../assets/svgs';
import SearchInput from '../../components/inputs/SearchInput';
import {addToRecentSearches} from './RecentSearches';

type Props = {
  value: string;
  onChangeText: (input: string) => void;
  onSubmit: (input: string) => void;
};

export default function ProtectedAreasSearch({
  value,
  onChangeText,
  onSubmit,
}: Props) {
  const {goBack} = useNavigation();
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  async function handleSubmitEditing() {
    onSubmit(input);
    try {
      await addToRecentSearches(input);
    } catch (error) {
      console.warn('Failed to add to recent searches:', error);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack}>
        <BackArrowIcon />
      </TouchableOpacity>
      <SearchInput
        containerStyle={styles.searchInputContainer}
        inputStyle={styles.searchInput}
        placeholder="Search for over 280000 Protected Areas and get fFre Alerts for them."
        value={input}
        inputMode="search"
        onChangeText={text => {
          onChangeText(text);
          setInput(text);
        }}
        onSubmitEditing={handleSubmitEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexGrow: 1,
    marginRight: 8,
  },
  searchInput: {
    width: '100%',
  },
});
