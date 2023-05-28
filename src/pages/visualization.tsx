import axios from "axios";
import { NextComponentType, type NextPage } from "next";
import { useRouter } from "next/router";
import { HeaderSimple } from "~/components/HeaderSimple";
import HeadSimple from "~/components/HeadSimple";
import Papa from "papaparse";
import { Accordion, Box, Button, Container, Divider, Flex, Grid, Group, List, Loader, Modal, MultiSelect, RangeSlider, ScrollArea, Stack, Switch, Text } from "@mantine/core";
import { PropsWithChildren, use, useEffect, useState } from "react";
import React, { Component } from 'react';
import { GoogleMap, InfoWindow, LoadScript, Marker, MarkerF, HeatmapLayerF, HeatmapLayer } from '@react-google-maps/api';
import { set } from "zod";
import fileDownload from 'js-file-download'
import Script from "next/script";
import { useSession } from "next-auth/react";
import { CSVLink, CSVDownload } from 'react-csv';


const fetcher = (url: string) => axios.get(url).then(res => res.data)

const alertFeature: string = "appeals_count";
const alertFeatureThreshold: number = 0;

const jobList = ['замена лифтового оборудования',
  'ремонт внутридомовых инженерных систем водоотведения (канализации) (выпуски и сборные трубопроводы)',
  'ремонт внутридомовых инженерных систем теплоснабжения (разводящие магистрали)',
  'ремонт внутридомовых инженерных систем холодного водоснабжения (разводящие магистрали)',
  'ремонт внутридомовых инженерных систем горячего водоснабжения (разводящие магистрали)',
  'ремонт подвальных помещений, относящихся к общему имуществу в многоквартирном доме',
  'ремонт внутридомовых инженерных систем газоснабжения',
  'ремонт подъездов, направленный на восстановление их надлежащего состояния и проводимый при выполнении иных работ по капитальному ремонту общего имущества в многоквартирном доме',
  'ремонт фасадов', 'ремонт крыши',
  'ремонт внутридомовых инженерных систем электроснабжения',
  'ремонт мусоропровода',
  'замена оконных блоков, расположенных в помещениях общего пользования',
  'ремонт внутридомовых инженерных систем горячего водоснабжения (стояки)',
  'ремонт пожарного водопровода',
  'ремонт внутридомовых инженерных систем теплоснабжения (стояки)',
  'ремонт внутридомовых инженерных систем холодного водоснабжения (стояки)',
  'ремонт внутреннего водостока',
  'ремонт внутридомовых инженерных систем водоотведения (канализации) (стояки)'].map((item) => {
    return { label: item.substring(0, 100), value: item }}).sort((a, b) => a.label.localeCompare(b.label));

let filters = {
  'rjvvf': { 'type': 'float', 'bounds': [0, 9] },
  'rvvjv': { 'type': 'float', 'bounds': [0, 9] },
  'kfirr': { 'type': 'float', 'bounds': [0, 9] },
  'r cjv': { 'type': 'string', 'bounds': ['CCC', 'BBB', 'AAA'] },
  'jffcc': { 'type': 'string', 'bounds': ['CCC', 'BBB', 'AAA'] },
  'ijrrj': { 'type': 'string', 'bounds': ['CCC', 'BBB', 'AAA'] }
};
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

  // const [switches, setSwitches] = useState(filters


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
    // setReloadFlag(!reloadFlag);
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

  // const objectList = result.map((item: any) => (
  //   <Group key={item.unom}>
  //     {item.description}
  //     <Button onClick={() => deleteElement(item.unom)}>Удалить обект</Button>
  //   </Group>
  // ));

  //object list with accordion
  const objectList = filteredResults.map((item: any) => (
    <Accordion.Item value={"f" + item.unom}>
      <Accordion.Control onClick={() => { setAlertIgnore(0); }}>{item.description}</Accordion.Control>
      <Accordion.Panel>
        {//print all attributes of selected object
          Object.keys(item).map((key) => {
            if (key === 'target') {
              return <><b>{key}</b>:<List>
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
                    placeholder="Выберите работы, которые нужно добавить"
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

  const handleDownload = (url) => {
    axios.get(url, {
      responseType: 'blob',
    })
      .then((res) => {
        fileDownload(res.data, 'results.csv')
      })
  }
 
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

  const downloadCSV = () => {
    console.log(filteredResults);
    const csvRows = [];
    const headers = Object.keys(filteredResults[0]);
    csvRows.push(headers.join(','));

    for (const row of filteredResults) {
      const values = headers.map(header => {
        const val = row[header]
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvBody = csvRows.join('\n');

    console.log(csvBody); 

    const url = window.URL.createObjectURL(
      new Blob([csvBody]),
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `FileName.pdf`,
    );

    // Append to html link element page
    document.body.appendChild(link);

    // Start download
    link.click();

    // Clean up and remove the link
    link.parentNode.removeChild(link);
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
            <Text><h3>Отключить фактор модели</h3></Text>
            <Stack>
              {switchElements}
            </Stack>
          </Container>
        </Grid.Col>
        <Grid.Col span="auto">
          <Container>
            <Text><h3>Управление</h3></Text>
            <Group>
              {/* <button onClick={() => {
                handleDownload('api/getResult')
              }}>Download Image</button> */}
              {/* <Button onSubmit={() => {downloadCSV();}}> */}
                <CSVLink data={filteredResults} filename="results.csv" style={{ textDecoration: "none", color: "white" }} onclick="location.href='#'"><Button>sjdhfg</Button></CSVLink>
                {/* Скачать CSV */}
                {/* <a href="api/getResult" download="results.csv" style={{textDecoration: "none", color: "white"}}>Скачать CSV</a> */}
              {/* </Button> */}
              <Button>Сохранить на сервере</Button>
            </Group>
          </Container>
        </Grid.Col>
      </Grid>
      <Grid>
        <Grid.Col span="auto">
          <Container>
            {selectedCenter &&
              <Accordion defaultValue="f1">
                <Accordion.Item value="f1">
                  <Accordion.Control>{resultObject[selectedCenter.unom].description}</Accordion.Control>
                  <Accordion.Panel>
                    {//print all attributes of selected object
                      Object.keys(resultObject[selectedCenter.unom]).map((key) => {
                        if (key === 'target') {
                          return <><b>{key}</b>:<List>
                            {resultObject[selectedCenter.unom][key].map((target: string) => {
                              return <List.Item><Stack spacing="xs" align="flex-start">
                                {target}
                                <Button onClick={() => deleteJob(resultObject[selectedCenter.unom].unom, target)}>Удалить работу</Button>
                              </Stack></List.Item>
                            })}
                          </List>
                            <br />
                            <Stack align="flex-start">
                              <MultiSelect data={jobList.filter((job) => !resultObject[selectedCenter.unom][key].includes(job.value))
                              } value={jobsToAdd} onChange={setJobsToAdd} dropdownPosition="bottom" />
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
                    <Button onClick={() => deleteElement(resultObject[selectedCenter.unom].unom)}>Удалить объект</Button>
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
          <iframe src={"http://127.0.0.1:8000/heatmap/" + projectName} width="80%" height="40%" id={heatmap}></iframe>
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
  
  // if (status === "loading") {
  //   return <p>Loading...</p>
  // }

  // if (status === "unauthenticated") {
  //   return <p>Access Denied</p>
  // }

  useEffect(() => {
    async function getResult(projectName: string) {
      const result = await axios.get(`http://127.0.0.1:8000/result/${projectName}`, {
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
      {isLoading && <Loader variant="dots" />}
      {!isLoading && <Mapss result={result} setResult={setResult} reloadFlag={reloadFlag}
        setReloadFlag={setReloadFlag} projectName={projectName} />}
    </>
  );
};

export default Visualization;