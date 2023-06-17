import styles from './index.module.css';
import {type NextPage} from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Fire Alert Next</title>
        <meta
          name="description"
          content="Frontend demo for FireAlert T3 stack"
        />
        <link
          rel="icon"
          href="https://play-lh.googleusercontent.com/H1lnAWzD9x9uCyEWfjTz2-Ub1zHLhvSj29P_ZsWpFXKiB92pWAuKSk0wk3OhYarQzvM6=w240-h480-rw"
        />
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.showcaseContainer}>
            <h1 className={styles.showcaseText}>Fire Alert Dummy Frontend</h1>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;
