import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { Welcome } from '../components/Welcome/Welcome';
import { HeaderSimple, HeaderLinks } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Title, Text, Container, Stack } from "@mantine/core";
import Link from "next/link";

const Profile: NextPage = () => {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<string[]>([]);
  console.log(projects);

  if (status === "loading") {
    return <p>Loading...</p>
  }

  if (status === "unauthenticated") {
    return <p>Access Denied</p>
  }

  // useEffect(() => {
  //   async function getProjects() {
  //     const result = await axios.get(`http://127.0.0.1:8000/files`, {
  //       headers: {
  //         "Content-Type": "text",
  //       },
  //     }).then((res) => { return res.data });
  //     setProjects(eval(result));
  //   };
  //   getProjects();
  // }, []);

  async function onSubmit(event: any) {
    const result = await axios.get("http://127.0.0.1:8000/files",
      {
        headers: {
          'Accept': 'text',
        },
      },
    ).then((res) => { return eval(res.data); });
    setProjects(result);
  }

  console.log(projects);

  return (
    <>
      <HeadSimple title="Profile" />
      <HeaderSimple />
      <Title align="center">
        Выбор проекта
      </Title>
      <br />
      <Container>
        <Stack>
          <Button onClick={onSubmit}>Получить список проектов</Button>
          <div>
            {projects.map((project) => (
              <Link href={{ pathname: "/visualization", query: { projectName: project } }}>
                <p>{project}</p>
              </Link>
            ))}
          </div>
        </Stack>
      </Container>
    </>
  );
};

export default Profile;


