import requests
import json
import os
import base64
import time
import hashlib

# === FUNÇÕES ===
def get_access_token(client_id, client_secret):
    url = f"{BASE_URL}/authentication/v2/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
        "scope": "bucket:create bucket:read data:write data:read"
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    return response.json()["access_token"]

def create_bucket(access_token, bucket_key, policy_key):
    url = f"{BASE_URL}/oss/v2/buckets"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "bucketKey": bucket_key,
        "policyKey": policy_key
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 409:
        print(f"Bucket '{bucket_key}' já existe.")
    else:
        response.raise_for_status()
        print("Bucket criado com sucesso:", response.json())

def initiate_multipart_upload(access_token, bucket_key, object_name, parts):
    url = f"{BASE_URL}/oss/v2/buckets/{bucket_key}/objects/{object_name}/signeds3upload?parts={parts}"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def upload_parts(signed_urls, file_path):
    parts = []
    with open(file_path, "rb") as file_data:
        for idx, url in enumerate(signed_urls):
            print(f"Fazendo upload da parte {idx + 1}...")
            headers = {"Content-Type": "application/octet-stream"}
            part_data = file_data.read(PART_SIZE)

            response = requests.put(url, headers=headers, data=part_data)
            response.raise_for_status()

            etag = response.headers["ETag"]
            parts.append({"partNumber": idx + 1, "etag": etag})
    return parts

def complete_multipart_upload(access_token, bucket_key, object_name, upload_key):
    url = f"{BASE_URL}/oss/v2/buckets/{bucket_key}/objects/{object_name}/signeds3upload"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "uploadKey": upload_key
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def start_translation_job(access_token, urn):
    url = f"{BASE_URL}/modelderivative/v2/designdata/job"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "x-ads-force": "true"
    }
    payload = {
        "input": {
            "urn": urn
        },
        "output": {
            "formats": [
                {
                    "type": "svf2",
                    "views": ["2d", "3d"],
                    "advanced": {
                        "generateMasterViews": True
                    }
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def check_translation_status(access_token, urn):
    url = f"{BASE_URL}/modelderivative/v2/designdata/{urn}/manifest"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def generate_bucket_key():
    hash_value = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
    return f"projeto-{hash_value}"

def write_env_file(client_id, client_secret, bucket_key):
    content = f"""
APS_CLIENT_ID={client_id}
APS_CLIENT_SECRET={client_secret}
APS_BUCKET={bucket_key}
PORT=3000

DB_HOST=mariadb
DB_USER=root
DB_PASSWORD=password
DB_NAME=sensors
"""
    with open(".env", "w") as env_file:
        env_file.write(content)

# === CONFIGURAÇÃO ===
BASE_URL = "https://developer.api.autodesk.com"
PART_SIZE = 5 * 1024 * 1024  # Tamanho de cada parte (5MB)

# === EXECUÇÃO ===
if __name__ == "__main__":
    try:
        print("Configuração inicial")
        CLIENT_ID = input("Digite o CLIENT_ID: ")
        CLIENT_SECRET = input("Digite o CLIENT_SECRET: ")
        FILE_PATH = input("Digite o caminho do arquivo (FILE_PATH): ")
        OBJECT_NAME = os.path.basename(FILE_PATH)
        BUCKET_KEY = generate_bucket_key()

        print("Obtendo token de acesso...")
        access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)
        print("Token de acesso obtido com sucesso.")

        print("Verificando ou criando bucket...")
        create_bucket(access_token, BUCKET_KEY, "persistent")

        file_size = os.path.getsize(FILE_PATH)
        parts = (file_size // PART_SIZE) + (1 if file_size % PART_SIZE != 0 else 0)

        print("Iniciando upload multipart...")
        upload_info = initiate_multipart_upload(access_token, BUCKET_KEY, OBJECT_NAME, parts)

        signed_urls = upload_info["urls"]
        upload_key = upload_info["uploadKey"]

        print("Fazendo upload das partes...")
        uploaded_parts = upload_parts(signed_urls, FILE_PATH)

        print("Finalizando upload multipart...")
        result = complete_multipart_upload(access_token, BUCKET_KEY, OBJECT_NAME, upload_key)
        print("Upload multipart concluído com sucesso:", result)

        print("Codificando o URN do objeto...")
        urn = base64.urlsafe_b64encode(f"urn:adsk.objects:os.object:{BUCKET_KEY}/{OBJECT_NAME}".encode()).decode()
        print("URN codificado:", urn)

        print("Iniciando o trabalho de tradução para SVF2...")
        translation_response = start_translation_job(access_token, urn)
        print("Trabalho de tradução iniciado:", translation_response)

        print("Verificando o status da tradução continuamente...")
        while True:
            status_response = check_translation_status(access_token, urn)
            status = status_response.get("status", "unknown")
            progress = status_response.get("progress", "unknown")
            print(f"Status atual: {status}, Progresso: {progress}")

            if status in ["success", "failed", "timeout"]:
                print("Status final da tradução:", json.dumps(status_response, indent=4))
                break

            time.sleep(3)

        print("Criando arquivo .env...")
        write_env_file(CLIENT_ID, CLIENT_SECRET, BUCKET_KEY)
        print("Arquivo .env criado com sucesso.")

    except requests.exceptions.HTTPError as err:
        print(f"Erro na requisição: {err.response.status_code} - {err.response.text}")
    except Exception as e:
        print(f"Erro: {str(e)}")
