import styles from './index.module.css';
import {type NextPage} from 'next';
import Head from 'next/head';
import {VERSION_CONFIG} from '../config/version';

const Home: NextPage = () => {
  const bypassEnabled = process.env.BYPASS_VERSION_CHECK === 'true';

  return (
    <>
      <Head>
        <title>Fire Alert </title>
        <meta name="description" content="FireAlert by Plant-for-the-Planet" />
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.showcaseContainer}>
            <h1 className={styles.showcaseText}>
              This Page is under construction. Find us at{' '}
              <a href="https://plant-for-the-planet.org/firealert">
                plant-for-the-planet.org/firealert
              </a>
            </h1>
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.versionInfo}>
          Version {VERSION_CONFIG.CALVER}
          {bypassEnabled && (
            <span className={styles.bypassWarning}>
              {' '}
              ⚠️ Version checks bypassed
            </span>
          )}
        </div>
      </footer>
    </>
  );
};

export default Home;
