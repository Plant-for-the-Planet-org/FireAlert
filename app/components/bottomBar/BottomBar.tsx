import {
  Text,
  View,
  Platform,
  Animated,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import * as shape from 'd3-shape';
import React, {useEffect, useState} from 'react';
import Svg, {Path, SvgXml} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';

import {
  MapIcon,
  ListIcon,
  uploadIcon,
  polygonIcon,
  locationIcon,
} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {plusIcon} from '../../assets/svgs/plusIcon';

let {width, height} = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';

const buttonWidth = 64;
const buttonGutter = 10;
const extraHeight = IS_ANDROID ? 0 : 20;
const tabbarHeight = 60 + extraHeight;

const tabWidth = buttonWidth + buttonGutter * 2;
width = (width - tabWidth) / 2;
const curveHeight = tabbarHeight - (22 + extraHeight);

const getPath = (): string => {
  const left = shape
    .line()
    .x(d => d[0])
    .y(d => d[1])([
    [0, 0],
    [width - 5, 0],
  ]);

  const tab = shape
    .line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(shape.curveBasis)([
    [width - 5, 0],
    [width, 0],
    [width + 5, 5],
    [width + 7, curveHeight / 2],
    [width + tabWidth / 2 - 16, curveHeight],
    [width + tabWidth / 2 + 16, curveHeight],
    [width + tabWidth - 7, curveHeight / 2],
    [width + tabWidth - 5, 5],
    [width + tabWidth, 0],
    [width + 5 + tabWidth, 0],
  ]);

  const right = shape
    .line()
    .x(d => d[0])
    .y(d => d[1])([
    [width + 5 + tabWidth, 0],
    [width * 2 + tabWidth, 0],
    [width * 2 + tabWidth, tabbarHeight],
    [0, tabbarHeight],
    [0, 0],
  ]);
  return `${left} ${tab} ${right}`;
};

const d = getPath();

interface IBottomBarProps {
  onMapPress: any;
  onListPress: any;
}

const AddOptions = ({onReqClose, onPressCallback}) => {
  const navigation = useNavigation();
  const addOptions = [
    {
      svgXML: locationIcon,
      title: 'Select Location',
      onPress: () => {
        navigation.navigate('SelectLocation');
        onPressCallback();
      },
    },
    {
      svgXML: polygonIcon,
      title: 'Create Polygon',
      onPress: () => {
        navigation.navigate('CreatePolygon');
        onPressCallback();
      },
    },
    {
      svgXML: uploadIcon,
      title: 'Upload Polygon',
      onPress: () => {},
    },
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onReqClose}
      style={styles.addOptionsParent}>
      <View style={styles.addOptionsContainer}>
        {addOptions.length > 0
          ? addOptions.map((option: any, index: number) => (
              <View
                key={`addOption${index}`}
                style={styles.addButtonOptionWrap}>
                <TouchableOpacity
                  onPress={option.onPress}
                  style={styles.addButtonOption}>
                  <View style={styles.icon}>
                    <SvgXml xml={option.svgXML} />
                  </View>
                  <Text style={styles.text}>{option.title}</Text>
                </TouchableOpacity>
                {addOptions.length - 1 !== index && (
                  <View style={styles.separator} />
                )}
              </View>
            ))
          : []}
      </View>
    </TouchableOpacity>
  );
};

const BottomBar = ({
  onMapPress: onMenuPress,
  onListPress: onTreeInventoryPress,
}: IBottomBarProps) => {
  const [selected, setSelected] = useState(0);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [spinValue] = useState(new Animated.Value(0));

  useEffect(() => {
    return () => setShowAddOptions(false);
  }, []);

  // Next, interpolate beginning and end values (in this case 0 and 1)
  // if Clockwise icon will rotate clockwise, else anti-clockwise
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '225deg'],
  });

  const animatedScaleStyle = {
    transform: [{rotate: spin}],
  };

  const onAddPress = () => {
    setShowAddOptions(!showAddOptions);
    Animated.spring(
      spinValue, // The animated value to drive
      {
        toValue: showAddOptions ? 0 : 1,
        useNativeDriver: true,
      },
    ).start();
  };

  const handleMap = () => {
    setSelected(0);
    onMenuPress();
  };

  const handleList = () => {
    // setSelected(1);
    onTreeInventoryPress();
  };

  return (
    <>
      <View style={styles.bottomBarContainer}>
        <Svg
          width={width * 2 + tabWidth}
          height={tabbarHeight}
          style={styles.bottomBar}
          strokeWidth="1"
          stroke={Colors.GRAY_LIGHT}>
          <Path {...{d}} fill={Colors.WHITE} />
        </Svg>
        {/* add button */}
        <TouchableOpacity style={styles.addButton} onPress={() => onAddPress()}>
          <Animated.View style={animatedScaleStyle}>
            <SvgXml xml={plusIcon} />
          </Animated.View>
        </TouchableOpacity>

        {/* map button */}
        <TouchableOpacity
          style={[styles.left, styles.tabButton]}
          onPress={handleMap}>
          <View style={styles.tabIconCon}>
            <MapIcon
              fill={!selected ? Colors.DEEP_PRIMARY : Colors.TEXT_COLOR}
            />
            <Text
              style={[
                styles.tabText,
                {color: !selected ? Colors.DEEP_PRIMARY : Colors.TEXT_COLOR},
              ]}>
              Map
            </Text>
          </View>
        </TouchableOpacity>

        {/* project list button */}
        <TouchableOpacity
          style={[styles.right, styles.tabButton]}
          onPress={handleList}>
          <View style={styles.tabIconCon}>
            <ListIcon
              fill={selected ? Colors.DEEP_PRIMARY : Colors.TEXT_COLOR}
            />
            <Text
              style={[
                styles.tabText,
                {color: selected ? Colors.DEEP_PRIMARY : Colors.TEXT_COLOR},
              ]}>
              Settings
            </Text>
          </View>
        </TouchableOpacity>
        <SafeAreaView style={styles.safeArea} />
      </View>
      {showAddOptions ? (
        <AddOptions onReqClose={onAddPress} onPressCallback={onAddPress} />
      ) : (
        []
      )}
    </>
  );
};

export default BottomBar;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.WHITE,
  },
  bottomBar: {
    backgroundColor: 'transparent',
  },
  bottomBarContainer: {
    bottom: 0,
    position: 'absolute',
  },
  menuDash: {
    height: 3,
    borderRadius: 10,
    backgroundColor: Colors.TEXT_COLOR,
  },
  tabButton: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    marginBottom: IS_ANDROID ? 0 : 6,
  },
  firstDash: {
    width: 16,
  },
  secondDash: {
    width: 24,
    marginTop: 6,
  },
  // 60 = height of menu container + 2 * padding
  left: {
    left: 55,
    bottom: (tabbarHeight - 60) / 2,
    padding: 7.5,
  },
  // 60 = height of menu container + 2 * padding
  right: {
    right: 55,
    bottom: (tabbarHeight - 60) / 2,
    padding: 7.5,
  },
  tabText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_COLOR,
    marginTop: 4,
  },
  tabIconCon: {
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: tabbarHeight - buttonWidth / 2,
    width: buttonWidth,
    height: buttonWidth,
    borderRadius: 60,
    backgroundColor: Colors.DEEP_PRIMARY,
    left: width + buttonGutter,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionsParent: {
    position: 'absolute',
    bottom: tabbarHeight + 42,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height,
  },
  addOptionsContainer: {
    width: 257,
    borderRadius: 14,
    marginBottom: 130,
    backgroundColor: Colors.WHITE,
    justifyContent: 'center',
    alignItems: 'flex-start',
    elevation: 4,
  },
  addButtonOptionWrap: {
    borderRadius: 8,
  },
  addButtonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    height: 48,
    width: 48,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontSize: Typography.FONT_SIZE_18,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_COLOR,
  },
  separator: {
    height: 1,
    width: 257,
    backgroundColor: Colors.GRAY_LIGHT,
  },
});
