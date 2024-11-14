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
    AZURE_BLOB_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=plaventi;AccountKey=YhqZXgXHYlgHo5+7PCT8MbHatgWV6ddeCFVbT8s+fAGNAwXt1kcJVWZq64thgayS8ABjirJkkEcT+AStg+pqUQ==;EndpointSuffix=core.windows.net" \
    AZURE_BLOB_STORAGE_CONTAINER_NAME=plaventi-blob \
    AZURE_BLOB_STORAGE_URL="plaventi.blob.core.windows.net/plaventi-blob" \
    GOOGLE_CLIENT_ID=872959448201-13gs723gl47ogl4luk3e1dkkn06k897o.apps.googleusercontent.com \
    GOOGLE_CLIENT_SECRET=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 \
    AUTH_V1_SERVICE_URL=https://api-dev.plaventi.dev/api/v1 \
    ORG_v1_SERVICE_URL=https://api-dev.plaventi.dev/api/v1/em \
    STRIPE_SECRET_KEY=sk_test_51P2RdZP4Gkbi4QVGzhA52vb3Lr6URq1Lia8eW59EcBRN2sXDSKSJMvbGeZQg5kEyJ43ZdO8P3cXcYCNvgJFwlStI00CUXJIs9c \
    STRIPE_WEBHOOK_SECRET=whsec_aRAJo9RcOrwEYTp5ZDVbyF5fG5acmyC0 \
    STRIPE_REDIRECT_URI="http://localhost:3000" \
    STRIPE_PRO_PRICE_ID=price_1PzIaLP4Gkbi4QVGJIZyh90i \
    STRIPE_PREMIUM_PRICE_ID=price_1PzIckP4Gkbi4QVG4arwRvz6 \
    STRIPE_SUBSCRIPTION_SUCCESS_URI="http://localhost:3000/subscription-result" \
    STRIPE_SUBSCRIPTION_CANCEL_URI="http://localhost:3000/organizer" \
    FRONTEND_URL="http://localhost:3000/invitation" \
    FORM_URL="https://google.com" \
    IP_INFO_TOKEN=9c61bdc3b30ad4

# Create a "dist" folder with the production build
RUN npm install -g @nestjs/cli@latest

RUN npm run build

# Expose port 5000
EXPOSE 5001

# Start the server using the production build
CMD ["npm", "run", "start:prod"]