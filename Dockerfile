# Usar a imagem oficial do Node.js baseada no Ubuntu
FROM node:16

# Atualizar o sistema
RUN apt-get update && apt-get install -y nano sqlite3 python3 python3-pip supervisor && rm -rf /var/lib/apt/lists/*

ENV TZ=America/Sao_Paulo

# Configurar o diretório de trabalho
WORKDIR /app

# Copiar apenas os arquivos de dependências
COPY package*.json ./

# Instalar as dependências do Node.js
RUN npm install mysql2 moment-timezone

# Instalar dependências do Python
COPY python-requirements.txt .
RUN pip3 install -r python-requirements.txt

# Copiar o restante dos arquivos do projeto
COPY . .

# Criar pasta /app/logs/
RUN mkdir /app/logs

# Instalar o arquivo de configuração do Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expor a porta do servidor
EXPOSE 3000

# Configurar a variável de ambiente para produção
ENV NODE_ENV=production

# Manter o container em execução
CMD ["supervisord", "-n"]
