from const import dataset_raw, dataset, fbasename, fbasenewname, tbasenewname, geo_name, df3_time_cols, datetime_str, date_format, date_format3, datetime_start, all_appeals, all_works, nessesery_cols, base_features, base_cat_features, final_features, models, df1_columns, df2_columns, df3_columns, EPS_LOC 
from base_preprocessing import read_sub_df, preprocess_first_dataset, preprocess_second_dataset, preprocess_third_dataset, get_datasets

import pandas as pd
import os
from datetime import datetime
import numpy as np
import json

from catboost import CatBoostClassifier

def preprocess(df1, df2, df3, geo, only_mkd=True):
    if only_mkd:
        df1_new = df1[(df1['Тип жилищного фонда'] == 'МКД') & (df1['Статус МКД'] == 'в эксплуатации')]
    else:
        df1_new = df1.copy()
    df1_new = df1_new.rename(columns={"UNOM": "unom"})
    
    
    df1_new['unom'] = df1_new['unom'].astype(int)
    geo['unom'] = geo['unom'].astype(int)
    df1_new = df1_new.set_index('unom').join(geo.set_index('unom')).reset_index()
    df1_new = df1_new[nessesery_cols + base_features]
    
    df2_new = df2.copy()
    df2_new['unom'] = df2_new['unom'].astype(int)
    df2_new = df2_new[df2_new['unom'].isin(df1_new['unom'])].reset_index(drop=True)
    
    df2_new['Дата создания во внешней системе'] = df2_new['Дата создания во внешней системе'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24))
    df2_new['Дата закрытия'] = df2_new['Дата закрытия'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    df2_new['Дата и время завершения события во'] = df2_new['Дата и время завершения события во'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    
    grouped = df2_new.groupby('unom').apply(lambda x: x[['Наименование', 'Дата создания во внешней системе', 'Дата закрытия', 'Дата и время завершения события во']].to_dict('records'))
    df2_new = pd.DataFrame({'unom': grouped.index, 'appeals_list': grouped.values})
    df2_new['appeals_list'] = df2_new['appeals_list'].apply(lambda x: sorted(x, key = lambda y: y['Дата создания во внешней системе']))
    df1_new = df1_new.set_index('unom').join(df2_new.set_index('unom')).reset_index()
    
    df3_new = df3.rename(columns={"UNOM": "unom"})
    df3_new['unom'] = df3_new['unom'].astype(int)
    for i in df3_time_cols:
        df3_new[i] = df3_new[i].apply(lambda x: (datetime.strptime(x, date_format3) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    grouped = df3_new.groupby('unom').apply(lambda x: x[df3_time_cols + ['WORK_NAME']].to_dict('records'))
    df3_new = pd.DataFrame({'unom': grouped.index, 'works_list': grouped.values})
    df3_new['works_list'] = df3_new['works_list'].apply(lambda x: sorted(x, key = lambda y: y['PLAN_DATE_START']))
    df1_new = df1_new.set_index('unom').join(df3_new.set_index('unom')).reset_index()
    return df1_new

def check_bounds(number, left_bound=None, right_bound=None):
    if pd.isna(left_bound):
        left_bound = number - 1
    if pd.isna(right_bound):
        right_bound = number + 1
    return left_bound < number < right_bound

def filter_bounds(df, left_bound=None, right_bound=None, type_l="appeals_list"):
    df_new = df.copy()
    if type_l == "appeals_list":
        df_new[type_l] = df_new[type_l].apply(lambda x: [y for y in x if check_bounds(y["Дата создания во внешней системе"],
                                                                                      left_bound=left_bound,
                                                                                      right_bound=right_bound)] if isinstance(x, list) else None)
    elif type_l == "works_list":
        df_new[type_l] = df_new[type_l].apply(lambda x: [y for y in x if check_bounds(y["PLAN_DATE_START"],
                                                                                      left_bound=left_bound,
                                                                                      right_bound=right_bound)] if isinstance(x, list) else None)
    return df_new

def get_imply_appeals_work(df, start_x_date, end_x_date, start_y_date, end_y_date, weight_func=None):
    if pd.isna(weight_func):
        weight_func = lambda x, y: 1
    norm_dict = {x: 0 for x in all_appeals}
    res_dict = {}
    for x in all_appeals:
        for y in all_works + ["without work"]:
            res_dict[(x, y)] = 0
    df_appeals = filter_bounds(df, start_x_date, end_x_date, type_l="appeals_list")
    df_works = filter_bounds(df, start_y_date, end_y_date, type_l="works_list")
    for i in range(len(df)):
        if not isinstance(df_appeals["appeals_list"][i], list) or not df_appeals["appeals_list"][i]:
            continue
        for appeal in df_appeals["appeals_list"][i]:
            if pd.isna(appeal["Наименование"]):
                continue
            norm_dict[appeal["Наименование"]] += 1
            if not isinstance(df_works["works_list"][i], list) or not df_works["works_list"][i]:
                res_dict[(appeal["Наименование"], "without work")] += 1
            else:
                loc_dict = {}
                loc_norm = 0
                for work in df_works["works_list"][i]:
                    if work["WORK_NAME"] not in loc_dict:
                        loc_dict[work["WORK_NAME"]] = 0
                    dist = weight_func(appeal["Дата создания во внешней системе"], work["PLAN_DATE_START"])
                    loc_dict[work["WORK_NAME"]] += dist
                    loc_norm += dist
                for key in loc_dict:
                    loc_dict[key] /= loc_norm
                    res_dict[(appeal["Наименование"], key)] += loc_dict[key]
    for x, y in res_dict:
        if not norm_dict[x]:
            continue
        res_dict[(x, y)] /= norm_dict[x]
    return res_dict

def check_work_in(work, work_list):
    return any([work == x["WORK_NAME"] for x in work_list])


def final_generate_x(df, start_x_date, end_x_date):
    x = filter_bounds(df, start_x_date, end_x_date, type_l="appeals_list")
    x = filter_bounds(x, start_x_date, end_x_date, type_l="works_list")
    
    weight_dict = get_imply_appeals_work(df, start_x_date, start_x_date + (end_x_date - start_x_date) / 2,
                                         start_x_date + (end_x_date - start_x_date) / 2, end_x_date, weight_func=None)
    weight_weighted_dict = get_imply_appeals_work(df, start_x_date, start_x_date + (end_x_date - start_x_date) / 2,
                                                  start_x_date + (end_x_date - start_x_date) / 2, end_x_date,
                                                  weight_func=lambda x, y: 1 / (abs(x - y) + 1))
    
    
    
    final_features = ["appeals_count", "works_count"]
    x["appeals_count"] = x["appeals_list"].apply(lambda x: len(x) if isinstance(x, list) else 0)
    x["works_count"] = x["works_list"].apply(lambda x: len(x) if isinstance(x, list) else 0)
    
    for work in all_works:
        x[work + "_before"] = x["works_list"].apply(lambda x: int(check_work_in(work, x)) if isinstance(x, list) else 0)
        final_features.append(work + "_before")
        x[work + "_weight"] = x["appeals_list"].apply(lambda x: sum([weight_dict[(y["Наименование"], work)] for y in x if not pd.isna(y["Наименование"])]) if isinstance(x, list) else 0)
        final_features.append(work + "_weight")
        x[work + "_weight_weighted"] = x["appeals_list"].apply(lambda x: sum([weight_weighted_dict[(y["Наименование"], work)] for y in x if not pd.isna(y["Наименование"])]) if isinstance(x, list) else 0)
        final_features.append(work + "_weight_weighted")
    return x, final_features

def final_generate_y(df, start_y_date, end_y_date):
    dff = filter_bounds(df, start_y_date, end_y_date, type_l="works_list")
    
    y = pd.DataFrame()
    for work in all_works:
        y[work] = dff["works_list"].apply(lambda x: check_work_in(work, x) if isinstance(x, list) else 0)
    return y

def generate_x_y(df, start_x_date, end_x_date, start_y_date, end_y_date, n_iter=10):
    x, final_features = final_generate_x(df, start_x_date, end_x_date)
    x_out = []
    y_out = []
    
    for _ in range(n_iter):
        start, end = sorted(np.random.uniform(start_y_date, end_y_date, size=2))
        x_loc = x.copy()
        x_loc["start"] = start
        x_loc["end"] = end
        y = final_generate_y(df, start, end)
        x_out.append(x_loc)
        y_out.append(y)
    return pd.concat(x_out), pd.concat(y_out), final_features + ["start", "end"]

def get_final_x(df, features):
    return df[features].fillna(-9999)


def get_predict_probas(df, clfs):
    predict_probas = []
    for i in range(len(clfs)):
        if clfs[i] == 0:
            predict_probas.append([0 for _ in range(df.shape[0])])
        else:
            predict_probas.append(clfs[i].predict_proba(df)[:, 1])
    return predict_probas

def get_final_x_by_input(fbasenewname, sbasenewname, tbasenewname, outname, resultsname, add_name, boundsname):
    if not os.path.isfile(outname):
        geo = pd.read_csv(geo_name)
        df1, df2, df3 = get_datasets(fbasenewname, sbasenewname, tbasenewname)
        df1_new = preprocess(df1, df2, df3, geo)
        time_max = df1_new["appeals_list"].apply(lambda x: max([y['Дата создания во внешней системе'] for y in x]) if isinstance(x, list) else 0).max()
        x, _, _ = generate_x_y(df1_new, time_max - 120, time_max, time_max - 120, time_max, n_iter=1)
        x.to_csv(outname, index=False)
    if not os.path.isfile(resultsname):
        x = pd.read_csv(outname)
        res_data = pd.DataFrame()
        res_data["unom"] = x["unom"]
        res_data["description"] = x["NAME"]
        res_data["object_type"] = x["Тип жилищного фонда"]
        
        res_data["lat"] = x["lat"]
        res_data["lng"] = x["lng"]
        
        res_data["appeals_count"] = x["appeals_count"]
        res_data["works_count"] = x["works_count"]
        
        res_data["Серия проекта"] = x["Серия проекта"].astype(str)
        
        preds = []
        x_for_pred = get_final_x(x, base_features + final_features)
        x_for_pred = x_for_pred.replace(False, 0)
        
        for i in range(len(all_works)):
            if EPS_LOC[i] == 0:
                preds.append([0 for _ in range(len(x))])
            else:
                model = CatBoostClassifier()      # parameters not required.
                model.load_model(f'{models}/{i}')
                preds.append((model.predict_proba(x_for_pred)[:, 1] > EPS_LOC[i]).astype(int))
        target = []
        for i in range(len(res_data)):
            target.append([])
            for j in range(len(all_works)):
                if preds[j][i]:
                    target[i].append(all_works[j])
        res_data["target"] = target
        res_data = res_data[res_data["target"].apply(lambda x: len(x)) > 0]
        bounds_dict = {"appeals_count": {"type": "float", "bounds": (res_data["appeals_count"].min(),
                                                                     res_data["appeals_count"].max())},
                       "works_count": {"type": "float", "bounds": (res_data["works_count"].min(),
                                                                   res_data["works_count"].max())},
                       "Серия проекта": {"type": "string", "bounds": list(set(res_data["Серия проекта"]))}}
        res_data.to_csv(resultsname, index=False)
        res_data.to_csv(add_name, index=False)
        with open(boundsname, 'w') as f:
            json.dump(bounds_dict, f, ensure_ascii=False, default=str)
