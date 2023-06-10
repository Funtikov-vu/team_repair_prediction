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
