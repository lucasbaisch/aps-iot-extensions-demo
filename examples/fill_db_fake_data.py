import sqlite3
from datetime import datetime, timedelta
import random
import time

def generate_fake_data(start, end, resolution):
    current_time = start
    while current_time <= end:
        temp = round(random.uniform(18, 28), 2)
        umidade = round(random.uniform(483, 640), 2)
        co = round(random.uniform(0, 1000), 2)
        ruido = round(random.uniform(0, 100), 2)
        yield (current_time.strftime('%Y-%m-%d %H:%M:%S'), temp, umidade, co, ruido)
        current_time += resolution

def fill_db_with_fake_data(db_path, start, end, resolution):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensors (
            time TEXT PRIMARY KEY,
            temp REAL,
            umidade REAL,
            co REAL,
            ruido REAL
        )
    ''')
    
    fake_data = generate_fake_data(start, end, resolution)
    cursor.executemany('INSERT INTO sensors (time, temp, umidade, co, ruido) VALUES (?, ?, ?, ?, ?)', fake_data)
    
    conn.commit()
    conn.close()

def insert_data_in_loop(db_path, resolution):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    while True:
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        temp = round(random.uniform(18, 28), 2)
        umidade = round(random.uniform(483, 640), 2)
        co = round(random.uniform(0, 1000), 2)
        ruido = round(random.uniform(0, 100), 2)
        cursor.execute('INSERT INTO sensors (time, temp, umidade, co, ruido) VALUES (?, ?, ?, ?, ?)', 
                       (current_time, temp, umidade, co, ruido))
        conn.commit()
        print(f'Data inserted at {current_time}')
        time.sleep(resolution.total_seconds())

if __name__ == "__main__":
    start = datetime(2024, 11, 1, 0, 0, 0)
    end = datetime.now()
    resolution = timedelta(minutes=1)
    
    fill_db_with_fake_data('sensor_data.db', start, end, resolution)
    print('Fake data inserted successfully')
    
    insert_data_in_loop('sensor_data.db', resolution)