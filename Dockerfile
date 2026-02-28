FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Build the vanilla example for serving
RUN npx vite build --config vite.config.ts --mode production examples/vanilla

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html/dist
COPY --from=builder /app/examples/vanilla/index.html /usr/share/nginx/html/index.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
