import requests
import json
import os
import base64
import time

# === CONFIGURAÇÃO ===
# Configure essas variáveis com suas credenciais e informações
CLIENT_ID = "uxI6YKV3oDAhI0KuLA2AyNUXiWzfGikz2AvRKBAXHsPKhVnj"
CLIENT_SECRET = "tj8Vj7yERYfyqArE7XIjS8IJdRPWbZIPjNsonuw3oEe4rZGeL76V3p27Lx6ZTptW"
OBJECT_NAME = "sala_de_descanso.rvt"  # Nome do arquivo a ser enviado
FILE_PATH = "sala_de_descanso.rvt"  # Caminho local do arquivo
BUCKET_KEY = "project-0092ebd0"  # Use um bucket existente ou crie um novo
POLICY_KEY = "persistent"  # Escolha entre "transient", "temporary" ou "persistent"
BASE_URL = "https://developer.api.autodesk.com"
PART_SIZE = 5 * 1024 * 1024  # Tamanho de cada parte (5MB)

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

def save_manifest(manifest_data, filename="manifest.json"):
    with open(filename, "w") as manifest_file:
        json.dump(manifest_data, manifest_file, indent=4)
    print(f"Manifesto salvo em: {filename}")

def save_env_file(data, filename=".env"):
    with open(filename, "w") as env_file:
        for key, value in data.items():
            env_file.write(f"{key}={value}\n")
    print(f"Configurações salvas em: {filename}")

def extract_master_view(manifest_data):
    """
    Procura o primeiro modelo com isMasterView: true no manifesto.
    """
    for derivative in manifest_data.get("derivatives", []):
        for child in derivative.get("children", []):
            if child.get("isMasterView", False):
                return child  # Retorna o primeiro modelo mestre encontrado
    return None

def save_config_js(urn, view_id, filename="public/config.js"):
    """
    Salva o arquivo config.js com as configurações do APS.
    """
    config_content = f"""
export const APS_MODEL_URN = '{urn}';
export const APS_MODEL_VIEW = '{view_id}';
export const APS_MODEL_DEFAULT_FLOOR_INDEX = 2;
// Datatime padrao é o dia de hoje das 00:00 até 23:59
export const DEFAULT_TIMERANGE_START = new Date(new Date().setHours(0, 0, 0, 0));
export const DEFAULT_TIMERANGE_END = new Date(new Date().setHours(23, 59, 59, 999));
"""
    with open(filename, "w") as config_file:
        config_file.write(config_content.strip())
    print(f"Configurações salvas em: {filename}")

# === EXECUÇÃO ===
if __name__ == "__main__":
    try:
        print("Obtendo token de acesso...")
        access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)
        print("Token de acesso obtido com sucesso.")

        print("Verificando ou criando bucket...")
        create_bucket(access_token, BUCKET_KEY, POLICY_KEY)

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
            print(f"Status atual: {status}")

            if status in ["success", "failed", "timeout"]:
                print("Status final da tradução:", json.dumps(status_response, indent=4))
                
                # Salvar o manifesto em um arquivo JSON
                save_manifest(status_response, "manifest.json")

                # Extrair o view ID do manifesto
                master_view = extract_master_view(status_response)
                if not master_view:
                    raise ValueError("View ID não encontrado no manifest.")
                model_view_id = master_view["guid"]
                

                # Salvar o .env com informações úteis
                save_env_file({
                    "ACCESS_TOKEN": access_token,
                    "URN": status_response["urn"],
                    "BUCKET_KEY": BUCKET_KEY,
                    "OBJECT_NAME": OBJECT_NAME
                })

                # Salvar o config.js
                save_config_js(status_response["urn"], model_view_id)
                break

            time.sleep(3)

    except requests.exceptions.HTTPError as err:
        print(f"Erro na requisição: {err.response.status_code} - {err.response.text}")
    except Exception as e:
        print(f"Erro: {str(e)}")