import os
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
import random
import time
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

def generate_fake_data(start, end, resolution):
    current_time = start
    while current_time <= end:
        temp = round(random.uniform(18, 28), 2)
        umidade = round(random.uniform(483, 640), 2)
        co = round(random.uniform(0, 1000), 2)
        ruido = round(random.uniform(0, 100), 2)
        yield (current_time.strftime('%Y-%m-%d %H:%M:%S'), temp, umidade, co, ruido)
        current_time += resolution

def fill_db_with_fake_data(host, user, password, database, start, end, resolution, just_create=False):
    connected = False
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        if conn.is_connected():
            connected = True
            print('Conectado ao banco de dados MariaDB.')
            cursor = conn.cursor()

            # Criar tabela, se não existir
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sensors (
                    time DATETIME PRIMARY KEY,
                    temp DOUBLE,
                    umidade DOUBLE,
                    co DOUBLE,
                    ruido DOUBLE
                )
            ''')

            # Apaga todos os dados existentes na tabela
            cursor.execute('DELETE FROM sensors')
            
            if just_create:
                print('Somente criando a tabela.')
                conn.commit()
                return

            # Gerar dados falsos
            fake_data = generate_fake_data(start, end, resolution)
            cursor.executemany('''
                INSERT INTO sensors (time, temp, umidade, co, ruido) 
                VALUES (%s, %s, %s, %s, %s)
            ''', fake_data)

            conn.commit()
            print('Dados falsos inseridos com sucesso.')

    except Error as e:
        print(f'Erro ao conectar ao MariaDB: {e}')
    finally:
        if connected:
            cursor.close()
            conn.close()

def insert_data_in_loop(host, user, password, database, resolution):
    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        if conn.is_connected():
            print('Conectado ao banco de dados MariaDB.')
            cursor = conn.cursor()

            while True:
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                temp = round(random.uniform(18, 28), 2)
                umidade = round(random.uniform(483, 640), 2)
                co = round(random.uniform(0, 1000), 2)
                ruido = round(random.uniform(0, 100), 2)

                cursor.execute('''
                    INSERT INTO sensors (time, temp, umidade, co, ruido) 
                    VALUES (%s, %s, %s, %s, %s)
                ''', (current_time, temp, umidade, co, ruido))

                conn.commit()
                print(f'Dados inseridos às {current_time}')
                time.sleep(resolution.total_seconds())

    except Error as e:
        print(f'Erro ao conectar ao MariaDB: {e}')
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    host = os.getenv("DB_HOST", "127.0.0.1")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "password")
    database = os.getenv("DB_NAME", "sensors")

    start = datetime(2025, 1, 1, 0, 0, 0)
    end = datetime(2025, 1, 1, 0, 1, 0)
    resolution = timedelta(seconds=30)
    just_create = True  # Se True, apenas a tabela será criada, sem inserir dados falsos
    loop_inserting = False  # Se True, os dados serão inseridos em loop

    fill_db_with_fake_data(host, user, password, database, start, end, resolution, just_create)
    
    if loop_inserting:
        insert_data_in_loop(host, user, password, database, resolution)
