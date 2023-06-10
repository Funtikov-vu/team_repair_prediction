import pickle
from sklearn.model_selection import GroupKFold, train_test_split
from tqdm import tqdm
from const import data_raw_source, data_postprocessed_source, houses_raw_source, houses_postprocess_source, appeals_postprocess_source, works_postprocess_source, geo_source, imply_appeals_work_without_time_weight_source, imply_appeals_work_with_time_weight_source, works_time_cols, datetime_str_start, date_format, date_format3, datetime_start, all_appeals, all_works, nessesery_cols, base_features, base_cat_features, final_features, time_features, models_source, houses_columns, appeals_columns, works_columns, houses_test_source, WORK_WEIGHTS, EPS_LOC 
from base_preprocessing import get_datasets

import pandas as pd
import os
from datetime import datetime
import numpy as np
import json

from catboost import CatBoostClassifier

def preprocess(houses_df, appeals_df, works_df, geo, only_mkd=True):
    if only_mkd:
        houses_df_new = houses_df[(houses_df['Тип жилищного фонда'] == 'МКД') & (houses_df['Статус МКД'] == 'в эксплуатации')]
    else:
        houses_df_new = houses_df.copy()
    houses_df_new = houses_df_new.rename(columns={"UNOM": "unom"})
    
    
    houses_df_new['unom'] = houses_df_new['unom'].astype(int)
    geo['unom'] = geo['unom'].astype(int)
    houses_df_new = houses_df_new.set_index('unom').join(geo.set_index('unom')).reset_index()
    houses_df_new = houses_df_new[nessesery_cols + base_features]
    
    appeals_df_new = appeals_df.copy()
    appeals_df_new['unom'] = appeals_df_new['unom'].astype(int)
    appeals_df_new = appeals_df_new[appeals_df_new['unom'].isin(houses_df_new['unom'])].reset_index(drop=True)
    
    appeals_df_new['Дата создания во внешней системе'] = appeals_df_new['Дата создания во внешней системе'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24))
    appeals_df_new['Дата закрытия'] = appeals_df_new['Дата закрытия'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    appeals_df_new['Дата и время завершения события во'] = appeals_df_new['Дата и время завершения события во'].apply(lambda x: (datetime.strptime(x, date_format) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    
    grouped = appeals_df_new.groupby('unom').apply(lambda x: x[['Наименование', 'Дата создания во внешней системе', 'Дата закрытия', 'Дата и время завершения события во']].to_dict('records'))
    appeals_df_new = pd.DataFrame({'unom': grouped.index, 'appeals_list': grouped.values})
    appeals_df_new['appeals_list'] = appeals_df_new['appeals_list'].apply(lambda x: sorted(x, key = lambda y: y['Дата создания во внешней системе']))
    houses_df_new = houses_df_new.set_index('unom').join(appeals_df_new.set_index('unom')).reset_index()
    
    works_df_new = works_df.rename(columns={"UNOM": "unom"})
    works_df_new['unom'] = works_df_new['unom'].astype(int)
    for i in works_time_cols:
        works_df_new[i] = works_df_new[i].apply(lambda x: (datetime.strptime(x, date_format3) - datetime_start).total_seconds() / (3600 * 24) if not pd.isna(x) else None)
    grouped = works_df_new.groupby('unom').apply(lambda x: x[works_time_cols + ['WORK_NAME']].to_dict('records'))
    works_df_new = pd.DataFrame({'unom': grouped.index, 'works_list': grouped.values})
    works_df_new['works_list'] = works_df_new['works_list'].apply(lambda x: sorted(x, key = lambda y: y['PLAN_DATE_START']))
    houses_df_new = houses_df_new.set_index('unom').join(works_df_new.set_index('unom')).reset_index()
    return houses_df_new

def split_data(data, imply_dict_size=1, train_size=1, test_size=1):
    sum_sizes = imply_dict_size + train_size + test_size
    imply_dict_size, train_size, test_size = imply_dict_size / sum_sizes, train_size / sum_sizes, test_size / sum_sizes
    imply_dict_data, temp_data = train_test_split(data, test_size=(train_size + test_size), random_state=42)
    train_data, test_data = train_test_split(temp_data, test_size=test_size / (train_size + test_size), random_state=42)
    return imply_dict_data.reset_index(drop=True), train_data.reset_index(drop=True), test_data.reset_index(drop=True)
    

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

def get_imply_appeals_work(df, start_x_date=-1, end_x_date=9999, start_y_date=-1, end_y_date=9999, weight_func=None):
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
            if not isinstance(df_works["works_list"][i], list):
                res_dict[(appeal["Наименование"], "without work")] += 1
                continue
            works_list_filtered = list(filter(lambda x: appeal["Дата создания во внешней системе"] < x["PLAN_DATE_START"],
                                              df_works["works_list"][i]))
            if not works_list_filtered:
                res_dict[(appeal["Наименование"], "without work")] += 1
            else:
                loc_dict = {}
                loc_norm = 0
                for work in works_list_filtered:
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

def create_imply_dict_data(imply_dict):
    df = pd.DataFrame(index=all_appeals, columns=all_works + ["without work"])
    for (appeal, work), value in imply_dict.items():
        df.loc[appeal, work] = value
    return df

def check_work_in(work, work_list):
    return any([work == x["WORK_NAME"] for x in work_list])

def get_last_work_time(work, work_list, end_x_date):
    if work_list is None or len(work_list) == 0:
        return 9999
    else:
        start_times = [d['PLAN_DATE_START'] for d in work_list if d['WORK_NAME'] == work and not pd.isna(d['PLAN_DATE_START'])]
        return end_x_date - max(start_times) if start_times else 9999
    
def get_all_appeals_after_date(appeals_list, date):
    res_appeals = []
    for i in range(len(appeals_list) - 1, -1, -1):
        if pd.isna(appeals_list[i]["Наименование"]):
            continue
        elif appeals_list[i]["Дата создания во внешней системе"] > date:
            res_appeals.append(appeals_list[i]["Наименование"])
        else:
            break
    return res_appeals


def generate_x(df, start_x_date, end_x_date):
    x = filter_bounds(df, start_x_date, end_x_date, type_l="appeals_list")
    x = filter_bounds(x, start_x_date, end_x_date, type_l="works_list")
    with open(imply_appeals_work_without_time_weight_source, 'rb') as infile:
        imply_appeals_work_without_time_weight_dict = pickle.load(infile)
    
    with open(imply_appeals_work_with_time_weight_source, 'rb') as infile:
        imply_appeals_work_with_time_weight_dict = pickle.load(infile)
    
    
    final_features = ["appeals_count", "works_count"]
    x["appeals_count"] = x["appeals_list"].apply(lambda x: len(x) if isinstance(x, list) else 0)
    x["works_count"] = x["works_list"].apply(lambda x: len(x) if isinstance(x, list) else 0)
    
    for work in all_works:
        x[work + "_last_time_lag"] = x["works_list"].apply(lambda x: get_last_work_time(work, x, end_x_date))
        final_features.append(work + "_last_time_lag")
        x[work + "_without_time_weight_sum"] = x["appeals_list"].apply(lambda x: sum([imply_appeals_work_without_time_weight_dict[(y["Наименование"], work)] for y in x if not pd.isna(y["Наименование"])]) / (end_x_date - start_x_date + 1) if isinstance(x, list) else 0)
        final_features.append(work + "_without_time_weight_sum")
        x[work + "_without_time_weight_after_last_work_sum"] = x.apply(lambda x: sum([imply_appeals_work_without_time_weight_dict[(y, work)] for y in get_all_appeals_after_date(x["appeals_list"], end_x_date - x[work + "_last_time_lag"])] + [0]) / (end_x_date - start_x_date + 1) if isinstance(x["appeals_list"], list) else 0, axis=1)
        final_features.append(work + "_without_time_weight_after_last_work_sum")
        x[work + "_without_time_weight_after_last_work_max"] = x.apply(lambda x: max([imply_appeals_work_without_time_weight_dict[(y, work)] for y in get_all_appeals_after_date(x["appeals_list"], end_x_date - x[work + "_last_time_lag"])] + [0]) if isinstance(x["appeals_list"], list) else 0, axis=1)
        final_features.append(work + "_without_time_weight_after_last_work_max")
        
        x[work + "_with_time_weight_sum"] = x["appeals_list"].apply(lambda x: sum([imply_appeals_work_with_time_weight_dict[(y["Наименование"], work)] for y in x if not pd.isna(y["Наименование"])]) / (end_x_date - start_x_date + 1) if isinstance(x, list) else 0)
        final_features.append(work + "_with_time_weight_sum")
        x[work + "_with_time_weight_after_last_work_sum"] = x.apply(lambda x: sum([imply_appeals_work_with_time_weight_dict[(y, work)] for y in get_all_appeals_after_date(x["appeals_list"], end_x_date - x[work + "_last_time_lag"])] + [0]) / (end_x_date - start_x_date + 1) if isinstance(x["appeals_list"], list) else 0, axis=1)
        final_features.append(work + "_with_time_weight_after_last_work_sum")
        x[work + "_with_time_weight_after_last_work_max"] = x.apply(lambda x: max([imply_appeals_work_with_time_weight_dict[(y, work)] for y in get_all_appeals_after_date(x["appeals_list"], end_x_date - x[work + "_last_time_lag"])] + [0]) if isinstance(x["appeals_list"], list) else 0, axis=1)
        final_features.append(work + "_with_time_weight_after_last_work_max")
    return x, final_features

def generate_y(df, start_y_date, end_y_date):
    dff = filter_bounds(df, start_y_date, end_y_date, type_l="works_list")
    
    y = pd.DataFrame()
    for work in all_works:
        y[work] = dff["works_list"].apply(lambda x: check_work_in(work, x) if isinstance(x, list) else 0)
    return y

def greedy_max_distance(vectors, n_iter):
    selected_vectors = [vectors[0]] 
    for _ in tqdm(range(1, n_iter)): 
        min_distances = [min(np.linalg.norm(np.array(v) - np.array(selected_vector)) for selected_vector in selected_vectors) for v in vectors]
        selected_vectors.append(vectors[np.argmax(min_distances)])
    return selected_vectors

def generate_x_y(df, lower_bound_x_period_date=120, upper_bound_x_period_date=365,
                 lower_bound_y_period_date=1, upper_bound_y_period_date=365, y_period_positive_target_lower_bound=200, x_positive_lower_bound=100, n_iter_diff=50, n_iter_positive_target=50,
                 mult=100):
    x_out = []
    y_out = []
    
    vectors = []
    for _ in range(n_iter_diff * mult):
        start_x_date, end_x_date, start_y_date, end_y_date = -1, -1, -1, -1
        while not (lower_bound_x_period_date < end_x_date - start_x_date + 1 < upper_bound_x_period_date) or not (lower_bound_y_period_date < end_y_date - start_y_date + 1 < upper_bound_y_period_date):
            start_x_date, end_x_date, start_y_date, end_y_date = sorted(np.random.uniform(0, 365, size=4))
        vectors.append([start_x_date, end_x_date, start_y_date, end_y_date])
    selected_vectors = greedy_max_distance(vectors, n_iter_diff)
    
    vectors = []
    for _ in range(n_iter_positive_target * mult):
        start_x_date, end_x_date, start_y_date, end_y_date = -1, -1, -1, -1
        while not (x_positive_lower_bound < end_x_date - start_x_date + 1 < upper_bound_x_period_date) or not (y_period_positive_target_lower_bound < end_y_date - start_y_date + 1 < upper_bound_y_period_date):
            start_x_date, end_x_date, start_y_date, end_y_date = sorted(np.random.uniform(0, 365, size=4))
        vectors.append([start_x_date, end_x_date, start_y_date, end_y_date])
        
    selected_vectors += greedy_max_distance(vectors, n_iter_positive_target)
    
    for i in tqdm(range(n_iter_diff + n_iter_positive_target)):
        start_x_date, end_x_date, start_y_date, end_y_date = selected_vectors[i]
        x, final_features = generate_x(df, start_x_date, end_x_date)
        x["x_length_time_period"] = end_x_date - start_x_date
        x["time_dist_period"] = start_y_date - end_x_date
        x["y_length_time_period"] = end_y_date - start_y_date
        y = generate_y(df, start_y_date, end_y_date)
        x_out.append(x)
        y_out.append(y)
    return pd.concat(x_out).reset_index(drop=True), pd.concat(y_out).reset_index(drop=True), final_features

def cv_predictions(model, X, y, groups, n_splits=3):
    cv = GroupKFold(n_splits=n_splits)

    predictions = []
    test_labels = []
    for train_index, test_index in cv.split(X, y, groups):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y.iloc[train_index], y.iloc[test_index]
        if not y_train.sum().astype(int) or not y_test.sum().astype(int):
            return None, None

        model.fit(X_train, y_train, cat_features=base_cat_features)
        y_pred_proba = model.predict_proba(X_test)
        predictions.extend(y_pred_proba)
        test_labels.extend(y_test)

    return np.array(predictions), np.array(test_labels)

def get_object_weight(x, p=False):
    if not p:
        return sum([WORK_WEIGHTS[y] for y in x["target"]] + [0])
    else:
        return sum([WORK_WEIGHTS[x["target"][i]] * x["p"][i] for i in range(len(x["target"]))] + [0])

def get_final_x_by_input(houses_postprocess_source, appeals_postprocess_source, works_postprocess_source, 
                         outname, resultsname, add_name, boundsname, configname):
    if not os.path.isfile(outname):
        geo = pd.read_csv(geo_source)
        houses_df, appeals_df, works_df = get_datasets(houses_postprocess_source, appeals_postprocess_source, works_postprocess_source)
        houses_df_new = preprocess(houses_df, appeals_df, works_df, geo)
        time_max = houses_df_new["appeals_list"].apply(lambda x: max([y['Дата создания во внешней системе'] for y in x]) if isinstance(x, list) else 0).max()
        with open(configname, "r") as file:
            config = json.load(file)
        start = (datetime.strptime(eval(config["dates"])[0], "%Y-%m-%dT%H:%M:%S.%fZ") - datetime_start).total_seconds() / (3600 * 24)
        end = (datetime.strptime(eval(config["dates"])[1], "%Y-%m-%dT%H:%M:%S.%fZ") - datetime_start).total_seconds() / (3600 * 24)
        x, final_features = generate_x(houses_df_new, 0, time_max)
        # x["x_length_time_period"] = time_max - 0
        x["x_length_time_period"] = 100
        #x["time_dist_period"] = start - time_max
        x["time_dist_period"] = 10
        x["y_length_time_period"] = end - start
        x["y_length_time_period"] = 100
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
        ps = []
        x_for_pred = x[base_features + final_features + time_features].fillna(-9999)
        x_for_pred = x_for_pred.replace(False, 0)
        
        for i in range(len(all_works)):
            if EPS_LOC[i] == 1:
                preds.append([0 for _ in range(len(x))])
                ps.append([0 for _ in range(len(x))])
            else:
                model = CatBoostClassifier()      # parameters not required.
                model.load_model(f'{models_source}/{i}')
                preds.append((model.predict_proba(x_for_pred)[:, 1] > EPS_LOC[i] / 1000).astype(int))
                ps.append(model.predict_proba(x_for_pred)[:, 1])
        target = []
        ps_target = []
        for i in range(len(res_data)):
            target.append([])
            ps_target.append([])
            for j in range(len(all_works)):
                if preds[j][i]:
                    target[i].append(all_works[j])
                    ps_target[i].append(ps[j][i])
        res_data["target"] = target
        res_data["p"] = ps_target
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
