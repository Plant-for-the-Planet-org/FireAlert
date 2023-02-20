import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import React, {useState} from 'react';
import {DropdownArrow} from '../../assets/svgs';

import {Switch} from '../../components';
import {Colors, Typography} from '../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const PROJECTS = [
  {
    id: 1,
    name: 'Yucatan Restoration',
    enabled: true,
    sites: [
      {
        id: 1,
        name: 'Las Americas 1',
        radius: 100,
      },
      {
        id: 2,
        name: 'Las Americas 2',
        radius: 10,
      },
      {
        id: 3,
        name: 'Las Americas 3',
        radius: null,
      },
    ],
  },
  {
    id: 2,
    name: 'Volcano Valley',
    enabled: false,
    sites: null,
  },
];

const RADIUS_ARR = [
  {name: 'within 100 km', value: 100},
  {name: 'within 10 km', value: 10},
  {name: 'inside', value: null},
];

const Settings = () => {
  const [projects, setProjects] = useState(PROJECTS);
  const [dropDownModal, setDropDownModal] = useState(false);
  const [pageXY, setPageXY] = useState(null);

  const handleSwitch = (index, val) => {
    let arr = [...projects];
    arr[index].enabled = val;
    setProjects(arr);
  };

  const handleSelectRadius = val => {
    let arr = [...projects];
    const filteredProjects = arr.findIndex(({id}) => id === pageXY.projectId);
    const filteredSites = arr[filteredProjects].sites?.findIndex(
      ({id}) => id === pageXY.siteId,
    );
    arr[filteredProjects].sites[filteredSites].radius = val;
    setProjects(arr);
    setDropDownModal(false);
  };

  const handleRadius = (evt, projectId, siteId) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      projectId,
      siteId,
    });
    setDropDownModal(!dropDownModal);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* my projects */}
      <View style={[styles.myProjects, styles.commonPadding]}>
        <Text style={styles.mainHeading}>
          My Projects{' '}
          <Text style={styles.ppLink}>
            {' '}
            via <Text style={styles.underLine}>pp.eco</Text>{' '}
          </Text>
        </Text>
        {PROJECTS.map((item, index) => (
          <View key={`projects_${index}`} style={styles.projectsInfo}>
            <View style={styles.projectsNameInfo}>
              <Text style={styles.projectsName}>{item.name}</Text>
              <Switch
                value={item.enabled}
                onValueChange={val => handleSwitch(index, val)}
              />
            </View>
            {item.enabled && item.sites
              ? item.sites.map((sites, index) => (
                  <View key={`sites_${index}`} style={styles.sitesInProjects}>
                    <Text style={styles.sitesName}>{sites.name}</Text>
                    <TouchableOpacity
                      onPress={evt => handleRadius(evt, item.id, sites.id)}
                      style={styles.dropDownRadius}>
                      <Text style={styles.siteRadius}>
                        {sites.radius ? `within ${sites.radius} km` : 'inside'}
                      </Text>
                      <DropdownArrow />
                    </TouchableOpacity>
                  </View>
                ))
              : null}
          </View>
        ))}
      </View>
      {dropDownModal ? (
        <>
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setDropDownModal(false)}
          />
          <View
            style={[
              styles.dropDownModal,
              {
                top: pageXY.y + 15,
                right: 40,
              },
            ]}>
            {RADIUS_ARR.map((item, index) => (
              <TouchableOpacity
                key={`RADIUS_ARR_${index}`}
                onPress={() => handleSelectRadius(item.value)}>
                <Text style={styles.siteRadiusText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commonPadding: {
    paddingHorizontal: 30,
  },
  mainHeading: {
    fontSize: Typography.FONT_SIZE_24,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  ppLink: {
    fontSize: Typography.FONT_SIZE_18,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
  },
  underLine: {
    textDecorationLine: 'underline',
  },
  myProjects: {},
  projectsInfo: {
    padding: 15,
    marginTop: 17,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.GRAY_MEDIUM,
  },
  projectsNameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectsName: {
    fontSize: Typography.FONT_SIZE_18,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  sitesInProjects: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  sitesName: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  siteRadius: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRADIENT_PRIMARY,
  },
  dropDownRadius: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDownModal: {
    top: 100,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderWidth: 1,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_MEDIUM,
  },
  overlay: {
    height: SCREEN_WIDTH,
    width: SCREEN_HEIGHT,
    position: 'absolute',
  },
  siteRadiusText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.BLACK,
    paddingVertical: 5,
  },
});
