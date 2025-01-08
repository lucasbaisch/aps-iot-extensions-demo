import requests
import random
from datetime import datetime, timedelta
import time

# Configurações do servidor
# SERVER_URL = "http://34.59.64.61:3000/api/sensors"  # Altere para o IP/URL do seu servidor
SERVER_URL = "http://localhost:3000/api/sensors"  # Altere para o IP/URL do seu servidor

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

def generate_past_sensor_data(start_time, end_time, interval=60):
    """
    Gera dados fictícios do sensor de um intervalo de tempo passado.
    """
    data_list = []
    current_time = start_time
    while current_time <= end_time:
        temp = round(random.uniform(18, 28), 2)
        umidade = round(random.uniform(483, 640), 2)
        co = round(random.uniform(0, 1000), 2)
        ruido = round(random.uniform(0, 100), 2)

        data_list.append({
            "time": current_time,
            "temp": temp,
            "umidade": umidade,
            "co": co,
            "ruido": ruido
        })
        current_time += interval
    return data_list

def post_sensor_data(data):
    """
    Envia os dados do sensor para o servidor.
    """
    try:
        response = requests.post(SERVER_URL, json=data)
        if response.status_code == 201:
            print(f"Dados enviados {datetime.fromtimestamp(data['time'])}: {data}")
        else:
            print(f"Erro ao enviar dados: {response.status_code}, {response.text}")
    except requests.RequestException as e:
        print(f"Erro de conexão: {e}")

if __name__ == "__main__":
    # Envia dados de um mÊS atrás até agora com resolução de 1 minuto
    # start_time = 01/01/2024
    # end_time = 01/02/2024
    start_time = datetime(2024, 1, 1).timestamp()
    end_time = datetime(2024, 2, 1).timestamp()
    past_sensor_data_list = generate_past_sensor_data(start_time, end_time)
    
    for past_sensor_data in past_sensor_data_list[::-1]:  # Envia os dados do mais antigo para o mais recente
        post_sensor_data(past_sensor_data)
        # time.sleep(0.1)  # Pequena pausa para evitar sobrecarga no servidor
    print("Envio de dados de um mes atrás até agora concluído.")
    
    while True:
        print("Enviando dados do sensor em loop...")  # Envia dados do sensor em loop a cada minuto
        sensor_data = generate_sensor_data()
        post_sensor_data(sensor_data)
        time.sleep(60)  # Aguarda 60 segundos antes de enviar os próximos dados
