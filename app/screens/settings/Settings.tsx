import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import React, {useState} from 'react';

import {Switch} from '../../components';
import {Colors, Typography} from '../../styles';
import {AddIcon, DropdownArrow, EmailIcon, PhoneIcon} from '../../assets/svgs';

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

const MY_SITES = [
  {id: 1, name: 'Balam Kú Sur', radius: 100, enabled: false},
  {id: 2, name: 'Balam Kú Norte', radius: 100, enabled: false},
];

const RADIUS_ARR = [
  {name: 'within 100 km', value: 100},
  {name: 'within 10 km', value: 10},
  {name: 'inside', value: null},
];

const EMAILS = [
  {
    id: 1,
    email: 'mah@gmail.com',
  },
  {
    id: 2,
    email: 'john12@gmail.com',
  },
  {
    id: 3,
    email: 'xodd@gmail.com',
  },
];

const Settings = () => {
  const [projects, setProjects] = useState(PROJECTS);
  const [mySites, setMySites] = useState(MY_SITES);
  const [dropDownModal, setDropDownModal] = useState(false);
  const [pageXY, setPageXY] = useState(null);
  const [mobileNotify, setMobileNotify] = useState(false);
  const [emails, setEmails] = useState(EMAILS);

  const handleSwitch = (index, val) => {
    let arr = [...projects];
    arr[index].enabled = val;
    setProjects(arr);
  };

  const handleSelectRadius = val => {
    if (pageXY.projectId) {
      let arr = [...projects];
      const filteredProjects = arr.findIndex(({id}) => id === pageXY.projectId);
      const filteredSites = arr[filteredProjects].sites?.findIndex(
        ({id}) => id === pageXY.siteId,
      );
      arr[filteredProjects].sites[filteredSites].radius = val;
      setProjects(arr);
    } else {
      let arr = [...mySites];
      const filteredSite = arr.findIndex(({id}) => id === pageXY.siteId);
      arr[filteredSite].radius = val;
      arr[filteredSite].enabled = true;
      setMySites(arr);
    }
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

  const handleSiteRadius = (evt, siteId) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      siteId,
    });
    setDropDownModal(!dropDownModal);
  };

  const handleAddSites = () => {};

  const handleAddEmail = () => {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* my projects */}
        <View style={[styles.myProjects, styles.commonPadding]}>
          <Text style={styles.mainHeading}>
            My Projects{' '}
            <Text style={styles.ppLink}>
              {' '}
              via <Text style={styles.underLine}>pp.eco</Text>{' '}
            </Text>
          </Text>
          {projects.map((item, index) => (
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
                          {sites.radius
                            ? `within ${sites.radius} km`
                            : 'inside'}
                        </Text>
                        <DropdownArrow />
                      </TouchableOpacity>
                    </View>
                  ))
                : null}
            </View>
          ))}
        </View>
        {/* my sites */}
        <View style={[styles.mySites, styles.commonPadding]}>
          <TouchableOpacity style={styles.mySitesHead} onPress={handleAddSites}>
            <Text style={styles.mainHeading}>My Sites</Text>
            <AddIcon />
          </TouchableOpacity>
          {mySites.map((item, index) => (
            <View style={styles.mySiteNameContainer}>
              <Text style={styles.mySiteName}>{item.name}</Text>
              <TouchableOpacity
                onPress={evt => handleSiteRadius(evt, item.id)}
                style={styles.dropDownRadius}>
                <Text style={styles.siteRadius}>
                  {item.enabled
                    ? item.radius
                      ? `within ${item.radius} km`
                      : 'inside'
                    : 'off'}
                </Text>
                <DropdownArrow />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {/* notifications */}
        <View style={[styles.myNotifications, styles.commonPadding]}>
          <Text style={styles.mainHeading}>Notifications</Text>
          <View style={styles.mySiteNameContainer}>
            <View style={styles.mobileContainer}>
              <PhoneIcon />
              <Text style={[styles.smallHeading, {marginLeft: 13}]}>
                Mobile
              </Text>
            </View>
            <Switch
              value={mobileNotify}
              onValueChange={val => setMobileNotify(val)}
            />
          </View>
          <View style={styles.mySiteNameContainer}>
            <View style={styles.mobileContainer}>
              <EmailIcon />
              <Text style={[styles.smallHeading, {marginLeft: 13}]}>Email</Text>
            </View>
            <TouchableOpacity onPress={handleAddEmail}>
              <AddIcon />
            </TouchableOpacity>
          </View>
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
      </ScrollView>
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
  myProjects: {
    marginTop: 20,
  },
  mySites: {
    marginTop: 50,
  },
  myNotifications: {
    marginTop: 50,
  },
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
  mySitesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mySiteNameContainer: {
    padding: 16,
    marginTop: 17,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.GRAY_MEDIUM,
    justifyContent: 'space-between',
  },
  mySiteName: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.BLACK,
    paddingVertical: 5,
  },
  smallHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    paddingVertical: 5,
  },
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
