import folium
from folium.plugins import HeatMap
import pandas as pd

MSK_coord = (55.644466, 37.395744)



def create_heatmap(df: pd.DataFrame, res_path: str, coord=MSK_coord):
    # Создание карты Москвы с заданными координатами
    m = folium.Map(MSK_coord, zoom_start=9, attributionControl=False)

    # Создание тепловой карты
    heat_data = [[row['lat'], row['lng']] for index, row in df.iterrows()]
    HeatMap(heat_data).add_to(m)
    m.save(res_path)
