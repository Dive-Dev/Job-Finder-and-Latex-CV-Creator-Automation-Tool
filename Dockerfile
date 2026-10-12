# --- STAGE 1: Build React + Chakra UI Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Python Runtime Environment ---
FROM python:3.11-slim

# Install system dependencies (curl, texlive for local PDF compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Copy compiled React Chakra UI dist from builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 5000

ENV PORT=5000 \
    PYTHONUNBUFFERED=1

CMD ["python", "app.py"]
