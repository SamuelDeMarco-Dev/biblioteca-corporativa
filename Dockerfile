# 1. Imagem base: Node 18 na variante Alpine (leve, ~50MB vs ~1GB da completa)
FROM node:18-alpine

# 2. Define o diretório de trabalho dentro do container
WORKDIR /app

# 3. Copia APENAS os arquivos de dependências primeiro
COPY package*.json ./

# 4. Instala somente dependências de produção
RUN npm install --omit=dev

# 5. Agora sim copia o restante do código
COPY . .

# 6. Documenta a porta que a aplicação usa
EXPOSE 3000

# 7. Comando executado quando o container sobe
CMD ["npm", "start"]
