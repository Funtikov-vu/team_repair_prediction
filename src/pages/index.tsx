import { GetStaticProps, type NextPage } from "next";
import Head from "next/head";
import { Welcome } from '../components/Welcome/Welcome';
import { HeaderSimple } from "~/components/HeaderSimple";

// export const getStaticProps: GetStaticProps<{}> = async () => {
//   return { props: { } };
// };

const Home: NextPage = () => {
  
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


