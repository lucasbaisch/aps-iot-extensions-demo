# Usar a imagem oficial do Node.js baseada no Ubuntu
FROM node:16

# Atualizar o sistema
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

ENV TZ=America/Sao_Paulo
# Configurar o diretório de trabalho
WORKDIR /app

# Copiar apenas os arquivos de dependências
COPY package*.json ./

# Instalar as dependências do Node.js
RUN npm install mysql2 moment-timezone

# Install python req
COPY python-requirements.txt .
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install -r python-requirements.txt

# Copiar o restante dos arquivos do projeto
COPY . .

# Expor a porta do servidor
EXPOSE 3000

# Configurar a variável de ambiente para produção
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "server.js"]
