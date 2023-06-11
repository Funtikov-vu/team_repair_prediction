import asyncio
import json
import sqlite3
from time import sleep
from typing import Annotated, Literal
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import pandas as pd
import numpy as np
from base_preprocessing import preprocess_houses_dataset, preprocess_appeals_dataset, preprocess_works_dataset
from heatmap import create_heatmap
from final_preprocessing import get_final_x_by_input
from sqlalchemy.orm import Session
import db_models
from database import SessionLocal, engine
from utils import group_values_in_csv

db_models.Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
DATASET_TYPES = ['objects', 'incidents', 'works']
DATASET_TYPES_PREPROCESSING = {
    'objects': preprocess_houses_dataset,
    'incidents': preprocess_appeals_dataset,
    'works': preprocess_works_dataset,
}

# create project loading files from database
@app.post("/createProjectFromDB")
async def create_project_from_db(projectName: str = Form(...),
        dates: str = Form(...),
        objectTypes: list[str] = Form(...),
        unoms: UploadFile | None = None):
    os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    with open(os.path.join("storage", projectName, "config.json"), "w") as buffer:
        buffer.write(json.dumps({"dates": dates, "objectTypes": objectTypes}, indent=4, ensure_ascii=False))
    # print(pd.read_csv(unoms.file))
    try:
        unoms_df = pd.read_csv(unoms.file, dtype={'unom': int}, header=None, names=['unom']) if unoms else None
        print('tried headerless version')
    except:
        unoms.file.seek(0)
        try:
            unoms_df = pd.read_csv(unoms.file, dtype={'unom': int}, usecols=['unom']) if unoms else None
        except:
            unoms.file.seek(0)
            unoms_df = pd.read_csv(unoms.file, dtype={'UNOM': int}, usecols=['UNOM']) if unoms else None

    if unoms:
        unom_column = 'unom' if 'unom' in unoms_df.columns else 'UNOM'
    for i, dataset_type in enumerate(DATASET_TYPES, start=1):
        df = pd.read_sql_table(dataset_type, engine)
        if unoms and unoms_df.shape[0] > 0:
            df = df[df['unom'].isin(unoms_df[unom_column])]
        df.to_csv(os.path.join("storage", projectName, f"{i}"), index=False, 
                  header=db_models.DF_COLUMNS_MAPPING[dataset_type])
    return {"success": True}

@app.post("/createProject")
async def create_project(files: list[UploadFile] = File(...), projectName: str = Form(...), 
        dates: str = Form(...), objectTypes: list[str] = Form(...)):
    os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    for file in files:
        with open(os.path.join("storage", projectName, file.filename), "wb") as buffer:
            buffer.write(file.file.read())
    with open(os.path.join("storage", projectName, "config.json"), "w") as buffer:
        buffer.write(json.dumps({"dates": dates, "objectTypes": objectTypes}, indent=4, ensure_ascii=False))
    return {"success": True}


@app.post("/uploadCorrectedResults/{projectName}")
async def upload_corrected_results(file: list[UploadFile] = File(...), projectName: str = None):
    # os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    with open(os.path.join("storage", projectName, "corrected_results.csv"), "wb") as buffer:
        buffer.write(file[0].file.read())
    group_values_in_csv(os.path.join("storage", projectName, "corrected_results.csv"))
    return {"success": True}


@app.get("/projects")  # sorted by modified date
async def get_project_list():
    return sorted(next(os.walk("storage"))[1],
                  key=lambda x: os.path.getmtime(os.path.join("storage", x)),
                  reverse=True)


@app.get("/projects/{projectName}")
async def get_project(projectName: str):
    return next(os.walk(os.path.join("storage", projectName)))[2]


def generate_pred(projectName: str, corrected: bool = False):
    df1 = os.path.join("storage", projectName, "1")
    df2 = os.path.join("storage", projectName, "2")
    df3 = os.path.join("storage", projectName, "3")
    x = os.path.join("storage", projectName, "x.csv")
    results = os.path.join("storage", projectName, "results.csv")
    corrected_results = os.path.join("storage", projectName, "corrected_results.csv")
    bounds = os.path.join("storage", projectName, "bounds.json")
    config = os.path.join("storage", projectName, "config.json")
    get_final_x_by_input(df1, df2, df3, x, results, corrected_results, bounds, config)


@app.get("/result/{projectName}")
async def result(projectName: str, corrected: bool = True):
    if corrected:
        path_to_file = os.path.join("storage", projectName, "corrected_results.csv")
    else:
        path_to_file = os.path.join("storage", projectName, "results.csv")
    lock = os.path.join("storage", projectName, "lock")
    os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    if not os.path.exists(lock):
        open(lock, "w").close()
        generate_pred(projectName)
        os.remove(lock)
    else:
        seconds = 0
        while os.path.exists(lock):
            await asyncio.sleep(1)
            seconds += 1
            if seconds > 250:
                try:
                    os.remove(lock)
                except:
                    pass
                return await result(projectName, corrected)
    # generate_pred(projectName)
    results = pd.read_csv(path_to_file)
    create_heatmap(results, os.path.join("storage", projectName, "heatmap.html"))
    return FileResponse(path_to_file)


@app.get("/heatmap/{projectName}")
async def get_heatmap(projectName: str, corrected: bool = False):
    return FileResponse(os.path.join("storage", projectName, "heatmap.html"))


@app.delete("/projects/{projectName}")
async def delete(projectName: str):
    import shutil
    shutil.rmtree(os.path.join("storage", projectName))
    return {"success": True}


@app.get("/files")
async def get_file(projectName: str, file: str):
    if not os.path.exists(os.path.join("storage", projectName, file)):
        #return error
        raise HTTPException(status_code=404, detail="Item not found")
    return FileResponse(os.path.join("storage", projectName, file))


@app.post("/markToRetrain/{projectName}")
async def mark_to_retrain(projectName: str):
    # append projectName to storage/retrain.txt
    with open("storage/retrain.txt", "r+") as f:
        if projectName not in [line.strip() for line in f]:
            f.write(projectName + "\n")
    return {"success": True}

# preprocess and upload to postgresql database
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), 
                      dataset_type: Literal['objects', 'incidents', 'works'] = Form(...)):
    preprocess = DATASET_TYPES_PREPROCESSING[dataset_type]
    df: pd.DataFrame = preprocess(file.file)
    if dataset_type == 'objects':
        columns_to_filter = ['unom']
        columns_to_filter_df = ['UNOM']
    elif dataset_type == 'incidents':
        columns_to_filter = ['name', 'source', 'creation_date_in_external_system', 'unom']
        columns_to_filter_df = [db_models.INCIDENTS_COLUMN_NAME_MAPPING.get(column, column) for column in columns_to_filter]
        df.drop_duplicates(subset=columns_to_filter_df, inplace=True)
    elif dataset_type == 'works':
        columns_to_filter = columns_to_filter_df = ['global_id']
    values_to_filter = pd.read_sql_table(dataset_type, engine).groupby(columns_to_filter).size().index.tolist()
    if values_to_filter:
        if dataset_type == 'objects':
            df = df[~df.set_index(columns_to_filter_df).index.map(int).isin(values_to_filter)]
        else:
            df = df[~df.set_index(columns_to_filter_df).index.isin(values_to_filter)]
        print(df)
        print(df.set_index(columns_to_filter_df).index)
    df.columns = db_models.DATASET_TYPE_CLASS_MAPPING[dataset_type].__table__.columns.keys()
    df.to_sql(dataset_type, engine, if_exists='append', index=False)
    return {"success": True}

# delete data from postgresql database
@app.delete("/database/dataset/{dataset_type}")
async def delete_dataset(dataset_type: Literal['objects', 'incidents', 'works']):
    db_models.DATASET_TYPE_CLASS_MAPPING[dataset_type].__table__.drop(engine)
    db_models.DATASET_TYPE_CLASS_MAPPING[dataset_type].__table__.create(engine)
    return {"success": True}

# get data from postgresql database by unom
@app.get("/database/dataset/{dataset_type}/{unom}")
async def get_info_by_unom(dataset_type: Literal['objects', 'incidents', 'works'], unom: int):
    df = pd.read_sql_table(dataset_type, engine).query(f"unom == {unom}")
    df.columns = db_models.DF_COLUMNS_MAPPING[dataset_type]
    if dataset_type == 'objects':
        df = df.drop(columns=['ID', 'NAME', 'PARENT_ID', 'LOGIN'])
        df = df.iloc[0, :]
        return df.to_json(force_ascii=False)
    else:
        return df.to_csv(index=False)
        # return df.to_json(force_ascii=False, orient='records')

@app.get("/")
async def main():
    return "Hello World"
