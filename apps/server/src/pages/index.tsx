import styles from "./index.module.css";
import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCookies } from "react-cookie"


import { api } from "../utils/api";
import Sites from "../Components/Site/SiteComponent";

const Home: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <>
      <Head>
        <title>Fire Alert Next</title>
        <meta name="description" content="Frontend demo for FireAlert T3 stack" />
        <link rel="icon" href="https://play-lh.googleusercontent.com/H1lnAWzD9x9uCyEWfjTz2-Ub1zHLhvSj29P_ZsWpFXKiB92pWAuKSk0wk3OhYarQzvM6=w240-h480-rw" />
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.showcaseContainer}>
            <h1 className={styles.showcaseText}>
              Fire Alert Dummy Frontend
            </h1>
            <AuthShowcase />
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();


  return (
    <div className={styles.authContainer}>
      <p className={styles.showcaseText}>
        {sessionData && <span>Logged in as {sessionData.user.email} </span>}
      </p>
      <Sites />
      <button
        className={styles.loginButton}
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};



