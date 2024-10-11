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
    PORT=5001 \
    LIVE_DB_TYPE=postgres \
    LIVE_DB_HOST=plaventi-db.postgres.database.azure.com \
    LIVE_DB_PORT=5432 \
    LIVE_DB_USER=plaventi \
    LIVE_DB_NAME=plaventi_dev \
    LIVE_DB_PASSWORD=Josh1.\$ua1234567 \
    JWT_SECRET=yJG2CVYcuceuMXopLLkaBpUnajO9Zw3hz0o6Z6t96unSsfCdST9ZjYpiJ1YoJmcFFXpVIVAyEBi9NsjbqzLSr7kAn43HAcRIPSbeLyIxjpIQDDw6hhie2MMZinGENXASD6ghSKXZE2vQk4LmODglTu \
    REFRESH_JWT_SECRET=857WdqLyCOQOmelFvtJtPWOkJifyVY3ohUZSGoqCXY32j64A27WcUJsIU2eCQ0apmYRHtE7c4Pm2DW2sosWF1mNDakw0EzJ8aWOdFqDdv1OrSOa1xeiGlwCZE4UfRnmJ5EkuQ6kX6COQ \
    JWT_AUTH_TOKEN_EXPIRATION=45d \
    JWT_REFRESH_TOKEN_EXPIRATION=120d \
    LIVE_EMAIL_HOST=live.smtp.mailtrap.io \
    LIVE_EMAIL_USER=api \
    LIVE_EMAIL_PASS=f841e7d5ad4f0ac682202d7e46ae8cbd \
    LIVE_EMAIL_PORT=587 \
    REQUEST_RATE_TTL=1 \
    REQUEST_RATE_LIMIT=100 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    AZURE_BLOB_STORAGE_CONNECTION_STRING="ntSuffix=core.windows.net" \
    AZURE_BLOB_STORAGE_CONTAINER_NAME=plaventi \
    AZURE_BLOB_STORAGE_URL="https://plaventi.blob.core.windows.net/plaventi/" \
    GOOGLE_CLIENT_ID=558851748808-5ra3edjtmn6qmiivpfckb1h8narcp8uf.apps.googleusercontent.com \
    GOOGLE_CLIENT_SECRET=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 \
    AUTH_V1_SERVICE_URL=https://api-dev.plaventi.dev/api/v1 \
    ORG_v1_SERVICE_URL=https://api-dev.plaventi.dev/api/v1/em \
    STRIPE_SECRET_KEY=sk_test_51P2RdZP4Gkbi4QVGzhA52vb3Lr6URq1Lia8eW59EcBRN2sXDSKSJMvbGeZQg5kEyJ43ZdO8P3cXcYCNvgJFwlStI00CUXJIs9c \
    STRIPE_WEBHOOK_SECRET=whsec_61d082f4dee8cb92537c33c24ae25a6fef6c28499f2269810382444031848b4b


# Create a "dist" folder with the production build
RUN npm install -g @nestjs/cli@latest

RUN npm run build

# Expose port 5000
EXPOSE 5001

# Start the server using the production build
CMD ["npm", "run", "start:prod"]