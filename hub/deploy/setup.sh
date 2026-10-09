#!/usr/bin/env bash
# Instala o DayliShoot Hub em Ubuntu (Oracle Cloud Always Free ou qualquer VPS).
# Uso (na pasta do projeto, dentro do servidor):  ./deploy/setup.sh seu-dominio.com
set -euo pipefail
DOMAIN="${1:?Informe o dominio. Ex.: ./deploy/setup.sh hub.meusite.com.br}"
APP=/opt/dayshoot-hub; ENVF=/etc/dayshoot-hub.env

sudo apt-get update
sudo apt-get install -y curl gpg apt-transport-https iptables-persistent

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Caddy (HTTPS automatico)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update && sudo apt-get install -y caddy

# Firewall do sistema (imagens Oracle bloqueiam tudo por padrao)
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Aplicacao
id hub &>/dev/null || sudo useradd --system --home "$APP" --shell /usr/sbin/nologin hub
sudo mkdir -p "$APP/data"; sudo cp server.js finance.js auth.js painel.html "$APP/"; sudo chown -R hub:hub "$APP"

# Variaveis (chaves geradas aqui; voce preenche so as do Mercado Livre)
if [ ! -f "$ENVF" ]; then
  sudo tee "$ENVF" >/dev/null <<EOT
ML_APP_ID=
ML_CLIENT_SECRET=
ML_REDIRECT_URI=https://$DOMAIN/ml/callback
ML_AUTH_HOST=https://auth.mercadolivre.com.br
TOKEN_ENC_KEY=$(openssl rand -hex 32)
STORE_API_KEY=$(openssl rand -hex 24)
ADMIN_PASSWORD=$(openssl rand -base64 18)
ANTHROPIC_API_KEY=
PORT=3000
EOT
  sudo chmod 600 "$ENVF"
fi

# Servico (reinicia sozinho se cair ou apos reboot)
sudo tee /etc/systemd/system/dayshoot-hub.service >/dev/null <<EOT
[Unit]
Description=DayliShoot Hub
After=network-online.target
[Service]
User=hub
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOT

echo "$DOMAIN { reverse_proxy localhost:3000 }" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now dayshoot-hub
sudo systemctl restart caddy
echo "Pronto. Falta: editar $ENVF (ML_APP_ID, ML_CLIENT_SECRET) e rodar: sudo systemctl restart dayshoot-hub"
echo "Teste: https://$DOMAIN/health"
echo "Painel: https://$DOMAIN/painel  (senha: sudo grep ADMIN_PASSWORD $ENVF)"
