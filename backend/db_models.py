from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint, Float
from database import Base


OBJECTS_COLUMNS = [
    'ID', 'NAME', 'PARENT_ID', 'LOGIN', 'Назначение', 'Форма собственности',
    'Год постройки', 'Год реконструкции', 'Серия проекта',
    'Количество этажей', 'Количество подъездов', 'Количество квартир',
    'Общая площадь', 'Общая площадь жилых помещений',
    'Общая площадь нежилых помещений', 'Строительный объем',
    'Износ объекта (по БТИ)', 'Класс энергоэффективности', 'Материал стен',
    'Признак аварийности здания', 'Количество пассажирских лифтов',
    'Количество грузопассажирских лифтов', 'Очередность уборки кровли',
    'Материал кровли', 'UNOM', 'Вид социального объекта',
    'Тип жилищного фонда', 'Статус МКД', 'Статус управления МКД',
    'Количество грузовых лифтов', 'Причина Изменения Статуса МКД',
    'Категория МКД',
]


INCIDENTS_COLUMNS = [
    'Наименование', 'Источник', 'Дата создания во внешней системе',
    'Дата закрытия', 'Округ', 'Адрес', 'unom',
    'Дата и время завершения события во',
]

WORKS_COLUMNS = [
    'global_id', 'PERIOD', 'WORK_NAME', 'NUM_ENTRANCE', 'ElevatorNumber',
    'PLAN_DATE_START', 'PLAN_DATE_END', 'FACT_DATE_START', 'FACT_DATE_END',
    'AdmArea', 'District', 'Address', 'UNOM'
]

DF_COLUMNS_MAPPING = {
    'objects': OBJECTS_COLUMNS,
    'incidents': INCIDENTS_COLUMNS,
    'works': WORKS_COLUMNS,
}

INCIDENTS_COLUMN_NAME_MAPPING = {
    'name': 'Наименование',
    'source': 'Источник',
    'creation_date_in_external_system': 'Дата создания во внешней системе',
    'closing_date': 'Дата закрытия',
    'unom': 'unom',
}

class Object(Base):
    __tablename__ = "objects"

    id = Column(Integer, index=True)
    name = Column(String, index=True)
    parent_id = Column(Integer, index=True)
    login = Column(String, index=True)
    purpose = Column(String, index=True)
    ownership_form = Column(String, index=True)
    year_of_construction = Column(Integer, index=True)
    year_of_reconstruction = Column(Integer, index=True)
    project_series = Column(String, index=True)
    number_of_floors = Column(Integer, index=True)
    number_of_entrances = Column(Integer, index=True)
    number_of_apartments = Column(Integer, index=True)
    total_area = Column(Float, index=True)
    total_area_of_residential_premises = Column(Float, index=True)
    total_area_of_non_residential_premises = Column(Float, index=True)
    construction_volume = Column(Float, index=True)
    building_depreciation_according_to_BTI = Column(Integer, index=True)
    energy_efficiency_class = Column(String, index=True)
    wall_material = Column(String, index=True)
    sign_of_building_emergency = Column(String, index=True)
    number_of_passenger_elevators = Column(Integer, index=True)
    number_of_freight_passenger_elevators = Column(Integer, index=True)
    roof_cleaning_order = Column(String, index=True)
    roof_material = Column(String, index=True)
    unom = Column(Integer, index=True, unique=True, primary_key=True)
    type_of_social_facility = Column(String, index=True)
    type_of_housing_stock = Column(String, index=True)
    MKD_status = Column(String, index=True)
    MKD_management_status = Column(String, index=True)
    number_of_freight_elevators = Column(Integer, index=True)
    reason_for_changing_the_MKD_status = Column(String, index=True)
    MKD_category = Column(String, index=True)

    # unique constraint
    __table_args__ = (
        UniqueConstraint('unom'),
    )

class Incident(Base):
    __tablename__ = "incidents"

    name = Column(String, index=True, primary_key=True, nullable=True)
    source = Column(String, index=True, primary_key=True)
    creation_date_in_external_system = Column(String, index=True, primary_key=True)
    closing_date = Column(String, index=True)
    district = Column(String, index=True)
    address = Column(String, index=True)
    unom = Column(Integer, index=True, primary_key=True)
    date_and_time_of_completion_of_the_event_in = Column(String, index=True)

class Work(Base):
    __tablename__ = "works"

    global_id = Column(Integer, primary_key=True, index=True)
    period = Column(String, index=True)
    work_name = Column(String, index=True)
    num_entrance = Column(Integer, index=True)
    elevator_number = Column(String, index=True)
    plan_date_start = Column(String, index=True)
    plan_date_end = Column(String, index=True)
    fact_date_start = Column(String, index=True)
    fact_date_end = Column(String, index=True)
    adm_area = Column(String, index=True)
    district = Column(String, index=True)
    address = Column(String, index=True)
    unom = Column(Integer, index=True)

DATASET_TYPE_CLASS_MAPPING = {
    'objects': Object,
    'incidents': Incident,
    'works': Work,
}