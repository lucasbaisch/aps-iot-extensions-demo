import requests
import random
from datetime import datetime
import time

# Configurações do servidor
SERVER_URL = "http://34.42.152.3:3000/api/sensors"  # Altere para o IP/URL do seu servidor

def generate_sensor_data():
    """
    Gera dados fictícios do sensor.
    """
    current_time = int(datetime.now().timestamp())  # Timestamp em segundos
    temp = round(random.uniform(18, 28), 2)
    umidade = round(random.uniform(483, 640), 2)
    co = round(random.uniform(0, 1000), 2)
    ruido = round(random.uniform(0, 100), 2)

    return {
        "time": current_time,
        "temp": temp,
        "umidade": umidade,
        "co": co,
        "ruido": ruido
    }

def post_sensor_data(data):
    """
    Envia os dados do sensor para o servidor.
    """
    try:
        response = requests.post(SERVER_URL, json=data)
        if response.status_code == 201:
            print(f"Dados enviados com sucesso: {data}")
        else:
            print(f"Erro ao enviar dados: {response.status_code}, {response.text}")
    except requests.RequestException as e:
        print(f"Erro de conexão: {e}")

if __name__ == "__main__":
    while True:
        sensor_data = generate_sensor_data()
        post_sensor_data(sensor_data)
        time.sleep(30)  # Aguarda 30 segundos antes de enviar os próximos dados
