import { GetStaticProps, type NextPage } from "next";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import { FileInput, Title, Container, Button, Loader, TextInput, MultiSelect, Grid, Center, Stack, Tabs } from "@mantine/core";
import { useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/router";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import objectTypes from "../data/objectTypes.json";
import { AuthMessage } from "~/components/AuthMessage";
import { IconDatabaseExport, IconDatabaseImport, IconExclamationCircle, IconFileUpload, IconMessageCircle, IconPhoto } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// export const getStaticProps: GetStaticProps<{}> = async () => {
//   return { props: {} };
// };

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

    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/createProject`,
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
    }).catch((err) => {
      notifications.show({
        title: 'Ошибка',
        message: 'Проверьте формат данных',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
      setIsButtonClicked(false);
    } );
  }

  async function onSubmitDB(event: any) {
    if (isButtonClicked) {
      return;
    }
    setIsButtonClicked(true)
    let body = new FormData();
    body.append('projectName', event.projectName);
    body.append('dates', JSON.stringify(event.dates));
    //append a list of string obejctTypes to body
    for (let index = 0; index < event.objectType.length; index+=1) {
      body.append('objectTypes', event.objectType[index]);
    } 

    if (event.unoms) {
      body.append('unoms', event.unoms);
    }

    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/createProjectFromDB`,
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
    }).catch((err) => {
      notifications.show({
        title: 'Ошибка',
        message: 'Проверьте формат данных',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
      setIsButtonClicked(false);
    });
  }

  const dataset_types = ['objects', 'incidents', 'works'];

  const onSubmitToDB = async (event: any) => {
    if (isButtonClicked) {
      return;
    }
    setIsButtonClicked(true)

    let count = 0;

    for (let index = 0; index < dataset_types.length; index+=1) {
      let body = new FormData();
      const element = event[dataset_types[index]];
      if (element === null) {
        continue;
      }
      count += 1;
      body.append('file', element);
      body.append('dataset_type', dataset_types[index]);
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        body,
        {
          headers: {
            'Accept': 'application/json',
          },
        },
      ).then((res) => {
        count -= 1;
      }).catch((err) => {
        notifications.show({
          title: 'Ошибка',
          message: 'Проверьте формат данных. Файлы должны содержать не более 100000 строк',
          color: 'red',
          icon: <IconExclamationCircle />,
          withCloseButton: true,
          autoClose: 5000,
        });
        setIsButtonClicked(false);
      } );
    }
    // sleep until all files are uploaded
    // await new Promise(r => setTimeout(r, 5000));
    if (count === 0) {
      setIsButtonClicked(false);
      notifications.show({
        title: 'Данные загружены',
        message: 'Данные успешно загружены в базу данных',
        icon: <IconDatabaseImport />,
        withCloseButton: true,
        autoClose: 3000,
      });
      form_to_db.reset();
    }
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

  const form_db = useForm({
    initialValues: { 
      unoms: null,
      projectName: "", 
      objectType: ['МКД'],
      dates: [today, todayPlus6Months],
    },
    validateInputOnChange: ['projectName', 'objectType'],
    validateInputOnBlur: ['projectName'],
    clearInputErrorOnChange: true,
    // functions will be used to validate values at corresponding key
    validate: {
      projectName: (value) => {
        if (value.trim() === "") {
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

  const form_to_db = useForm({
    initialValues: { 
      objects: null, incidents: null, works: null
    }
  });

  const authenticated = (status === 'authenticated' || status === 'loading');

  return (
    <>
      <HeadSimple title="Data" />
      <HeaderSimple />
      <br />
      <Title align="center">
        Загрузка данных
      </Title>
      <br />
      <AuthMessage session={authenticated} />
      {session && <>
      <Tabs defaultValue="upload">
        <Tabs.List position="center">
          <Tabs.Tab value="upload" icon={<IconFileUpload size="0.8rem" />}>Загрузка файлов</Tabs.Tab>
          <Tabs.Tab value="from_db" icon={<IconDatabaseExport size="0.8rem" />}>Загрузка из базы данных</Tabs.Tab>
          <Tabs.Tab value="to_db" icon={<IconDatabaseImport size="0.8rem" />}>Загрузка в базу данных</Tabs.Tab>
        </Tabs.List>
      <br />
      <Tabs.Panel value="upload">
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
        </form>
      </Tabs.Panel>
      <Tabs.Panel value="from_db">
        <form onSubmit={form_db.onSubmit(onSubmitDB, () => { })}>
          <Container>
                <Stack spacing="xs">
                  <TextInput
                    id="name"
                    withAsterisk
                    label="Название проекта"
                    placeholder="Введите название проекта"
                    {...form_db.getInputProps('projectName')}
                  />
                  <DatePickerInput label="Период данных" {...form_db.getInputProps('dates')} type="range" 
                    required withAsterisk placeholder="Выберите период данных" id="dates"
                  />
                  <MultiSelect label='Тип объектов' data={objectTypes} {...form_db.getInputProps('objectType')}
                    required withAsterisk placeholder="Выберите тип объектов" disableSelectedItemFiltering
                  />
                  <FileInput
                    placeholder="Выберите файл"
                    label="Список unom (по одному на строку)"
                    name="unoms"
                    {...form_db.getInputProps('unoms')}
                  />
                </Stack>
              <br />
            <Center>
              <Button type="submit">
                {isButtonClicked ? <Loader variant="dots" color="white"/> : <>Отправить</>}
              </Button>
            </Center>
          </Container>
        </form>
      </Tabs.Panel>
      <Tabs.Panel value="to_db">
        <form onSubmit={form_to_db.onSubmit(onSubmitToDB, () => { })}>
          <Container>
                <Stack spacing="xs">
                  <FileInput
                    placeholder="Выберите файл"
                    label="Файл с объектами"
                    accept={acceptedTypes}
                    name="objects"
                    {...form_to_db.getInputProps('objects')}
                  />
                  <FileInput
                    placeholder="Выберите файл"
                    label="Файл с инцидентами"
                    accept={acceptedTypes}
                    name="incidents"
                    {...form_to_db.getInputProps('incidents')}
                  />
                  <FileInput
                    placeholder="Выберите файл"
                    label="Файл с работами по ремонту"
                    accept={acceptedTypes}
                    name="works"
                    {...form_to_db.getInputProps('works')}
                  />
                </Stack>
              <br />
            <Center>
              <Button type="submit">
                {isButtonClicked ? <Loader variant="dots" color="white"/> : <>Отправить</>}
              </Button>
            </Center>
          </Container>
        </form>
      </Tabs.Panel>
      </Tabs>
      </>}
    </>
  );
};

export default Data;

