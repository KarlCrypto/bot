FROM node:9

WORKDIR /usr/src

COPY ./package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

ENTRYPOINT ["node", "bin/www"]