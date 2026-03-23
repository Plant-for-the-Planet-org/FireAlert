import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SiteIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';

interface SiteProject {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string | null;
  project?: SiteProject | null;
}

interface AlertSiteSectionProps {
  site: Site;
}

export const AlertSiteSection: React.FC<AlertSiteSectionProps> = ({site}) => {
  return (
    <View style={[styles.alertLocInfoCon, styles.alertLocInfoConWithMargin]}>
      <View style={styles.satelliteInfoLeft}>
        <View style={styles.satelliteIcon}>
          <SiteIcon />
        </View>
        {site?.project ? (
          <View style={styles.satelliteInfo}>
            <Text style={styles.satelliteLocText}>PROJECT</Text>
            <Text style={styles.alertLocText}>
              {site.project.name}{' '}
              <Text style={{fontSize: Typography.FONT_SIZE_12}}>
                {site.name}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={styles.satelliteInfo}>
            <Text style={styles.satelliteLocText}>SITE</Text>
            <Text style={styles.alertLocText}>{site?.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  alertLocInfoConWithMargin: {
    marginTop: 30,
    justifyContent: 'space-between',
  },
  satelliteInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  satelliteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.GRADIENT_PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  satelliteInfo: {
    flex: 1,
  },
  satelliteLocText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  alertLocText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
});
