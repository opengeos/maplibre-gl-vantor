FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Build the vanilla example using its own vite config
RUN npx vite build -c examples/vanilla/vite.config.ts

FROM nginx:alpine

COPY --from=builder /app/examples/vanilla/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
