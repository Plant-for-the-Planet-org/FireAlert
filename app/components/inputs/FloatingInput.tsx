import React, {useState} from 'react';
import {Text, View, Platform, TextInput, StyleSheet} from 'react-native';

import {Colors} from '../../styles';

const TOP = Platform.OS === 'ios' ? -8.2 : -1.6;

const FloatingInput = props => {
  const {
    errors,
    inputStyle,
    onChangeText,
    containerStyle,
    label = 'input',
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
      ]}>
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

      <TextInput
        onBlur={onBlur}
        style={[
          styles.input,
          inputStyle,
          {color: errors ? Colors.ALERT : Colors.BLACK},
        ]}
        onFocus={setIsFocused}
        onChangeText={onChangeText}
        selectionColor={Colors.TEXT_COLOR}
        {...restOfProps}
      />
    </View>
  );
};

export default FloatingInput;

const styles = StyleSheet.create({
  container: {
    width: 311,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
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
});
