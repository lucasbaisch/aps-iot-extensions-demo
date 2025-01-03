import mysql.connector
from mysql.connector import Error
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

def fill_db_with_fake_data(host, user, password, database, start, end, resolution):
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
        if conn.is_connected():
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
    host = "127.0.0.1"  # Endereço do MariaDB (ajuste para "mariadb" se estiver no mesmo docker compose)
    user = "root"  # Usuário configurado no `docker-compose.yml`
    password = "password"  # Senha configurada no `docker-compose.yml`
    database = "sensors"  # Banco de dados configurado no `docker-compose.yml`

    start = datetime(2024, 11, 1, 0, 0, 0)
    end = datetime.now()
    resolution = timedelta(minutes=1)

    fill_db_with_fake_data(host, user, password, database, start, end, resolution)
    print('Dados falsos inseridos com sucesso.')

    insert_data_in_loop(host, user, password, database, resolution)
