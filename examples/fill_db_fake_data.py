import sqlite3
from datetime import datetime, timedelta
import random

def generate_fake_data(start, end, resolution):
    current_time = start
    while current_time <= end:
        temp = round(random.uniform(18, 28), 2)
        umidade = round(random.uniform(483, 640), 2)
        co = round(random.uniform(0, 1000), 2)
        yield (current_time.strftime('%Y-%m-%d %H:%M:%S'), temp, umidade, co)
        current_time += resolution

def fill_db_with_fake_data(db_path, start, end, resolution):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensors (
            time TEXT PRIMARY KEY,
            temp REAL,
            umidade REAL,
            co REAL
        )
    ''')
    
    fake_data = generate_fake_data(start, end, resolution)
    cursor.executemany('INSERT INTO sensors (time, temp, umidade, co) VALUES (?, ?, ?, ?)', fake_data)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    #Start = 10/01/2024 00:00:00 and End = 1/1/2025 00:00:00
    start = datetime(2024, 11, 1, 0, 0, 0)
    end = datetime(2025, 1, 1, 0, 0, 0)
    resolution = timedelta(minutes=1)
    
    fill_db_with_fake_data('sensor_data.db', start, end, resolution)
    print('Fake data inserted successfully')