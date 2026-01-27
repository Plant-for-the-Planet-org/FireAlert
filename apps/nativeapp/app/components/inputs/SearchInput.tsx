import React, {useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {Colors} from '../../styles';

const TOP = Platform.OS === 'ios' ? -8.2 : -8.6;

type Props = TextInputProps & {
  errors?: boolean;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onChangeText: (text: string) => void;
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
    containerStyle,
    onChangeText,
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
        placeholderTextColor={Colors.GRAY_DARK}
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
    // width: SCREEN_WIDTH - 32,
    width: '100%',
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
