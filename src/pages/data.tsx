import { type NextPage } from "next";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import { FileInput, Title, Container, Button, Input, Group, Loader } from "@mantine/core";
import { useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/router";
import { DatePicker } from "@mantine/dates";

const Data: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter()
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const [projectName, setProjectName] = useState<string>("");
  const [isButtonClicked, setIsButtonClicked] = useState(false);

  if (status === "loading") {
    return <p>Loading...</p>
  }

  if (status === "unauthenticated") {
    return <p>Access Denied</p>
  }
  
  const acceptedTypes = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

  async function onSubmit(event: any) {
    event.preventDefault()
    const files = event.target
    let body = new FormData();
    setIsButtonClicked(true)
    console.log(event);
    // return;
    for (let index = 0; index < 3; index+=1) {
      const element = files[2 * index + 1].files[0];
      body.append('files', element, (index + 1).toString());
      console.log(element, body.values().next().value);
    }
    body.append('dates', JSON.stringify(dates));
    body.append('projectName', projectName);
    console.log(...body);
    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
      body,
      {
        headers: {
          'Accept': 'application/json',
          // 'Content-Type': 'multipart/form-data'
        },
      },
    ).then((res) => { console.log(res) });

    router.push({
      pathname: "/visualization", 
      query: { projectName: projectName }
    });
  }

  return (
    <>
      <HeadSimple title="Data" />
      <HeaderSimple />
      <Title align="center">
        Загрузка данных
      </Title>
      <Container>
        <form onSubmit={onSubmit}>
          <FileInput
            // placeholder="Выберите файл"
            label="Файл с объектами"
            withAsterisk
            // accept={acceptedTypes}
            name="f1"
          />
          <FileInput
            // placeholder="Выберите файл"
            label="Файл с инцидентами"
            withAsterisk
            // accept={acceptedTypes}
            name="f2"
          />
          <FileInput
            // placeholder="Выберите файл"
            label="Файл с работами по ремонту"
            withAsterisk
            // accept={acceptedTypes}
            name="f3"
          />
          <Input.Wrapper
            id="name"
            withAsterisk
            label="Название проекта (латиницей без пробелов)"
          >
            <Input id="input-demo" value={projectName} onChange={(event) => setProjectName(event.currentTarget.value)} />
          </Input.Wrapper>
          <DatePicker type="range" value={dates} onChange={setDates} />
          <Group>
            <Button type="submit">
              Отправить
            </Button>
            {isButtonClicked && <Title align="center"><Container><Loader variant="dots" /></Container></Title>}
          </Group>
        </form>
      </Container>
    </>
  );
};

export default Data;

