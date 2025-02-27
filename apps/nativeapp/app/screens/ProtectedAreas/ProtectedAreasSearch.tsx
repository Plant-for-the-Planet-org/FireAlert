import React, {useState} from 'react';
import {Button, StyleSheet, TouchableOpacity, View} from 'react-native';
import SearchInput from '../../components/inputs/SearchInput';
import {addToRecentSearches} from './RecentSearches';
import FlatButton from '../../components/flatButton';
import {CustomButton} from '../../components';
import {BackArrowIcon} from '../../assets/svgs';
import {useNavigation} from '@react-navigation/native';

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

  function handleSubmitEditing() {
    onSubmit(input);
    addToRecentSearches(input);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack}>
        <BackArrowIcon />
      </TouchableOpacity>
      <SearchInput
        containerStyle={styles.searchInput}
        placeholder="Search"
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
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    flexGrow: 1,
    marginRight: 8,
  },
});
