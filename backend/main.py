import json
from time import sleep
from typing import Annotated
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import pandas as pd
import numpy as np
from heatmap import create_heatmap
from final_preprocessing import get_final_x_by_input
import csv


def group_values_in_csv(file_path):
    # Открываем CSV-файл для чтения
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        rows = list(reader)  # Читаем все строки CSV-файла

    # Определяем количество столбцов
    num_columns = len(rows[0])

    # Группируем значения в последнем столбце в список
    for row in rows[1:]:  # Начинаем со второй строки, так как первая содержит заголовки столбцов
        last_column = row[-1]
        values = last_column.split(',')  # Разделяем значения по запятой
        row[-1] = values

    # Перезаписываем файл
    with open(file_path, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload(files: list[UploadFile] = File(...), projectName: str = Form(...), dates: str = Form(...)):
    os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    for file in files:
        with open(os.path.join("storage", projectName, file.filename), "wb") as buffer:
            buffer.write(file.file.read())
    with open(os.path.join("storage", projectName, "config.json"), "w") as buffer:
        buffer.write(json.dumps({"dates": dates}, indent=4, ensure_ascii=False))
    return {"success": True}


@app.post("/uploadCorrectedResults/{projectName}")
async def upload(file: list[UploadFile] = File(...), projectName: str = None):
    # os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    with open(os.path.join("storage", projectName, "corrected_results.csv"), "wb") as buffer:
        buffer.write(file[0].file.read())
    group_values_in_csv(os.path.join("storage", projectName, "corrected_results.csv"))
    return {"success": True}


@app.get("/files")
async def files(): 
    return next(os.walk('storage'))[1]


@app.get("/files/{filename}")
async def files(filename: str):
    return FileResponse(os.path.join("storage", filename))

@app.get("/generate/{projectName}")
async def generate_pred(projectName: str, corrected: bool = False):
    sleep(1)
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
    sleep(1)
    
    if corrected:
        path_to_file = os.path.join("storage", projectName, "corrected_results.csv")
    else:
        path_to_file = os.path.join("storage", "example.csv")
    os.makedirs(os.path.join("storage", projectName), exist_ok=True)
    await generate_pred(projectName)
    results = pd.read_csv(path_to_file)
    create_heatmap(results, os.path.join("storage", projectName, "heatmap.html"))
    return FileResponse(path_to_file)
    
@app.get("/heatmap/{projectName}")
async def get_heatmap(projectName: str, corrected: bool = False):
    return FileResponse(os.path.join("storage", projectName, "heatmap.html"))


@app.get("/")
async def main():
    return "Hello World"
