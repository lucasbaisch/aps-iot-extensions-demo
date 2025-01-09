import os
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
import random
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

def initialize_database(host, user, password, database, populate=False):
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
            print("Tabela 'sensors' criada ou já existente.")

            if populate:
                # Apagar todos os dados existentes na tabela
                cursor.execute('DELETE FROM sensors')
                print('Dados antigos apagados da tabela.')

                # Gerar e inserir 1 mês de dados falsos
                end = datetime.now()
                start = end - timedelta(days=30)
                resolution = timedelta(minutes=1)
                fake_data = list(generate_fake_data(start, end, resolution))  # Converte para lista
                cursor.executemany('''
                    INSERT INTO sensors (time, temp, umidade, co, ruido) 
                    VALUES (%s, %s, %s, %s, %s)
                ''', fake_data)

                conn.commit()
                print('Tabela populada com 1 mês de dados falsos.')

    except Error as e:
        print(f'Erro ao conectar ao MariaDB: {e}')
    finally:
        if connected:
            cursor.close()
            conn.close()


if __name__ == "__main__":
    host = os.getenv("DB_HOST", "127.0.0.1")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "password")
    database = os.getenv("DB_NAME", "sensors")

    # print("Deseja preencher a tabela 'sensors' com 1 mês de dados falsos? (s/n)")
    # user_input = input().strip().lower()
    user_input = 's'

    populate = False

    initialize_database(host, user, password, database, populate)