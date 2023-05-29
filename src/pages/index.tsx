// @ts-nocheck
import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { Welcome } from '../components/Welcome/Welcome';
import { HeaderSimple, HeaderLinks } from "~/components/HeaderSimple";

const Home: NextPage = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>City-helper</title>
        <meta name="description" content="Помощник в планировании жилищно-коммунальных работ" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HeaderSimple/>
      <Welcome /> 
    </>
  );
};

export default Home;


