import { GetStaticProps, type NextPage } from "next";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Title, Container, Stack, Table } from "@mantine/core";
import Link from "next/link";
import { AuthMessage } from "~/components/AuthMessage";

// export const getStaticProps: GetStaticProps<{}> = async () => {
//   return { props: {} };
// };

const Profile: NextPage = () => {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<string[]>([]);

  const authenticated = (status === 'authenticated' || status === 'loading');

  useEffect(() => {
    async function getProjects() {
      const result = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`, {
        headers: {
          "Content-Type": "text",
        },
      }).then((res) => { return res.data });
      setProjects(eval(result));
    };
    getProjects();
  }, []);

  async function onSubmit(event: any) {
    const result = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`,
      {
        headers: {
          'Accept': 'text',
        },
      },
    ).then((res) => { return eval(res.data); });
    setProjects(result);
  }

  async function deleteProject(event: any, projectName: string) {
    await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${projectName}`,
      {
        headers: {
          'Accept': 'text',
        },
      },
    );
    const result = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`,
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
      <br />
      <Title align="center">
        Выбор проекта
      </Title>
      <br />
      <AuthMessage session={authenticated} />
      {session && <Container>
        <Stack spacing="md">
          <Button onClick={onSubmit}>Обновить список проектов</Button>
          <Table striped highlightOnHover withBorder withColumnBorders>
            <thead>
              <tr>
                <th>Проект</th>
                <th>Управление</th>
              </tr>
            </thead>
            <tbody>
            {projects.map((project) => (
              <tr key={project}>
                <td>
                  <Link href={{ pathname: "/visualization", query: { projectName: project } }}>
                    <p>{project}</p>
                  </Link>
                </td>
                <td>
                  <Button type="submit" onClick={(e) => {deleteProject(e, project)}}>Удалить</Button>
                </td>
              </tr>
            ))}
            </tbody>
          </Table>
        </Stack>
      </Container>}
    </>
  );
};

export default Profile;


