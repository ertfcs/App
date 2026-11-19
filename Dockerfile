# Appartamento Matteo — app web + API in un solo servizio (Render, o qualsiasi host Docker).

# 1) Build del frontend (Expo web) in /web/dist
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/yarn.lock frontend/.npmrc ./
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000
COPY frontend/ ./
RUN EXPO_PUBLIC_BACKEND_URL="" CI=1 npx expo export -p web --output-dir dist

# 2) Backend FastAPI che serve anche il frontend
FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY --from=web /web/dist frontend/dist
WORKDIR /app/backend
ENV FRONTEND_DIST=/app/frontend/dist \
    STORAGE_BACKEND=mongo \
    PYTHONUNBUFFERED=1
EXPOSE 8001
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
