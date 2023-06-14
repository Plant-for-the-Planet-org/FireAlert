import styles from "./index.module.css";
import { type NextPage } from "next";
import Head from "next/head";
import LoginButton from "src/UI/components/LoginButton";

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
            <LoginButton />
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;
