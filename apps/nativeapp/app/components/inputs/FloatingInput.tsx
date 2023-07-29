import {
  Text,
  View,
  Platform,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import React, {useState} from 'react';

import {Colors} from '../../styles';

const TOP = Platform.OS === 'ios' ? -8.2 : -8.6;
const SCREEN_WIDTH = Dimensions.get('window').width;

const FloatingInput = props => {
  const {
    errors,
    inputStyle,
    onChangeText,
    containerStyle,
    label = 'input',
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

  const labelStyles = [styles.label, {color: errors ? Colors.ALERT : Colors.TEXT_COLOR}];

  const inputStyles = [
    styles.input,
    inputStyle,
    {color: errors ? Colors.ALERT : Colors.BLACK},
    verifier && styles.verifierInput,
  ];

  return (
    <View style={containerStyles}>
      {isFloat && (
        <View style={styles.labelContainer}>
          <Text style={labelStyles}>{label}</Text>
        </View>
      )}
      <TextInput
        onBlur={onBlur}
        style={inputStyles}
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

export default FloatingInput;

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
    fontSize: 18,
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
