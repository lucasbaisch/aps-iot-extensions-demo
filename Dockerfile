# Usar a imagem oficial do Node.js
FROM node:16-alpine

# Instalar dependências adicionais necessárias para SQLite
RUN apk add --no-cache sqlite

# Configurar o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto para o contêiner
COPY package*.json ./
COPY . .

# Instalar as dependências do Node.js
RUN npm install

# Expor a porta do servidor
EXPOSE 3000

# Configurar a variável de ambiente para produção
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "server.js"]
