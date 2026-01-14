# 🚀 Guía de Deployment - Elasticsearch Customer Reactivation API

## 📋 Información del Servidor

| Parámetro | Valor |
|-----------|-------|
| **Servidor** | Azure Ubuntu 24.04 LTS |
| **IP** | `172.191.128.24` |
| **Usuario** | `azureuser` |
| **Dominio** | `elastic-search.ezekl.com` |
| **Puerto App** | `9002` |
| **Puerto Nginx** | `443` (HTTPS) |

---

## ✅ GitHub Secrets Requeridos

Configura estos secrets en **GitHub → Repository → Settings → Secrets and variables → Actions**:

### 1. Servidor SSH (3 secrets)

```
SSH_HOST = 172.191.128.24
SSH_USER = azureuser
SSH_PRIVATE_KEY = [contenido del archivo id_rsa.pem]
```

### 2. Elasticsearch (2 secrets)

```
ELASTIC_SEARCH_ENDPOINT = https://tu-cluster.es.region.cloud.elastic.co:443
ELASTIC_SEARCH_API_KEY = tu-api-key-base64
```

**Total: 5 secrets**

---

## 🔐 Configuración del Servidor (Una sola vez)

### Paso 1: Conectarse al servidor

```bash
ssh -i /Users/ezequielbaltodanocubillo/Documents/ezekl/elastic-search/certs/id_rsa.pem azureuser@172.191.128.24
```

### Paso 2: Crear estructura de directorios

```bash
# Crear directorio del proyecto
sudo mkdir -p /home/azureuser/projects/elasticsearch-api
sudo chown -R azureuser:azureuser /home/azureuser/projects/elasticsearch-api

# Crear directorios para datos persistentes
mkdir -p /home/azureuser/projects/elasticsearch-api/{exports,logs}
```

### Paso 3: Instalar certificados SSL

```bash
# Crear directorio para certificados
sudo mkdir -p /etc/nginx/ssl/elastic-search.ezekl.com
sudo chmod 700 /etc/nginx/ssl/elastic-search.ezekl.com

# Copiar certificados (desde tu máquina local)
# En tu máquina local:
scp -i certs/id_rsa.pem certs/clickeat.cer azureuser@172.191.128.24:/tmp/origin-cert.pem
scp -i certs/id_rsa.pem certs/clickeat.key azureuser@172.191.128.24:/tmp/origin-key.pem

# En el servidor:
sudo mv /tmp/origin-cert.pem /etc/nginx/ssl/elastic-search.ezekl.com/
sudo mv /tmp/origin-key.pem /etc/nginx/ssl/elastic-search.ezekl.com/
sudo chmod 644 /etc/nginx/ssl/elastic-search.ezekl.com/origin-cert.pem
sudo chmod 600 /etc/nginx/ssl/elastic-search.ezekl.com/origin-key.pem
sudo chown root:root /etc/nginx/ssl/elastic-search.ezekl.com/*
```

### Paso 4: Configurar Nginx

```bash
# Copiar configuración de Nginx (desde tu máquina local)
scp -i certs/id_rsa.pem certs/elastic-search.ezekl.com.nginx.conf azureuser@172.191.128.24:/tmp/

# En el servidor:
sudo mv /tmp/elastic-search.ezekl.com.nginx.conf /etc/nginx/sites-available/elastic-search.ezekl.com

# Crear symlink
sudo ln -sf /etc/nginx/sites-available/elastic-search.ezekl.com /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### Paso 5: Configurar Firewall

```bash
# Permitir puertos necesarios
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Activar firewall (si no está activo)
sudo ufw enable

# Verificar estado
sudo ufw status verbose
```

---

## ☁️ Configuración de Cloudflare

### 1. Agregar registro DNS

**Dashboard de Cloudflare** → `ezekl.com` → **DNS** → **Records**

```
Type: A
Name: elastic-search
IPv4 address: 172.191.128.24
Proxy status: ✅ Proxied (naranja)
TTL: Auto
```

### 2. Configurar SSL/TLS

**SSL/TLS** → **Overview**
- Modo de encriptación: **Full (strict)** ✅

**SSL/TLS** → **Edge Certificates**
- Minimum TLS Version: `TLS 1.2`
- Automatic HTTPS Rewrites: ✅ On
- Always Use HTTPS: ✅ On

### 3. Verificar propagación DNS

```bash
dig elastic-search.ezekl.com
nslookup elastic-search.ezekl.com
```

---

## 🚀 Deployment Automático

### Hacer Push a Main

```bash
# Agregar cambios
git add .

# Commit
git commit -m "feat: deploy elasticsearch api to production"

# Push a main (esto inicia el deployment automático)
git push origin main
```

### Monitorear Deployment

1. Ve a **GitHub** → **Actions**
2. Verás el workflow "Deploy Elasticsearch API to Azure Server" ejecutándose
3. Click en el workflow para ver logs en tiempo real
4. El deployment toma **~5-10 minutos**

---

## 🔍 Verificación Post-Deployment

### 1. Verificar contenedores Docker

```bash
ssh -i certs/id_rsa.pem azureuser@172.191.128.24

# Ver contenedores activos
docker ps --filter "name=elasticsearch-api"

# Ver logs
docker logs elasticsearch-api-blue
# o
docker logs elasticsearch-api-green
```

### 2. Verificar endpoints

```bash
# Health check
curl https://elastic-search.ezekl.com/health

# API documentation
curl https://elastic-search.ezekl.com/

# Test API
curl -X POST https://elastic-search.ezekl.com/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{"filters": {}}'
```

### 3. Verificar SSL

```bash
# Test SSL
curl -I https://elastic-search.ezekl.com

# SSL Labs (grade A/A+)
# https://www.ssllabs.com/ssltest/analyze.html?d=elastic-search.ezekl.com
```

---

## 🔄 Blue-Green Deployment

El sistema usa **Blue-Green deployment** para zero-downtime:

1. **Build** nueva imagen Docker
2. **Start** nuevo contenedor (Blue o Green)
3. **Health checks** (30 intentos, 2s intervalo)
4. **Smoke tests** para validar funcionamiento
5. **Stop** contenedor antiguo
6. **Cleanup** imágenes no usadas

### Contenedores

| Container | Puerto | Estado |
|-----------|--------|--------|
| `elasticsearch-api-blue` | 3000 | Activo o Inactivo |
| `elasticsearch-api-green` | 3000 | Activo o Inactivo |

Solo uno está activo a la vez.

---

## 📊 Arquitectura

```
┌─────────────┐
│  Internet   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│  Cloudflare (CDN + WAF)      │
│  - TLS 1.3                   │
│  - DDoS Protection           │
│  - Cache                     │
└──────────┬───────────────────┘
           │ HTTPS (Full Strict)
           ▼
┌──────────────────────────────┐
│  Nginx :443                  │
│  - Origin CA Certificates    │
│  - Reverse Proxy             │
│  - Gzip Compression          │
└──────────┬───────────────────┘
           │ HTTP :9002
           ▼
┌──────────────────────────────┐
│  Docker Container :9002      │
│  ┌─────────────────────────┐ │
│  │  Node.js + Express      │ │
│  │  - Elasticsearch API    │ │
│  │  - Customer Service     │ │
│  └─────────────────────────┘ │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Elasticsearch Cluster       │
│  - Full-text search          │
│  - Analytics                 │
└──────────────────────────────┘
```

---

## 🛠️ Comandos Útiles

### En el Servidor

```bash
# Ver estado de contenedores
docker ps -a --filter "name=elasticsearch-api"

# Ver logs en tiempo real
docker logs -f elasticsearch-api-blue

# Verificar uso de recursos
docker stats elasticsearch-api-blue

# Reiniciar contenedor manualmente
docker restart elasticsearch-api-blue

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/elastic-search.ezekl.com-access.log
sudo tail -f /var/log/nginx/elastic-search.ezekl.com-error.log

# Test health desde el servidor
curl http://localhost:3000/health
```

### Desde tu Máquina Local

```bash
# Test API
curl https://elastic-search.ezekl.com/health

# Ver headers de respuesta
curl -I https://elastic-search.ezekl.com

# Test búsqueda
curl -X POST https://elastic-search.ezekl.com/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{"filters": {"status": "inactive"}}'
```

---

## 🐛 Troubleshooting

### Deployment falla

1. **Ver logs en GitHub Actions**
   - GitHub → Actions → Click en el workflow fallido
   - Expandir cada step para ver detalles

2. **SSH al servidor y revisar**
   ```bash
   ssh -i certs/id_rsa.pem azureuser@172.191.128.24
   cd /home/azureuser/projects/elasticsearch-api
   docker ps -a
   docker logs elasticsearch-api-blue
   ```

### Health check falla

```bash
# En el servidor
docker exec elasticsearch-api-blue node -e "require('http').get('http://localhost:9002/health', (res) => console.log(res.statusCode))"

# Ver logs del contenedor
docker logs elasticsearch-api-blue

# Verificar conexión a Elasticsearch
docker exec elasticsearch-api-blue curl http://localhost:9002/health -v
```

### 502 Bad Gateway

```bash
# Verificar que el contenedor está corriendo
docker ps --filter "name=elasticsearch-api"

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/elastic-search.ezekl.com-error.log

# Verificar que el puerto 9002 está escuchando
netstat -tuln | grep 9002
```

### SSL errors

```bash
# Verificar certificados
sudo openssl x509 -in /etc/nginx/ssl/elastic-search.ezekl.com/origin-cert.pem -text -noout | grep -E "Subject:|Issuer:|Not After"

# Verificar configuración SSL en Nginx
sudo nginx -T | grep ssl

# Test SSL
curl -vI https://elastic-search.ezekl.com
```

---

## 🔄 Rollback Manual

Si necesitas hacer rollback:

```bash
# SSH al servidor
ssh -i certs/id_rsa.pem azureuser@172.191.128.24

# Ver imágenes disponibles
docker images elasticsearch-api

# Detener contenedor actual
docker stop elasticsearch-api-blue  # o green

# Iniciar con imagen anterior
docker run -d \
  --name elasticsearch-api-rollback \
  --network host \
  --restart unless-stopped \
  --env-file /home/azureuser/projects/elasticsearch-api/.env \
  -v /home/azureuser/projects/elasticsearch-api/exports:/app/exports \
  -v /home/azureuser/projects/elasticsearch-api/logs:/app/logs \
  elasticsearch-api:previous-tag

# Verificar
docker ps
curl http://localhost:9002/health
```

---

## 📞 URLs de Producción

| Tipo | URL |
|------|-----|
| **Frontend** | https://elastic-search.ezekl.com |
| **API Docs** | https://elastic-search.ezekl.com/ |
| **Health Check** | https://elastic-search.ezekl.com/health |
| **API Base** | https://elastic-search.ezekl.com/api/ |

---

## 📝 Checklist de Deployment

- [ ] GitHub Secrets configurados (5 secrets)
- [ ] Certificados SSL instalados en servidor
- [ ] Nginx configurado y funcionando
- [ ] Cloudflare DNS configurado (Proxied)
- [ ] Cloudflare SSL/TLS en Full (strict)
- [ ] Firewall configurado (22, 80, 443)
- [ ] Directorios creados en servidor
- [ ] Push a main realizado
- [ ] Deployment exitoso en GitHub Actions
- [ ] Health check responde 200 OK
- [ ] SSL grade A/A+ en SSL Labs
- [ ] API endpoints funcionando correctamente

---

¡Listo para deployment! 🚀
