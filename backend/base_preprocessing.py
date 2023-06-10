import sys
import pandas as pd
import os
from const import data_raw_source, data_postprocessed_source, houses_raw_source, houses_postprocess_source, appeals_postprocess_source, works_postprocess_source, geo_source, imply_appeals_work_without_time_weight_source, imply_appeals_work_with_time_weight_source, works_time_cols, datetime_str_start, date_format, date_format3, datetime_start, all_appeals, all_works, nessesery_cols, base_features, base_cat_features, final_features, time_features, models_source, houses_columns, appeals_columns, works_columns, EPS_LOC 

# дроп первого техничесного набора названий стобцов 
def read_sub_df(df):
    df.columns = df.iloc[0]
    df = df.drop(df.index[0])
    return df


def preprocess_houses_dataset(houses_source, houses_raw_source=houses_raw_source):
    dtype = {'UNOM': int}
    try:
        data = pd.read_excel(houses_source, sheet_name=None, dtype=dtype)
    except:
        data = pd.read_csv(houses_source, dtype=dtype)
    if isinstance(data, dict):
        key = list(data)[0]
        data = data[key]
    if list(data.columns) == houses_columns:
        return data
    df = pd.read_excel(houses_raw_source, sheet_name=None)
    col_names = [i for i in df if i != "Sheet1"]
    col_dict = df['Sheet1'].iloc[0].to_dict()
    for i in col_dict:
        if pd.isna(col_dict[i]):
            col_dict[i] = i
    data = data.drop(data.index[0])
    data.columns = [col_dict[i] for i in data.columns]

    for name in col_names:
        df[name] = read_sub_df(df[name])
        d = df[name].astype(str).set_index('ID').to_dict()['NAME']
        data[col_dict[name]] = data[col_dict[name]].apply(lambda x: d.get(x, None))
    return data.drop_duplicates().dropna(subset=['UNOM'])

def preprocess_appeals_dataset(appeals_source):
    dtype = {'unom': int}
    try:
        data = pd.read_excel(appeals_source, sheet_name=None, dtype=dtype)
    except:
        data = pd.read_csv(appeals_source, dtype=dtype)
        return data.dropna(subset=['Наименование'])
    if not isinstance(data, dict):
        return data
    data_arr = []
    for i in data:
        if list(data[i].columns) == appeals_columns:
            data_arr.append(i)
    return pd.concat([data[i] for i in data_arr]).drop_duplicates().dropna(subset=['Наименование'])

def preprocess_works_dataset(works_source):
    dtype = {'global_id': int}
    try:
        return pd.read_excel(works_source, dtype=dtype)
    except:
        return pd.read_csv(works_source, dtype=dtype)
        
def get_datasets(houses_source, appeals_source, works_source):
    houses_df = preprocess_houses_dataset(houses_source, houses_raw_source)
    appeals_df = preprocess_appeals_dataset(appeals_source)
    works_df = preprocess_works_dataset(works_source)
    return houses_df, appeals_df, works_df
