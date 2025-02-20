import React, {useState} from 'react';
import {View} from 'react-native';
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
  const [input, setInput] = useState(value);

  function handleSubmitEditing() {
    onSubmit(input);
    addToRecentSearches(input);
  }

  return (
    <View>
      <SearchInput
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
