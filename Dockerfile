# Base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install build essentials, Python, and make
RUN apt-get update && \
     apt-get install -y build-essential python3 && \
     apt-get clean

# Install node-gyp globally
RUN npm install -g node-gyp

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

## Install nest cli globally
#RUN npm install -g @nestjs/cli

# Bundle app source
COPY . .

ENV NODE_ENV=production \
    PORT=5000 \
    LIVE_DB_TYPE=mysql \
    LIVE_DB_HOST=seenergy.mysql.database.azure.com \
    LIVE_DB_PORT=3306 \
    LIVE_DB_USER=seenergy \
    LIVE_DB_NAME=seenergy_press \
    LIVE_DB_PASSWORD=WatcheTech@MS2024! \
    JWT_SECRET=yJG2CVYcuceuMXopLLkaBpUnajO9Zw3hz0o6Z6t96unSsfCdST9ZjYpiJ1YoJmcFFXpVIVAyEBi9NsjbqzLSr7kAn43HAcRIPSbeLyIxjpIQDDw6hhie2MMZinGENXASD6ghSKXZE2vQk4LmODglTu \
    REFRESH_JWT_SECRET=857WdqLyCOQOmelFvtJtPWOkJifyVY3ohUZSGoqCXY32j64A27WcUJsIU2eCQ0apmYRHtE7c4Pm2DW2sosWF1mNDakw0EzJ8aWOdFqDdv1OrSOa1xeiGlwCZE4UfRnmJ5EkuQ6kX6COQ \
    JWT_AUTH_TOKEN_EXPIRATION=45d \
    JWT_REFRESH_TOKEN_EXPIRATION=120d \
    LIVE_EMAIL_HOST=live.smtp.mailtrap.io \
    LIVE_EMAIL_USER=api \
    LIVE_EMAIL_PASS=e6940c4b2e6830c467ee7ab39de22281 \
    LIVE_EMAIL_PORT=587 \
    REQUEST_RATE_TTL=1 \
    REQUEST_RATE_LIMIT=100 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    AZURE_BLOB_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=seenergy;AccountKey=zvnWLc0EvBJWvcKeIMPH0vnF0rR5lq+2RgQdWM1U+wSY6ooMyVmfxtOQCUv2mPL+fx5NpNKKknr6+AStoT25zg==;EndpointSuffix=core.windows.net" \
    AZURE_BLOB_STORAGE_CONTAINER_NAME=seenergy-press \
    AZURE_BLOB_STORAGE_URL="https://seenergy.blob.core.windows.net/seenergy-press/" \
    AWS_ACCESS_KEY_ID=AKIAVXAAYHXYYILQ4SMJ \
    AWS_SECRET_ACCESS_KEY=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 \
    AWS_S3_REGION=us-east-1 \
    AWS_S3_BUCKET=plusone-app-bucket


# Create a "dist" folder with the production build
RUN npm install -g @nestjs/cli@latest

RUN npm run build

# Expose port 5000
EXPOSE 5001

# Start the server using the production build
CMD ["node", "dist/src/main.js"]