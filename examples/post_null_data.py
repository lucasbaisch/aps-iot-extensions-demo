import requests
import random
from datetime import datetime, timedelta

# Configurações do servidor
SERVER_URL = "http://localhost:3000/api/sensors"  # Alterar para o IP do servidor, se necessário

def post_sensor_data(data):
    """
    Envia os dados do sensor para o servidor.
    """
    try:
        response = requests.post(SERVER_URL, json=data)
        if response.status_code == 201:
            print(f"Dados enviados: {data}")
        else:
            print(f"Erro ao enviar dados: {response.status_code}, {response.text}")
    except requests.RequestException as e:
        print(f"Erro de conexão: {e}")

def generate_and_post_data_with_nulls():
    """
    Gera e envia dados com algumas colunas nulas para o servidor.
    """
    current_time = int(datetime.now().timestamp())  # Timestamp em segundos
    data_with_nulls = [
        {"time": current_time, "temp": round(random.uniform(18, 28), 2), "umidade": None, "co": None, "ruido": random.uniform(0, 100)},
        {"time": current_time + 60, "temp": None, "umidade": round(random.uniform(483, 640), 2), "co": random.uniform(0, 1000), "ruido": None},
        {"time": current_time + 120, "temp": round(random.uniform(18, 28), 2), "umidade": round(random.uniform(483, 640), 2), "co": None, "ruido": None},
        {"time": current_time + 180, "temp": None, "umidade": None, "co": None, "ruido": None},  # Linha completamente nula
    ]

    for data in data_with_nulls:
        post_sensor_data(data)

if __name__ == "__main__":
    generate_and_post_data_with_nulls()
