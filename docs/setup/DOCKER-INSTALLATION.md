# Docker Installation Guide - Debian Linux

**System:** Debian GNU/Linux 13 (trixie)  
**Date:** 2026-02-27  
**Purpose:** Local development and testing for PisosRealView Pro

---

## ⚠️ MX Linux Users - Read This First!

**MX Linux instala Docker como `docker.io` e pode ter problemas de PATH/permissões.**

### Solução Rápida (Recomendada)

Execute o script de correção automática:

```bash
cd /home/vector/Transferências/pisosrealview-pro
chmod +x scripts/fix-docker-mxlinux.sh
./scripts/fix-docker-mxlinux.sh
```

O script irá:
1. ✅ Verificar instalação do docker.io
2. ✅ Criar symlink `/usr/local/bin/docker` → `/usr/bin/docker.io`
3. ✅ Adicionar usuário ao grupo docker
4. ✅ Iniciar serviço Docker
5. ✅ Configurar PATH no .bashrc
6. ✅ Testar funcionamento

**Após executar o script:**
- Se pedir logout: faça logout e login novamente
- Teste: `docker --version`
- Teste: `docker ps` (sem sudo)

### Solução Manual (Se o script falhar)

```bash
# 1. Criar symlink
sudo ln -sf /usr/bin/docker.io /usr/local/bin/docker

# 2. Adicionar ao grupo docker
sudo usermod -aG docker $USER

# 3. Configurar PATH
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 4. Iniciar serviço
sudo systemctl start docker
sudo systemctl enable docker

# 5. LOGOUT e LOGIN novamente

# 6. Testar
docker --version
docker ps
```

### Verificação de Problemas Comuns

```bash
# Verificar onde está o docker
which docker.io          # Deve retornar: /usr/bin/docker.io
which docker             # Deve retornar: /usr/local/bin/docker

# Verificar serviço
sudo systemctl status docker

# Verificar grupo
groups                   # Deve incluir 'docker'

# Testar com caminho completo
/usr/bin/docker.io --version
```

**Se ainda tiver problemas:** Veja a seção "Troubleshooting" abaixo.

---

## Quick Installation

For most users, this is the fastest way to get Docker running:

```bash
# 1. Update package index
sudo apt-get update

# 2. Install Docker and Docker Compose
sudo apt-get install -y docker.io docker-compose

# 3. Add your user to the docker group (to run without sudo)
sudo usermod -aG docker $USER

# 4. Apply group changes (choose one):
# Option A: Logout and login again
# Option B: Run this command (temporary for current session)
newgrp docker

# 5. Verify installation
docker --version
docker-compose --version
docker ps
```

---

## Detailed Installation Steps

### Step 1: Update System Packages

```bash
sudo apt-get update
```

This ensures you have the latest package information.

### Step 2: Install Docker Engine

```bash
sudo apt-get install -y docker.io
```

This installs:
- Docker Engine (daemon)
- Docker CLI (command-line interface)
- containerd (container runtime)

**Expected Output:**
```
Reading package lists... Done
Building dependency tree... Done
...
Setting up docker.io (XX.X.X-X) ...
```

### Step 3: Install Docker Compose

```bash
sudo apt-get install -y docker-compose
```

Docker Compose is used for multi-container applications (not strictly needed for PisosRealView Pro, but useful).

### Step 4: Configure User Permissions

By default, Docker requires `sudo` to run. To run Docker commands without `sudo`:

```bash
sudo usermod -aG docker $USER
```

**Important:** This change requires you to logout and login again, OR run:

```bash
newgrp docker
```

### Step 5: Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 24.0.x, build xxxxx

# Check Docker Compose version
docker-compose --version
# Expected: docker-compose version 1.29.x, build xxxxx

# Test Docker is running
docker ps
# Expected: Empty list (no containers running yet)

# Test with hello-world image
docker run hello-world
# Expected: "Hello from Docker!" message
```

---

## Troubleshooting

### Issue: "permission denied" when running docker

**Symptom:**
```
Got permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes (logout/login or run):
newgrp docker

# Verify
docker ps
```

### Issue: Docker daemon not running

**Symptom:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
```bash
# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

### Issue: Docker service fails to start

**Symptom:**
```
Job for docker.service failed
```

**Solution:**
```bash
# Check logs
sudo journalctl -u docker.service -n 50

# Common fix: Remove old Docker data
sudo rm -rf /var/lib/docker
sudo systemctl restart docker
```

---

## Post-Installation Configuration

### Enable Docker to Start on Boot

```bash
sudo systemctl enable docker
```

### Configure Docker to Use Less Disk Space (Optional)

Create `/etc/docker/daemon.json`:

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:

```bash
sudo systemctl restart docker
```

---

## Next Steps for PisosRealView Pro

Once Docker is installed and verified:

1. **Build the Docker image:**
   ```bash
   cd /home/vector/Transferências/pisosrealview-pro
   docker build -t pisosrealview-pro:local .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 --env-file .env pisosrealview-pro:local
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:8080/api/health
   ```

See `.kiro/specs/multi-provider-ai-architecture/tasks.md` for detailed testing steps.

---

## Alternative: Docker Desktop (Not Recommended for Debian)

Docker Desktop is primarily for Windows and macOS. For Debian/Linux, the command-line Docker Engine (installed above) is the standard and recommended approach.

---

## Resources

- **Docker Documentation:** https://docs.docker.com/engine/install/debian/
- **Docker Compose Documentation:** https://docs.docker.com/compose/
- **PisosRealView Pro Tasks:** `.kiro/specs/multi-provider-ai-architecture/tasks.md`
- **Dockerfile:** `./Dockerfile`

---

## Security Notes

- Docker requires root privileges to run. The `docker` group grants equivalent root access.
- Only add trusted users to the `docker` group.
- For production deployments, use Cloud Run (managed service) instead of self-hosted Docker.

---

## Estimated Time

- Installation: 5-10 minutes
- Configuration: 2-5 minutes
- Verification: 2 minutes
- **Total: ~15-20 minutes**

---

## Status Checklist

- [ ] Docker installed (`docker --version` works)
- [ ] Docker Compose installed (`docker-compose --version` works)
- [ ] User added to docker group (`docker ps` works without sudo)
- [ ] Docker service running (`sudo systemctl status docker` shows active)
- [ ] Hello-world test passed (`docker run hello-world` succeeds)

Once all items are checked, proceed to Task 2 in the implementation plan.
