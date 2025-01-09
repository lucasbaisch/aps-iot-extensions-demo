import requests
import json
import os
import base64
import time
import hashlib

# === CONFIGURAÇÃO ===
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

def create_bucket(access_token, bucket_key):
    url = f"{BASE_URL}/oss/v2/buckets"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {"bucketKey": bucket_key, "policyKey": "persistent"}
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 409:
        print(f"Bucket '{bucket_key}' já existe.")
    else:
        response.raise_for_status()
        print("Bucket criado com sucesso:", response.json())

def initiate_multipart_upload(access_token, bucket_key, object_name, parts):
    url = f"{BASE_URL}/oss/v2/buckets/{bucket_key}/objects/{object_name}/signeds3upload?parts={parts}"
    headers = {"Authorization": f"Bearer {access_token}"}
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
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {"uploadKey": upload_key}
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def start_translation_job(access_token, urn):
    url = f"{BASE_URL}/modelderivative/v2/designdata/job"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
        "input": {"urn": urn},
        "output": {"formats": [{"type": "svf2", "views": ["2d", "3d"], "advanced": {"generateMasterViews": True}}]}
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def check_translation_status(access_token, urn):
    url = f"{BASE_URL}/modelderivative/v2/designdata/{urn}/manifest"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def save_manifest(manifest_data, filename="manifest.json"):
    with open(filename, "w") as manifest_file:
        json.dump(manifest_data, manifest_file, indent=4)
    print(f"Manifesto salvo em: {filename}")

def save_env_file(data, filename=".env"):
    with open(filename, "w") as env_file:
        # Escreve as variáveis dinâmicas fornecidas em `data`
        for key, value in data.items():
            env_file.write(f"{key}={value}\n")
        
        # Adiciona as variáveis fixas
        env_file.write("\n")
        env_file.write("PORT=3000\n\n")
        env_file.write("DB_HOST=mariadb\n")
        env_file.write("DB_USER=root\n")
        env_file.write("DB_PASSWORD=password\n")
        env_file.write("DB_NAME=sensors\n")
    
    print(f"Configurações salvas em: {filename}")

def extract_master_view(manifest_data):
    for derivative in manifest_data.get("derivatives", []):
        for child in derivative.get("children", []):
            if child.get("isMasterView", False):
                return child
    return None

def save_config_js(urn, view_id, filename="public/config.js"):
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

def generate_bucket_key():
    return f"projeto-{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"

def get_external_ip():
    try:
        response = requests.get("https://api.ipify.org?format=json")
        response.raise_for_status()  # Verifica se houve erros na requisição
        ip_data = response.json()
        return ip_data["ip"]
    except requests.RequestException as e:
        print(f"Erro ao obter o IP externo: {e}")
        return None

def check_manifest_status(access_token, urn, domain):
    """
    Faz uma requisição GET ao endpoint do manifesto para verificar o status.
    """
    url = f"https://cdn.derivative.autodesk.com/derivativeservice/v2/manifest/{urn}?domain={domain}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "*/*",
        "User-Agent": "Python-Requests"
    }

    try:
        response = requests.get(url, headers=headers)
        print(f"Manifest status: {response.status_code}")
        if response.status_code == 200:
            print("Manifest acessado com sucesso!")
        else:
            print(f"Erro ao acessar o manifesto. Status: {response.status_code}")
            print(f"Detalhes: {response.text}")
    except requests.RequestException as e:
        print(f"Erro na requisição do manifesto: {e}")

# === EXECUÇÃO ===
if __name__ == "__main__":
    try:
        print("Configuração inicial")
        CLIENT_ID = input("Digite o CLIENT_ID: ")
        CLIENT_SECRET = input("Digite o CLIENT_SECRET: ")
        # FILE_PATH = None
        FILE_PATH = input("Digite o caminho do arquivo (sala_de_descanso.rvt): ")
        if not FILE_PATH:
            FILE_PATH = "sala_de_descanso.rvt"
        OBJECT_NAME = os.path.basename(FILE_PATH)
        BUCKET_KEY = "projetos-aps"  # generate_bucket_key()

        print("Obtendo token de acesso...")
        access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)

        print("Criando bucket...")
        create_bucket(access_token, BUCKET_KEY)

        file_size = os.path.getsize(FILE_PATH)
        parts = (file_size // PART_SIZE) + (1 if file_size % PART_SIZE != 0 else 0)

        print("Iniciando upload multipart...")
        upload_info = initiate_multipart_upload(access_token, BUCKET_KEY, OBJECT_NAME, parts)

        signed_urls = upload_info["urls"]
        upload_key = upload_info["uploadKey"]

        print("Fazendo upload das partes...")
        uploaded_parts = upload_parts(signed_urls, FILE_PATH)

        print("Finalizando upload multipart...")
        complete_multipart_upload(access_token, BUCKET_KEY, OBJECT_NAME, upload_key)

        urn = base64.urlsafe_b64encode(f"urn:adsk.objects:os.object:{BUCKET_KEY}/{OBJECT_NAME}".encode()).decode()

        print("Iniciando o trabalho de tradução...")
        start_translation_job(access_token, urn)

        print("Verificando status da tradução...")
        while True:
            manifest = check_translation_status(access_token, urn)
            status = manifest.get("status", "unknown")
            print(f"Status: {status}, progresso: {manifest.get('progress', '0%')}")
            if status in ["success", "failed"]:
                success = check_manifest_status(access_token, urn, get_external_ip())
                save_manifest(manifest)
                master_view = extract_master_view(manifest)
                if master_view:
                    save_config_js(urn, master_view["guid"])
                save_env_file({
                    "APS_CLIENT_ID": CLIENT_ID,
                    "APS_CLIENT_SECRET": CLIENT_SECRET,
                    "APS_BUCKET": BUCKET_KEY,
                    "URN": urn
                })
                external_ip = get_external_ip()
                if external_ip:
                    print('========================================================================')
                    print('========================================================================')
                    print("Agora rode o comando: 'docker compose up -d --build'")
                    print("E então acesse a aplicação com o endereco:")
                    print(f"http://{external_ip}:3000")
                break
            time.sleep(3)

    except Exception as e:
        print(f"Erro: {str(e)}")

"https://cdn.derivative.autodesk.com/derivativeservice/v2/manifest/dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6cHJvamVjdC0wMDkyZWJkMC9zYWxhX2RlX2Rlc2NhbnNvLnJ2dA?domain=http%3A%2F%2F34.67.0.151%3A3000"