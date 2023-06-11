import axios from "axios";
import { GetStaticProps, type NextPage } from "next";
import { useRouter } from "next/router";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import Papa from "papaparse";
import { Accordion, Button, Container, Divider, Flex, Grid, Group, List, Loader, Modal, MultiSelect, RangeSlider, ScrollArea, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import React from 'react';
import { GoogleMap, InfoWindow, LoadScript, MarkerF } from '@react-google-maps/api';
import { useSession } from "next-auth/react";
import { CSVLink } from 'react-csv';
import filters from '../data/filters.json';
import jobs from '../data/jobs.json';
import { AuthMessage } from "~/components/AuthMessage";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCloudUpload, IconSearch, IconUpload } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { get } from "http";

// export const getStaticProps: GetStaticProps<{}> = async () => {
//   return { props: {} };
// };

const WORK_WEIGHTS = {
  "ремонт крыши": 10,
  "ремонт внутридомовых инженерных систем горячего водоснабжения (стояки)": 9,
  "ремонт внутридомовых инженерных систем теплоснабжения (стояки)": 9,
  "ремонт внутридомовых инженерных систем газоснабжения": 9,
  "ремонт внутридомовых инженерных систем электроснабжения": 8,
  "замена лифтового оборудования": 0.8,
  "ремонт внутридомовых инженерных систем водоотведения (канализации) (стояки)": 8,
  "ремонт внутридомовых инженерных систем холодного водоснабжения (стояки)": 8,
  "ремонт пожарного водопровода": 7,
  "ремонт фасадов": 7,
  "ремонт внутридомовых инженерных систем водоотведения (канализации) (выпуски и сборные трубопроводы)": 7,
  "ремонт внутридомовых инженерных систем горячего водоснабжения (разводящие магистрали)": 6,
  "ремонт внутридомовых инженерных систем холодного водоснабжения (разводящие магистрали)": 6,
  "ремонт внутридомовых инженерных систем теплоснабжения (разводящие магистрали)": 6,
  "ремонт подъездов, направленный на восстановление их надлежащего состояния и проводимый при выполнении иных работ по капитальному ремонту общего имущества в многоквартирном доме": 5,
  "ремонт внутреннего водостока": 5,
  "ремонт подвальных помещений, относящихся к общему имуществу в многоквартирном доме": 1,
  "ремонт мусоропровода": 3,
  "замена оконных блоков, расположенных в помещениях общего пользования": 2
}

const alertFeature: string = "appeals_count";
const alertFeatureThreshold: number = 200;

const alertFeatureJobDeletion: string = "appeals_count";
const alertFeatureThresholdJobDeletion: number = 300;

const getObjectWeight = (object: any) => {
  try {
    return object['p'].reduce((acc, cur, i) => acc + cur * WORK_WEIGHTS[object['target'][i]], 0);
  } catch {
    console.log(object);
    return object[alertFeature]; 
  }
  
}

const jobList = jobs.map((item) => {
    return { label: item.substring(0, 100), value: item }}).sort((a, b) => a.label.localeCompare(b.label));

const containerStyle = {
  width: '400px',
  height: '400px'
};

const center = {
  lat: 55.644466,
  lng: 37.395744
};


const Maps: any = ({ result, setResult, reloadFlag, setReloadFlag, projectName, filterBounds, setFilterBounds,
  filterBoundsLimits, setFilterBoundsLimits }) => {
  const onLoad = (marker: any) => {}

  //convert filters to array
  const filtersArray = Object.keys(filterBoundsLimits).map((key) => {
    return { name: key, type: filterBoundsLimits[key].type, bounds: filterBoundsLimits[key].bounds }
  }).sort((a, b) => (a.type < b.type) ? 1 : -1);

  if (!result)
    return (<></>);

  const [selectedCenter, setSelectedCenter] = useState(null);
  const [jobsToAdd, setJobsToAdd] = useState([]);
  const [changes, setChanges] = useState([]);
  const [alertIgnore, setAlertIgnore] = useState(0);
  const [stringToSearch, setStringToSearch] = useState('');
  const [top10, setTop10] = useState(false);

  let filteredResults = result.filter((item: any) => (Object.keys(filterBounds).map((key) => {
    return { name: key, type: filterBounds[key].type, bounds: filterBounds[key].bounds }
  })
    .map(filter => (filter.type === 'float') ? (item[filter.name] >= filter.bounds[0] && item[filter.name] <= filter.bounds[1]) : (filter.bounds.includes(item[filter.name])))).every(item => item === true)
  ).sort((a, b) => (a.description > b.description) ? 1 : -1).sort((a, b) => (getObjectWeight(a) < getObjectWeight(b)) ? 1 : -1);

  if (top10) {
    filteredResults = filteredResults.slice(0, 10);
  }
  
  if (stringToSearch.length > 1) {
    filteredResults = filteredResults.filter((item: any) => item.description.toLowerCase().includes(stringToSearch.toLowerCase()));
  }

  const Markers = filteredResults.map((item: any) => (
    <MarkerF clickable onLoad={onLoad} position={{ lat: item.lat, lng: item.lng }} key={item.unom}
      onClick={(props) => {
        setSelectedCenter({ 
          latitude: item.lat, longitude: item.lng, description: item.description, unom: item.unom,
        });
      }}
    />
  ));

  const changeFilterBounds = (filterName, e) => {
    setFilterBounds({
      ...filterBounds,
      [filterName]: {type: filterBounds[filterName].type, bounds: e },
    });
    setCurrentFilter(null);
    console.log(filterBounds);
  }

  const [currentFilter, setCurrentFilter] = useState(null);
  console.log(filterBoundsLimits);
  const filterElements = filtersArray.map((filter) => {
    return (<>
      { (filter.type === 'float') &&
        <>
          <Text>{filter.name}</Text>
        <RangeSlider key={filter.name} min={filter.bounds[0]} max={filter.bounds[1]} 
            minRange={0.1} onChangeEnd={(e) => changeFilterBounds(filter.name, e)}
            defaultValue={filter.bounds}
            name={currentFilter}
            onClick={() => setCurrentFilter(filter.name)}/>
        </>
      }
      { (filter.type === 'string') &&
        <MultiSelect searchable limit={20} key={filter.name} data={filter.bounds} label={filter.name} value={filterBounds[filter.name]['bounds']}
            onChange={(e) => changeFilterBounds(filter.name, e)}
            defaultValue={filter.bounds}
            name={currentFilter}
            onClick={() => setCurrentFilter(filter.name)}/>
      }
    </>
    );
  });

  const switchElements = filtersArray.map((filter) => {
    return (
      <Switch key={filter.name} value={filter.name} label={filter.name} name={filter.name} onChange={(e) => {
        () => {}}} defaultChecked />
    );
  });

  let resultObject = result.reduce((acc: any, item: any) => {
    acc[item.unom] = item;
    return acc;
  }, {});

  const deleteElement = (unom: number) => {
    console.log(reloadFlag);
    console.log(alertIgnore);
    if ((alertIgnore == 0) && (result.filter((item: any) => item.unom === unom)[0][alertFeature] >= alertFeatureThreshold)) {
      setAlertIgnore(1);
      return;
    }
    setResult(result.filter((item: any) => item.unom !== unom));
    setSelectedCenter(null);
    setChanges(changes.filter((item: any) => item.unom !== unom).concat({ unom: unom, target: [] }));
    setAlertIgnore(0);
  }

  const deleteJob = (unom: number, target: string) => {
    // find index of object in array resultObject[unom].target
    let index = resultObject[unom].target.indexOf(target);
    // delete element from array resultObject[unom].p
    resultObject[unom].p.splice(index, 1);
    let newResult = resultObject[unom].target.filter((item: any) => item !== target);
    if (newResult.length === 0) {
      deleteElement(unom);
      return;
    }
    resultObject[unom].target = newResult;
    setResult(Object.values(resultObject));
    setChanges(changes.filter((item: any) => item.unom !== unom).concat({ unom: unom, target: newResult }));
  }

  const addJobs = (unom: number) => {
    let newResult = jobsToAdd.concat(resultObject[unom].target);
    //mean of array p
    const prob = resultObject[unom].p.reduce((a, b) => a + b, 0) / resultObject[unom].p.length;
    let newP = [prob].concat(resultObject[unom].p);
    resultObject[unom].target = newResult;
    resultObject[unom].p = newP;
    setResult(Object.values(resultObject));
    setJobsToAdd([]);
  }

  //object list with accordion
  const objectList = filteredResults.map((item: any) => (
    <Accordion.Item value={"f" + item.unom}>
      <Accordion.Control onClick={() => { setAlertIgnore(0); }}>{item.description}</Accordion.Control>
      <Accordion.Panel>
        <Stack align='flex-start'>
        <Stack align="flex-start">
          <Group>
            <Button color={alertIgnore == 1 ? 'red' : "blue"} 
              onClick={() => {
                if (alertIgnore == 1) 
                  setAlertIgnore(2);
                deleteElement(item.unom)
              }}
            >Удалить объект</Button>
            {(alertIgnore == 1) && <Button onClick={() => {setAlertIgnore(0)}}>Отмена</Button>}
          </Group>
          {(alertIgnore == 1) && <>
            <Text>Вы уверены, что хотите удалить объект? По нему поступило много жалоб.</Text>
          </>}
        </Stack>
        <b>Работы:</b><List>
            {item['target'].map((target: string) => { 
              return <List.Item><Stack spacing="xs" align="flex-start">
                {target} 
                <Button onClick={() => deleteJob(item.unom, target)}>Удалить работу</Button>
              </Stack></List.Item>
            })}
          </List>
          <br />
          <Group position='left' grow>
              <MultiSelect miw={370} data={jobList.filter((job) => !item['target'].includes(job.value))
              } value={jobsToAdd} onChange={setJobsToAdd} dropdownPosition="bottom"
                placeholder="Выберите работы, которые следует добавить &nbsp; &nbsp; &nbsp;"
              />
              <Button maw={170} onClick={() => {addJobs(item.unom)}}>Добавить работы</Button>
          </Group>
          </Stack>
        <br />
      </Accordion.Panel>
    </Accordion.Item>
  ));
 
  const [heatmap, setHeatmap] = useState(null); // heatmap html file
  // get heatmap html file from backend and return the html as text 
  useEffect(() => {
    async function getHeatmap() {
      const result = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/heatmap/${projectName}`, {
      responseType: 'text',
    })
      .then((res) => {
        return res.data;
      })
    setHeatmap(result); 
    return result;
    }
    if (result != null)
      getHeatmap();
  }, [])

  const sendCorrectedResults = () => {
    const formData = new FormData();
    //convert result to FormData csv file and append to formData
    const csvRows = [];
    let headers = Object.keys(result[0]);
    //swap last two elements
    [headers[headers.length - 1], headers[headers.length - 2]] = [headers[headers.length - 2], headers[headers.length - 1]];
    csvRows.push(headers.join(','));
    for (const row of result) {
      const values = headers.map(header => {
        const val = row[header]
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvBody = csvRows.join('\n');
    formData.append('file', new Blob([csvBody]), 'results.csv');
    console.log(...formData);
    //send formData to backend
    axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/uploadCorrectedResults/${projectName}`, formData, {
      headers: {
        'Content-Type': 'text/csv'
      }
    });
  }

  const uploadCorrectedResults = (e) => {
    e.preventDefault();
    sendCorrectedResults();
    notifications.show({
      message: 'Результаты сохранены на сервере', 
      title: 'Успешно', 
      withCloseButton: true,
      autoClose: 3000,
      icon: <IconCloudUpload />,
    });
  }

  const markToRetrain = () => {
    sendCorrectedResults();
    axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/markToRetrain/${projectName}`);
    notifications.show({
      message: 'Данные отправлены на переобучение',
      title: 'Успешно',
      withCloseButton: true,
      autoClose: 3000,
      icon: <IconCheck />,
    });
  }



  console.log(result);
  return (
    <>
      <Grid>
        <Grid.Col span="auto">
          <Container>
            <Stack spacing="xxxs">
              {filterElements}
              <Divider my="sm" />
              <TextInput
                placeholder="Начните ввод адреса"
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  if (value.length > 1 || value == '')
                    setStringToSearch(value)
                }}
                icon={<IconSearch />}
              />
            </Stack>
          </Container>
        </Grid.Col>
        <Grid.Col span="auto">
          <Stack align='flex-start'>
            <h3 style={{marginBottom: -5}}>Управление</h3>
            <Group>
              <CSVLink data={filteredResults.map(({p, ...rest}) => rest)} filename="results.csv" 
                style={{ textDecoration: "none", color: "white" }} onclick="location.href='#'"><Button>Скачать CSV</Button></CSVLink>
              <form onSubmit={uploadCorrectedResults}><Button type="submit">Сохранить на сервере</Button></form>
            </Group>
            <Button onClick={markToRetrain}>Использовать данные для переобучения моделей</Button>
            {/* button to show top-10 results */}
            <Button onClick={() => {
              setTop10(!top10);
            } }>Показать {!top10 ? 'топ-10' : 'всё'}</Button>
          </Stack>
          {/* <Container>
            <Text><h3>Отключить фактор модели</h3></Text>
            <Stack>
              {switchElements}
            </Stack>
          </Container> */}
        </Grid.Col>
      </Grid>
      <Grid>
        <Grid.Col span="auto">
          <Container>
            {selectedCenter &&
              <Accordion defaultValue="f1">
                <Accordion.Item value="f1">
                <Accordion.Control onClick={() => { setAlertIgnore(0); }}>{resultObject[selectedCenter.unom].description}</Accordion.Control>
                  <Accordion.Panel>
                    {/* <Modal opened={modalOpen === item.unom} onClose={closeModal} title="Информация об объекте"
          id={item.unom}>
          <ObjectInfo unom={item.unom} />
          {item.description}
        </Modal> */}
                    <Stack align='flex-start'>
                      {/* <Button onClick={() => openModal(item.unom)}>Информация об объекте. Предыдущие инциденты и работы</Button> */}
                      <Stack align="flex-start">
                        <Group>
                          <Button color={alertIgnore == 1 ? 'red' : "blue"}
                            onClick={() => {
                              if (alertIgnore == 1)
                                setAlertIgnore(2);
                              deleteElement(selectedCenter.unom)
                            }}
                          >Удалить объект</Button>
                          {(alertIgnore == 1) && <Button onClick={() => { setAlertIgnore(0) }}>Отмена</Button>}
                        </Group>
                        {(alertIgnore == 1) && <>
                          <Text>Вы уверены, что хотите удалить объект? По нему поступило много жалоб.</Text>
                        </>}
                      </Stack>
                      <b>Работы:</b><List>
                        {resultObject[selectedCenter.unom]['target'].map((target: string) => {
                          return <List.Item><Stack spacing="xs" align="flex-start">
                            {target}
                            <Button onClick={() => deleteJob(selectedCenter.unom, target)}>Удалить работу</Button>
                          </Stack></List.Item>
                        })}
                      </List>
                      <br />
                      <Group position='left' grow>
                        <MultiSelect miw={370} data={jobList.filter((job) => !resultObject[selectedCenter.unom]['target'].includes(job.value))
                        } value={jobsToAdd} onChange={setJobsToAdd} dropdownPosition="bottom"
                          placeholder="Выберите работы, которые следует добавить &nbsp; &nbsp; &nbsp;"
                        />
                        <Button maw={170} onClick={() => { addJobs(selectedCenter.unom) }}>Добавить работы</Button>
                      </Group>
                    </Stack>
                    <br />
                  </Accordion.Panel>
                </Accordion.Item>
               </Accordion>
            }
            <Divider my="sm" />
            <ScrollArea w={700} h={1000}>
              <Stack>
                <Accordion defaultValue="customization">
                  {objectList}
                </Accordion>
              </Stack>
            </ScrollArea>
          </Container>
        </Grid.Col>

        <Grid.Col span="auto">
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            // libraries={["visualization"]}
          >
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={9}
            >
              {Markers}
              {selectedCenter && (
                <InfoWindow
                  onCloseClick={() => {
                    setSelectedCenter(null);
                    // setResult(result.splice(0, 1));
                  }}
                  position={{
                    lat: selectedCenter.latitude,
                    lng: selectedCenter.longitude
                  }}
                >
                  <div>
                    {selectedCenter.description}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          <br />
          <iframe src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/heatmap/` + projectName} width="80%" height="40%" id={heatmap}></iframe>
          {/* <div className="text-container" dangerouslySetInnerHTML={{ __html: heatmap }} /> */}
        </Grid.Col>
      </Grid>
    </>
  )};
    
type resultPropsType = {
  result: any;
  setResult: React.Dispatch<any>;
};

const Visualization: NextPage = () => {
  const { data: session, status } = useSession();
  const authenticated = (status === "authenticated" || status === "loading");

  const router = useRouter();
  const { projectName } = router.query;
  console.log(projectName);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setLoading] = useState(true);
  const [reloadFlag, setReloadFlag] = useState(false);
  const [filterBounds, setFilterBounds] = useState(filters);
  const [filterBoundsLimits, setFilterBoundsLimits] = useState(filters);

  useEffect(() => {
    async function getResult(projectName: string) {
      if (!session) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setReloadFlag(!reloadFlag);
        return;
      }
      const result = await axios({method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/result/${projectName}`, 
        headers: {
          "Content-Type": "text/tsv",
        },
      }).then((res) => { return res.data }).then((res) => { return Papa.parse(
        res, { header: true, dynamicTyping: true }).data.map((item: any) => {
          item.target = (item.target !== "") ? eval(item.target) : [];
          try {
            item.p = (item.p !== "") ? eval(item.p) : [];
            // make p elements float
            item.p = item.p.map((p: any) => parseFloat(p));
          } catch (e) {}
          return item;
         }).filter((item: any) => item.unom !== null).sort((a, b) => (a.description > b.description) ? 1 : -1)})
         .catch((err) => { console.log(err); } );

      // append file="bounds.json" to the request to get bounds
      const bounds = await axios({
        method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/files?file=bounds.json&projectName=${projectName}`,
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => { return res.data }).then((res) => { 
        // {"appeals_count": {"type": "float", "bounds": ["116", "591"]}, "works_count": {"type": "float", "bounds": ["0", "5"]}, "Серия проекта": {"type": "string", "bounds": ["П-3/16", "МГ-601", "П-30"]}}
        //convert bounds to int
        for (let key in res) {
          if (res[key].type == "float") {
            res[key].bounds = res[key].bounds.map((item: string) => parseFloat(item));
          }
        }
        console.log(res);
        return res 
      }).catch((err) => { console.log(err); } );

      if (result) {
        setResult(result);
        setFilterBounds(bounds);
        setFilterBoundsLimits(bounds);
        setLoading(false);
      } else {
        setReloadFlag(!reloadFlag);
      }
    };
    getResult(projectName as string);
  }, [reloadFlag]);

  return (
    <>
      <HeadSimple title="Visualization" />
      <HeaderSimple />
      <AuthMessage session={authenticated} />
      {session && isLoading && <Title align="center"><Container><Loader variant="dots" /></Container></Title>}
      {session && !isLoading && <Maps result={result} setResult={setResult} reloadFlag={reloadFlag}
        setReloadFlag={setReloadFlag} projectName={projectName} filterBounds={filterBounds} setFilterBounds={setFilterBounds}
        filterBoundsLimits={filterBoundsLimits} setFilterBoundsLimits={setFilterBoundsLimits} />}
    </>
  );
};

export default Visualization;