import {
  Text,
  View,
  Platform,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native';
import React, {useState} from 'react';

import {Colors} from '../../styles';

const TOP = Platform.OS === 'ios' ? -8.2 : -8.6;
const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = TextInputProps & {
  errors?: boolean;
  inputStyle?: any;
  onChangeText: (text: string) => void;
  containerStyle?: any;
  label?: string;
  placeholder?: string;
  verifier?: boolean;
  verified?: boolean;
  isFloat?: boolean;
  value?: string;
};

const SearchInput = (props: Props) => {
  const {
    errors,
    inputStyle,
    onChangeText,
    containerStyle,
    label = '',
    placeholder = '',
    verifier = false,
    verified = false,
    isFloat = true,

    ...restOfProps
  } = props;
  const [isFocused, setIsFocused] = useState(false);
  const onBlur = () => setIsFocused(false);

  const containerStyles = [
    styles.container,
    containerStyle,
    errors ? styles.errorBorder : styles.grayBorder,
    verifier && styles.verifierContainer,
  ];

  const labelStyles = [
    styles.label,
    {color: errors ? Colors.ALERT : Colors.TEXT_COLOR},
  ];

  const inputStyles = [
    styles.input,
    {color: errors ? Colors.ALERT : Colors.BLACK},
    inputStyle,
    verifier && styles.verifierInput,
  ];

  return (
    <View style={containerStyles}>
      {/* {isFloat && (
        <View style={styles.labelContainer}>
          <Text style={labelStyles}>{label}</Text>
        </View>
      )} */}
      <TextInput
        onBlur={onBlur}
        style={inputStyles}
        placeholder={placeholder}
        onFocus={setIsFocused}
        onChangeText={onChangeText}
        selectionColor={Colors.TEXT_COLOR}
        {...restOfProps}
      />
      {verifier ? (
        !verified ? (
          <ActivityIndicator color={Colors.PRIMARY} />
        ) : (
          <View style={styles.verified} />
        )
      ) : null}
    </View>
  );
};

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH - 32,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
    marginVertical: 5,
    alignSelf: 'center',
  },
  errorBorder: {
    borderColor: Colors.ALERT,
  },
  grayBorder: {
    borderColor: Colors.GRAY_MEDIUM,
  },
  verifierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    top: TOP,
    left: 10,
    position: 'absolute',
    paddingHorizontal: 5,
    backgroundColor: Colors.WHITE,
  },
  label: {
    fontSize: 12,
  },
  input: {
    height: 50,
    fontSize: 16,
  },
  verifierInput: {
    width: 240,
  },
  verified: {
    width: 15,
    height: 15,
    borderRadius: 100,
    backgroundColor: 'green',
  },
});
