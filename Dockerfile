# 1. Imagem base: Node 22 na variante Alpine (leve, ~50MB vs ~1GB da completa)
FROM node:22-alpine

# 2. Define o diretório de trabalho dentro do container
WORKDIR /app

# 3. Copia APENAS os arquivos de dependências primeiro
COPY package*.json ./

# 4. Instala somente dependências de produção
RUN npm install

# 5. Agora sim copia o restante do código
COPY . .

RUN  npm run build

EXPOSE 3002

CMD [ "sh", "-c", "npx prisma migrate deploy && npm start" ]
