import axios from "axios";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import Papa from "papaparse";
import { Accordion, Button, Container, Divider, Grid, Group, List, Loader, MultiSelect, RangeSlider, ScrollArea, Stack, Switch, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import React from 'react';
import { GoogleMap, InfoWindow, LoadScript, MarkerF } from '@react-google-maps/api';
import { useSession } from "next-auth/react";
import { CSVLink } from 'react-csv';
import filters from '../data/filters.json';
import jobs from '../data/jobs.json';


const alertFeature: string = "appeals_count";
const alertFeatureThreshold: number = 0;

const jobList = jobs.map((item) => {
    return { label: item.substring(0, 100), value: item }}).sort((a, b) => a.label.localeCompare(b.label));

//convert filters to array
const filtersArray = Object.keys(filters).map((key) => {
  return { name: key, type: filters[key].type, bounds: filters[key].bounds }
}).sort((a, b) => (a.type < b.type) ? 1 : -1);

const containerStyle = {
  width: '400px',
  height: '400px'
};

const center = {
  lat: 55.644466,
  lng: 37.395744
};

const Mapss: any = ({ result, setResult, reloadFlag, setReloadFlag, projectName }) => {
  const onLoad = (marker: any) => {
    // console.log('marker: ', marker)
  }

  const [selectedCenter, setSelectedCenter] = useState(null);
  const [jobsToAdd, setJobsToAdd] = useState([]);
  const [changes, setChanges] = useState([]);
  const [filterBounds, setFilterBounds] = useState(filters);
  const [alertIgnore, setAlertIgnore] = useState(0);

  const filteredResults = result.filter((item: any) => (Object.keys(filterBounds).map((key) => {
    return { name: key, type: filters[key].type, bounds: filterBounds[key].bounds }
  })
    .map(filter => (filter.type === 'float') ? (item[filter.name] >= filter.bounds[0] && item[filter.name] <= filter.bounds[1]) : (filter.bounds.includes(item[filter.name])))).every(item => item === true));
  
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
          <MultiSelect key={filter.name} data={filter.bounds} label={filter.name} value={filterBounds[filter.name]['bounds']}
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

  //result array to object
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
    let newResult = resultObject[unom].target.concat(jobsToAdd);
    resultObject[unom].target = newResult;
    setResult(Object.values(resultObject));
    setJobsToAdd([]);
  }

  //object list with accordion
  const objectList = filteredResults.map((item: any) => (
    <Accordion.Item value={"f" + item.unom}>
      <Accordion.Control onClick={() => { setAlertIgnore(0); }}>{item.description}</Accordion.Control>
      <Accordion.Panel>
        {//print all attributes of selected object
          Object.keys(item).map((key) => {
            if (key === 'target') {
              return <><b>работы</b>:<List>
                {item[key].map((target: string) => { 
                  return <List.Item><Stack spacing="xs" align="flex-start">
                    {target} 
                    <Button onClick={() => deleteJob(item.unom, target)}>Удалить работу</Button>
                  </Stack></List.Item>
                })}
              </List>
              <br />
              <Stack align="flex-start">
                  <MultiSelect data={jobList.filter((job) => !item[key].includes(job.value))
                  } value={jobsToAdd} onChange={setJobsToAdd} dropdownPosition="bottom"
                    label="Выберите работы, которые, на ваш взгляд, следует добавить &nbsp; &nbsp; &nbsp;"
                  />
                <Button onClick={() => {addJobs(item.unom)}}>Добавить работы</Button>
              </Stack>
              </>
              } else if (["description", "object_type"].some((element) => element === key)) {
            return (<Text>
              <b>{key}</b>: {item[key]}
            </Text>
          )}
        })}
        <br />
        <Button onClick={() => deleteElement(item.unom)}>Удалить объект</Button>
        {(alertIgnore == 1) && <Stack>
          <Text>Вы уверены, что хотите удалить объект? По нему поступило много жалоб.</Text>
          <Button onClick={() => { setAlertIgnore(2); deleteElement(item.unom); }}>Удалить объект</Button>
        </Stack>}
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

  const uploadCorrectedResults = (e) => {
    e.preventDefault();
    const formData = new FormData();
    //convert result to FormData csv file and append to formData
    const csvRows = [];
    const headers = Object.keys(result[0]);
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
    })
  }





  console.log(result);
  return (
    <>
      <Grid>
        <Grid.Col span="auto">
          <Container>
            <Stack spacing="xxxs">
              {filterElements}
            </Stack>
          </Container>
        </Grid.Col>
        <Grid.Col span="auto">
          <Container>
            <Text><h3>Управление</h3></Text>
            <Group>
              <CSVLink data={filteredResults} filename="results.csv" 
                style={{ textDecoration: "none", color: "white" }} onclick="location.href='#'"><Button>Скачать CSV</Button></CSVLink>
              <form onSubmit={uploadCorrectedResults}><Button type="submit">Сохранить на сервере</Button></form>
            </Group>
          </Container>
          <Container>
            <Text><h3>Отключить фактор модели</h3></Text>
            <Stack>
              {switchElements}
            </Stack>
          </Container>
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
                    {//print all attributes of selected object
                      Object.keys(resultObject[selectedCenter.unom]).map((key) => {
                        if (key === 'target') {
                          return <><b>{key}</b>:<List>
                            {resultObject[selectedCenter.unom][key].map((target: string) => {
                              return <List.Item><Stack spacing="xs" align="flex-start">
                                {target}
                                <Button onClick={() => deleteJob(selectedCenter.unom, target)}>Удалить работу</Button>
                              </Stack></List.Item>
                            })}
                          </List>
                            <br />
                            <Stack align="flex-start">
                              <MultiSelect data={jobList.filter((job) => !resultObject[selectedCenter.unom][key].includes(job.value))
                              } value={jobsToAdd} onChange={setJobsToAdd} dropdownPosition="bottom"
                                label="Выберите работы, которые, на ваш взгляд, следует добавить &nbsp; &nbsp; &nbsp;"
                              />
                              <Button onClick={() => { addJobs(selectedCenter.unom) }}>Добавить работы</Button>
                            </Stack>
                          </>
                        } else if (["description", "object_type"].some((element) => element === key)) {
                          return (<Text>
                            <b>{key}</b>: {resultObject[selectedCenter.unom][key]}
                          </Text>
                          )
                        }
                      })}
                    <br />
                    <Button onClick={() => deleteElement(selectedCenter.unom)}>Удалить объект</Button>
                    {(alertIgnore == 1) && <Stack>
                      <Text>Вы уверены, что хотите удалить объект? По нему поступило много жалоб.</Text>
                      <Button onClick={() => { setAlertIgnore(2); deleteElement(selectedCenter.unom); }}>Удалить объект</Button>
                    </Stack>}
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

  const router = useRouter();
  const { projectName } = router.query;
  console.log(projectName);
  const [result, setResult] = useState<any>(null);
  const resultProps: resultPropsType = { result, setResult };
  const [isLoading, setLoading] = useState(true);
  const [reloadFlag, setReloadFlag] = useState(false);

  useEffect(() => {
    async function getResult(projectName: string) {
      const result = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/result/${projectName}`, {
        headers: {
          "Content-Type": "text/tsv",
        },
      }).then((res) => { return res.data }).then((res) => { return Papa.parse(
        res, { header: true, dynamicTyping: true }).data.map((item: any) => {
          item.target = (item.target !== "") ? eval(item.target) : [];
          return item;
         }).filter((item: any) => item.unom !== null).sort((a, b) => (a.description > b.description) ? 1 : -1)});
      if (result) {
        console.log(result);
      }
      setResult(result);
      setLoading(false);
    };
    getResult(projectName as string);
  }, [reloadFlag]);


  console.log(result);


  return (
    <>
      <HeadSimple title="Visualization" />
      <HeaderSimple />
      {isLoading && <Title align="center"><Container><Loader variant="dots" /></Container></Title>}
      {!isLoading && <Mapss result={result} setResult={setResult} reloadFlag={reloadFlag}
        setReloadFlag={setReloadFlag} projectName={projectName} />}
    </>
  );
};

export default Visualization;