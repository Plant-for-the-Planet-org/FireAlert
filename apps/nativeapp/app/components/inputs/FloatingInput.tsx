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

  let color = Colors.TEXT_COLOR;
  if (errors) {
    color = Colors.ALERT;
  }

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        {borderColor: errors ? Colors.ALERT : Colors.GRAY_MEDIUM},
        verifier && {flexDirection: 'row', alignItems: 'center'},
      ]}>
      {isFloat && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color,
              },
            ]}>
            {label}
          </Text>
        </View>
      )}
      <TextInput
        onBlur={onBlur}
        style={[
          styles.input,
          inputStyle,
          {color: errors ? Colors.ALERT : Colors.BLACK},
          verifier && {width: 240},
        ]}
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
  verified: {
    width: 15,
    height: 15,
    borderRadius: 100,
    backgroundColor: 'green',
  },
});
