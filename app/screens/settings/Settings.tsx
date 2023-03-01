import {
  Text,
  View,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import React, {useState} from 'react';

import {
  AddIcon,
  SmsIcon,
  NasaLogo,
  BellIcon,
  PhoneIcon,
  CrossIcon,
  GlobeIcon,
  EmailIcon,
  PlanetLogo,
  PencilIcon,
  DistanceIcon,
  WhatsAppIcon,
  DropdownArrow,
  MapOutlineIcon,
  TrashOutlineIcon,
  BackArrowIcon,
} from '../../assets/svgs';
import {
  editSite,
  getSites,
  deleteSite,
} from '../../redux/slices/sites/siteSlice';
import {Colors, Typography} from '../../styles';
import {useAppDispatch, useAppSelector} from '../../hooks';
import {CustomButton, FloatingInput, Switch} from '../../components';

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
    enabled: false,
  },
  {
    id: 2,
    email: 'john12@gmail.com',
    enabled: true,
  },
  {
    id: 3,
    email: 'xodd@gmail.com',
    enabled: false,
  },
];

const WHATSAPP_CONTACT = [
  {
    id: 1,
    contact: '9887333334',
    enabled: false,
  },
  {
    id: 2,
    contact: '8873333346',
    enabled: true,
  },
  {
    id: 3,
    contact: '8867333346',
    enabled: true,
  },
];

const Settings = ({navigation}) => {
  const [projects, setProjects] = useState(PROJECTS);
  const [mySites, setMySites] = useState(MY_SITES);
  const [whatsapp, setWhatsapp] = useState(WHATSAPP_CONTACT);
  const [dropDownModal, setDropDownModal] = useState(false);
  const [sitesInfoModal, setSitesInfoModal] = useState(false);
  const [siteNameModalVisible, setSiteNameModalVisible] = useState(false);
  const [selectedSiteInfo, setSelectedSiteInfo] = useState(null);
  const [pageXY, setPageXY] = useState(null);
  const [mobileNotify, setMobileNotify] = useState(false);
  const [emails, setEmails] = useState(EMAILS);
  const [siteName, setSiteName] = useState('');
  const [siteGuid, setSiteGuid] = useState('');

  const {sites} = useAppSelector(state => state.siteSlice);
  const dispatch = useAppDispatch();

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

  const handleEmailNotify = (index, val) => {
    let emailArr = [...emails];
    emailArr[index].enabled = val;
    setEmails(emailArr);
  };

  const handleRemoveEmail = index => {
    let emailArr = [...emails];
    emailArr.splice(index, 1);
    setEmails(emailArr);
  };

  const handleWhatsappNotify = (index, val) => {
    let whatsappArr = [...whatsapp];
    whatsappArr[index].enabled = val;
    setWhatsapp(whatsappArr);
  };

  const handleRemoveWhatsapp = index => {
    let whatsappArr = [...whatsapp];
    whatsappArr.splice(index, 1);
    setWhatsapp(whatsappArr);
  };

  const handleSiteInformation = item => {
    setSelectedSiteInfo(item);
    setSitesInfoModal(!sitesInfoModal);
  };

  const handleEditSite = site => {
    setSitesInfoModal(false);
    setSiteName(site.name);
    setSiteGuid(site.guid);
    setSiteNameModalVisible(true);
  };

  const handleEditSiteInfo = () => {
    const payload = {
      name: siteName,
      guid: siteGuid,
    };
    const request = {
      payload,
      onSuccess: () => {
        const req = {
          onSuccess: () => {},
          onFail: () => {},
        };
        setTimeout(() => {
          dispatch(getSites(req));
        }, 500);
      },
      onFail: () => {},
    };
    dispatch(editSite(request));
    setSiteNameModalVisible(false);
  };

  const handleAddEmail = () => {
    navigation.navigate('Verification', {
      verificationType: 'Email',
    });
  };

  const handleAddSms = () => {
    navigation.navigate('Verification', {
      verificationType: 'Sms',
    });
  };

  const handleAddWhatsapp = () => {
    navigation.navigate('Verification', {
      verificationType: 'Whatsapp',
    });
  };

  const handleDeleteSite = guid => {
    const request = {
      params: guid,
      onSuccess: () => {},
      onFail: () => {},
    };
    dispatch(deleteSite(request));
  };

  const handleBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* my projects */}
        <View style={[styles.myProjects, styles.commonPadding]}>
          <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
            <BackArrowIcon />
          </TouchableOpacity>
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
          <View style={styles.mySitesHead}>
            <Text style={styles.mainHeading}>My Sites</Text>
          </View>
          {sites.map((item, index) => (
            <TouchableOpacity
              onPress={() => handleSiteInformation(item)}
              key={`mySites_${index}`}
              style={styles.mySiteNameContainer}>
              <Text style={styles.mySiteName}>{item.name || item.guid}</Text>
              <TouchableOpacity
                onPress={evt => handleSiteRadius(evt, item.guid)}
                style={[styles.dropDownRadius, {paddingHorizontal: 15}]}>
                <Text style={styles.siteRadius}>
                  {!(item.radius === 'inside')
                    ? `within ${item.radius}`
                    : 'inside'}
                </Text>
                <DropdownArrow />
              </TouchableOpacity>
            </TouchableOpacity>
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
          {/* emails */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <EmailIcon />
                <Text style={[styles.smallHeading, {marginLeft: 13}]}>
                  Email
                </Text>
              </View>
              <TouchableOpacity onPress={handleAddEmail}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.emailContainer}>
              {emails.map((item, i) => (
                <View
                  key={`emails_${i}`}
                  style={[
                    styles.emailSubContainer,
                    {justifyContent: 'space-between'},
                  ]}>
                  <View style={styles.emailSubContainer}>
                    <TouchableOpacity onPress={() => handleRemoveEmail(i)}>
                      <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
                    </TouchableOpacity>
                    <Text style={[styles.mySiteName, {marginLeft: 10}]}>
                      {item?.email}
                    </Text>
                  </View>
                  <Switch
                    value={item.enabled}
                    onValueChange={val => handleEmailNotify(i, val)}
                  />
                </View>
              ))}
            </View>
          </View>
          {/* whatsapp */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <WhatsAppIcon />
                <Text style={[styles.smallHeading, {marginLeft: 13}]}>
                  WhatsApp
                </Text>
              </View>
              <TouchableOpacity onPress={handleAddWhatsapp}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.emailContainer}>
              {whatsapp.map((item, i) => (
                <View
                  key={`emails_${i}`}
                  style={[
                    styles.emailSubContainer,
                    {justifyContent: 'space-between'},
                  ]}>
                  <View style={styles.emailSubContainer}>
                    <TouchableOpacity onPress={() => handleRemoveWhatsapp(i)}>
                      <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
                    </TouchableOpacity>
                    <Text style={[styles.mySiteName, {marginLeft: 10}]}>
                      {item?.contact}
                    </Text>
                  </View>
                  <Switch
                    value={item.enabled}
                    onValueChange={val => handleWhatsappNotify(i, val)}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.mySiteNameContainer}>
            <View style={styles.mobileContainer}>
              <SmsIcon />
              <Text style={[styles.smallHeading, {marginLeft: 13}]}>Sms</Text>
            </View>
            <TouchableOpacity onPress={handleAddSms}>
              <AddIcon />
            </TouchableOpacity>
          </View>
        </View>
        {/* Warning */}
        <View style={styles.warningContainer}>
          <Text style={styles.warningHeading}>
            ⚠️ Warning{'\n'} Not all fires detected
          </Text>
          <Text style={styles.warningText}>
            You should not rely on FireAlert exclusively. Many fires will not be
            detected by the system, for instance if is cloudy or the fire is
            relatively small.
          </Text>
          <Text style={styles.warningText}>
            Active fire/thermal anomalies may be from fire, hot smoke,
            agriculture, gas flares, volcanoes or other sources. FAQs
          </Text>
          <Text style={styles.warningText}>
            Sun glint or bright water can cause false alarms.
          </Text>
          <Text style={styles.warningText}>
            Fires must be relatively large to be detected by the main systems.
            For instance, MODIS usually detects both flaming and smouldering
            fires 1000 m2 in size. Under ideal conditions, flaming fires one
            tenth this size can be detected.
          </Text>
        </View>
        {/* geoStationary */}
        <View style={[styles.myNotifications, styles.commonPadding]}>
          <View style={styles.geostationaryContainer}>
            <Text style={styles.mainHeading}>Geostationary</Text>
            <Switch
              value={mobileNotify}
              onValueChange={val => setMobileNotify(val)}
            />
          </View>
          <Text style={styles.desc}>
            Quick but many false alarms{' '}
            <Text style={{color: Colors.GRADIENT_PRIMARY}}>[BETA] </Text>
          </Text>
          <View style={styles.geostationaryInfoContainer}>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every 10 to 15 min</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~30 min alert delay</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>2–4.5 km resolution</Text>
            </View>
          </View>
        </View>
        {/* Polar-Orbiting Satellites */}
        <View style={[styles.myNotifications, styles.commonPadding]}>
          <Text style={styles.mainHeading}>Polar-Orbiting Satellites</Text>
          <Text style={styles.desc}>Delayed detection but very reliable</Text>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.desc}>VIIRS</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks Eevery ~12 hours</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>
                ~3h alert delay globally (1-30 min in US and Canada)
              </Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>375m resolution</Text>
            </View>
          </View>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.desc}>MODIS</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every 1-2 days</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~3-5h alert delay (NRT)</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>1km resolution</Text>
            </View>
          </View>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.desc}>LANDSAT</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every ~8 days</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~30 min alert delay</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>30m resolution</Text>
            </View>
          </View>
        </View>
        {/* warning */}
        <View style={styles.warningContainer}>
          <View style={styles.warningSubContainer}>
            <PlanetLogo />
            <Text style={styles.warningText2}>
              <Text style={styles.primaryUnderline}>FireAlert</Text> is a
              project of the{' '}
              <Text style={styles.primaryUnderline}>
                Plant-for-the-Planet Foundation
              </Text>
              , a non-profit organisation dedicated to restoring and conserving
              the world’s forests.{'\n\n'}
              <Text>
                By using this app, you agree to our{' '}
                <Text style={styles.primaryUnderline}>Terms & Conditions</Text>.
                <Text style={styles.primaryUnderline}> Disclaimer</Text>.
              </Text>
            </Text>
          </View>
          <View style={[styles.warningSubContainer, {marginTop: 50}]}>
            <NasaLogo />
            <Text style={styles.warningText2}>
              We gratefully acknowledge the use of data and from NASA's{' '}
              <Text style={styles.primaryUnderline}>
                {' '}
                Information for Resource Management System (FIRMS)
              </Text>
              , part of NASA's Earth Observing System Data and Information
              System (EOSDIS). {'\n\n'}We thank the scientists and engineers who
              built <Text style={styles.primaryUnderline}>MODIS, VIIRS</Text>{' '}
              and <Text style={styles.primaryUnderline}>Landsat</Text>. We
              appreciate NASA’s dedication to sharing data. This project is not
              affiliated with NASA.{' '}
              <Text style={styles.primaryUnderline}>FIRMS Disclaimer</Text>. 
            </Text>
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
        {/* site information modal */}
        <Modal visible={sitesInfoModal} animationType={'slide'} transparent>
          <TouchableOpacity
            activeOpacity={0}
            onPress={() => setSitesInfoModal(false)}
            style={styles.modalLayer}
          />
          <View style={[styles.modalContainer, styles.commonPadding]}>
            <View style={styles.modalHeader} />
            <View style={styles.siteTitleCon}>
              <Text style={styles.siteTitle}>
                {selectedSiteInfo?.name || selectedSiteInfo?.guid}
              </Text>
              <TouchableOpacity
                onPress={() => handleEditSite(selectedSiteInfo)}>
                <PencilIcon />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btn}>
              <MapOutlineIcon />
              <Text style={styles.siteActionText}>View on Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteSite(selectedSiteInfo?.guid)}
              style={styles.btn}>
              <TrashOutlineIcon />
              <Text style={styles.siteActionText}>Delete Site</Text>
            </TouchableOpacity>
          </View>
        </Modal>
        <Modal
          visible={siteNameModalVisible}
          animationType={'slide'}
          transparent>
          <View style={styles.siteModalStyle}>
            <FloatingInput
              value={siteName}
              label={'Site Name'}
              onChangeText={setSiteName}
            />
            <CustomButton
              title="Continue"
              onPress={handleEditSiteInfo}
              style={styles.btnContinueSiteModal}
              titleStyle={styles.title}
            />
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    position: 'absolute',
    height: SCREEN_HEIGHT / 3,
    backgroundColor: Colors.WHITE,
  },
  modalLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 13,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
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
  backIcon: {
    width: 40,
    height: 25,
    paddingRight: 20,
    marginBottom: 10,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
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
  mySiteNameMainContainer: {
    marginTop: 17,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.GRAY_MEDIUM,
    justifyContent: 'space-between',
  },
  mySiteNameSubContainer: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  emailContainer: {
    padding: 16,
  },
  emailSubContainer: {
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningContainer: {
    marginTop: 35,
    padding: 35,
    backgroundColor: Colors.GRADIENT_PRIMARY + '12',
  },
  warningSubContainer: {
    flexDirection: 'row',
  },
  warningHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  warningText: {
    marginTop: 30,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  warningText2: {
    width: 240,
    marginLeft: 10,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  geostationaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desc: {
    marginTop: 7,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  geostationaryInfoContainer: {
    marginTop: 20,
  },
  iconContainer: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  geoDesc: {
    marginLeft: 15,
  },
  primaryUnderline: {
    textDecorationLine: 'underline',
    color: Colors.GRADIENT_PRIMARY,
  },
  siteTitleCon: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteTitle: {
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  btn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  btnContinueSiteModal: {
    marginTop: 18,
  },
  title: {
    color: Colors.WHITE,
  },
});
