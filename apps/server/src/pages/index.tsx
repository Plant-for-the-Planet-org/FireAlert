import styles from "./index.module.css";
import { type NextPage } from "next";
import Head from "next/head";

const Home: NextPage = () => {
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
              This Page is under construction. Find us at <a href="https://plant-for-the-planet.org/firealert">plant-for-the-planet.org/firealert</a>
            </h1>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;



