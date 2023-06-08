import { GetStaticProps, type NextPage } from "next";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import { FileInput, Title, Container, Button, Loader, TextInput, MultiSelect, Grid, Center, Stack } from "@mantine/core";
import { useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/router";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import objectTypes from "../data/objectTypes.json";
import { AuthMessage } from "~/components/AuthMessage";

export const getStaticProps: GetStaticProps<{}> = async () => {
  return { props: {} };
};

function addMonths(date, months) {
  var d = date.getDate();
  date.setMonth(date.getMonth() + +months);
  if (date.getDate() != d) {
    date.setDate(0);
  }
  return date;
}

const Data: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter()
  const [dates, setDates] = useState<[Date | null, Date | null]>([null, null]);
  const [projectName, setProjectName] = useState<string>("");
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  
  // excel or csv
  const acceptedTypes = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv";

  async function onSubmit(event: any) {
    if (isButtonClicked) {
      return;
    }
    setIsButtonClicked(true)
    let body = new FormData();
    for (let index = 0; index < 3; index+=1) {
      console.log(event[`f${index + 1}`]);
      const element = event[`f${index + 1}`];
      body.append('files', element, (index + 1).toString());
      console.log(element, body.values().next().value);
    }
    body.append('dates', JSON.stringify(event.dates));
    body.append('projectName', event.projectName);
    //append a list of string obejctTypes to body
    for (let index = 0; index < event.objectType.length; index+=1) {
      body.append('objectTypes', event.objectType[index]);
    } 

    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
      body,
      {
        headers: {
          'Accept': 'application/json',
        },
      },
    ).then((res) => {
      router.push({
        pathname: "/visualization", 
        query: { projectName: event.projectName }
      });
    });
  }

  const today = new Date();
  const todayPlus6Months = addMonths(new Date(today), 6);

  const form = useForm({
    initialValues: { 
      f1: null, f2: null, f3: null, projectName: "", 
      dates: [today, todayPlus6Months], objectType: ['МКД'] 
    },
    validateInputOnChange: ['projectName', 'f1', 'f2', 'f3', 'objectType'],
    validateInputOnBlur: ['projectName'],
    clearInputErrorOnChange: true,
    // functions will be used to validate values at corresponding key
    validate: {
      dates: (value) => {
        if (value[0] === null || value[1] === null) {
          return 'Обязательное поле';
        }
        return null;
      },
      projectName: (value) => {
        if (value.trim() === "") {
          return 'Обязательное поле';
        }
        return null;
      },
      f1: (value) => {
        if (value === null) {
          return 'Обязательное поле';
        }
        return null;
      },
      f2: (value) => {
        if (value === null) {
          return 'Обязательное поле';
        }
        return null;
      },
      f3: (value) => {
        if (value === null) {
          return 'Обязательное поле';
        }
        return null;
      },
      objectType: (value) => {
        if (value === null || value.length === 0) {
          return 'Обязательное поле';
        } else if (value.length > 0 && !value.includes('МКД')) {
          return 'На данный момент поддерживается только тип объектов МКД';
        }
        return null;
      }
    },
  });

  return (
    <>
      <HeadSimple title="Data" />
      <HeaderSimple />
      <br />
      <Title align="center">
        Загрузка данных
      </Title>
      <br />
      <AuthMessage session={session} />
      {session && <>
      <form onSubmit={form.onSubmit(onSubmit, () => { })}>
        <Container>
          <Grid>
            <Grid.Col span={6}>
              <Stack spacing="xs">
                <FileInput
                  placeholder="Выберите файл"
                  label="Файл с объектами"
                  withAsterisk
                  accept={acceptedTypes}
                  name="f1"
                  {...form.getInputProps('f1')}
                />
                <FileInput
                  placeholder="Выберите файл"
                  label="Файл с инцидентами"
                  withAsterisk
                  accept={acceptedTypes}
                  name="f2"
                  {...form.getInputProps('f2')}
                />
                <FileInput
                  placeholder="Выберите файл"
                  label="Файл с работами по ремонту"
                  withAsterisk
                  accept={acceptedTypes}
                  name="f3"
                  {...form.getInputProps('f3')}
                  required
                />
              </Stack>
            </Grid.Col>
            <Grid.Col span={6}>
              <Stack spacing="xs">
                <TextInput
                  id="name"
                  withAsterisk
                  label="Название проекта"
                  placeholder="Введите название проекта"
                  {...form.getInputProps('projectName')}
                />
                <DatePickerInput label="Период данных" {...form.getInputProps('dates')} type="range" 
                  required withAsterisk placeholder="Выберите период данных" id="dates"
                />
                <MultiSelect label='Тип объектов' data={objectTypes} {...form.getInputProps('objectType')}
                  required withAsterisk placeholder="Выберите тип объектов" disableSelectedItemFiltering
                />
              </Stack>
            </Grid.Col>
          </Grid>
            <br />
          <Center>
            <Button type="submit">
              {isButtonClicked ? <Loader variant="dots" color="white"/> : <>Отправить</>}
            </Button>
          </Center>
        </Container>
      </form></>}
    </>
  );
};

export default Data;

