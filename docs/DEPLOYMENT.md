# Production Deployment & Infrastructure Guide

## Docker Compose Stack
```yaml
version: '3.8'

services:
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: laptopguard
      POSTGRES_USER: guard_admin
      POSTGRES_PASSWORD: secure_pg_password_2026!
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./laptopguard-ai
      dockerfile: Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://guard_admin:secure_pg_password_2026!@database:5432/laptopguard
      LAPTOPGUARD_SECRET_KEY: ${SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - database

  web:
    build:
      context: ./laptopguard-ai/apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

## TURN / STUN Configuration
For symmetric enterprise NAT traversal, deploy `coturn`:
```bash
sudo apt-get install coturn
# Configure /etc/turnserver.conf with realm, listening-port 3478, and TLS certificates
```
