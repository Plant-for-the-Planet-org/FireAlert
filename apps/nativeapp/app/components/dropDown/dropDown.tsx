import React, {useState} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import {Colors, Typography} from '../../styles';

interface IDropDownProps {
  label?: string;
  items: any;
  value?: any;
  style?: any;
  setValue?: any;
  setItems?: any;
  placeholder?: string;
  expandHeight?: number;
  onSelectItem?: any;
}

const schema = {
  label: 'name',
};

const DropDown = ({
  label = '',
  items,
  value,
  style,
  setValue,
  setItems,
  placeholder,
  expandHeight = 30,
  onSelectItem,
  ...props
}: IDropDownProps) => {
  const [expandPadding, setExpandPadding] = useState(false);
  const [open, setOpen] = useState(false);

  const onOpen = () => setExpandPadding(true);
  const onClose = () => setExpandPadding(false);
  return (
    <View
      style={[
        styles.container,
        {paddingBottom: expandPadding ? expandHeight : 0},
      ]}>
      {label !== '' ? <Text style={styles.label}>{label}</Text> : null}
      <DropDownPicker
        {...props}
        open={open}
        value={value}
        items={items}
        schema={schema}
        onOpen={onOpen}
        onClose={onClose}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder={placeholder}
        onSelectItem={onSelectItem}
        textStyle={styles.textStyle}
        dropDownDirection={'BOTTOM'}
        style={[styles.dropDown, style]}
        listItemLabelStyle={styles.listItemLabelStyle}
        selectedItemLabelStyle={styles.selectedItemLabelStyle}
        dropDownContainerStyle={styles.dropDownContainerStyle}
      />
    </View>
  );
};

export default DropDown;

const styles = StyleSheet.create({
  label: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  container: {
    width: '100%',
    marginTop: 20,
  },
  dropDown: {
    height: 55,
    marginTop: 10,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 18,
    borderColor: Colors.GRAY_MEDIUM,
  },
  dropDownContainerStyle: {
    marginTop: 8,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingHorizontal: 8,
    borderColor: Colors.GRAY_MEDIUM,
  },
  listItemLabelStyle: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_18,
  },
  selectedItemLabelStyle: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  textStyle: {
    color: Colors.BLACK,
    fontSize: Typography.FONT_SIZE_18,
  },
});
