import pandas as pd
import os
from const import dataset_raw, dataset, fbasename, fbasenewname, tbasenewname, geo_name, df3_time_cols, datetime_str, date_format, date_format3, datetime_start, all_appeals, all_works, nessesery_cols, base_features, base_cat_features, final_features, models, df1_columns, df2_columns, df3_columns, EPS_LOC 

def read_sub_df(df):
    df.columns = df.iloc[0]
    df = df.drop(df.index[0])
    return df


def preprocess_first_dataset(fname, fbasename):
    try:
        df_new = pd.read_csv(fname)
    except:
        df_new = pd.read_excel(fname, sheet_name=None)
    if isinstance(df_new, dict):
        key = list(df_new)[0]
        df_new = df_new[key]
    df = pd.read_excel(fbasename, sheet_name=None)
    if list(df_new.columns) == df1_columns:
        return df_new
    col_names = [i for i in df if i != "Sheet1"]
    col_d = df['Sheet1'].iloc[0].to_dict()
    for i in col_d:
        if pd.isna(col_d[i]):
            col_d[i] = i
    df_new = df_new.drop(df_new.index[0])
    df_new.columns = [col_d[i] for i in df_new.columns]

    for name in col_names:
        df[name] = read_sub_df(df[name])
        d = df[name].astype(str).set_index('ID').to_dict()['NAME']
        df_new[col_d[name]] = df_new[col_d[name]].apply(lambda x: d.get(x, None))
    return df_new

def preprocess_second_dataset(sname):
    try:
        df_new = pd.read_csv(sname)
        return df_new
    except:
        df_new = pd.read_excel(sname, sheet_name=None)
    if not isinstance(df_new, dict):
        return df_new
    df_arr = []
    for i in df_new:
        if list(df_new[i].columns) == df2_columns:
            df_arr.append(i)
    return pd.concat([df_new[i] for i in df_arr]).drop_duplicates()

def preprocess_third_dataset(tname):
    try:
        return pd.read_csv(tname)
    except:
         return pd.read_excel(tname)
        
def get_datasets(fname, sname, tname):
    df1 = preprocess_first_dataset(fname, fbasename)
    df2 = preprocess_second_dataset(sname)
    df3 = preprocess_third_dataset(tname)
    return df1, df2, df3
