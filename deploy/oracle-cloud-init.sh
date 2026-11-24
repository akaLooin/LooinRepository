#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Looin World 자동 설치 스크립트 (Oracle Cloud 인스턴스 생성 시 cloud-init 에 붙여넣기)
#  무료 서버 두 종류 모두 지원: Ampere A1 (ARM) / E2.1.Micro (AMD, 메모리 1GB)
#
#  ▼ 아래 한 줄만 바꾸세요: 앱에 입력할 접속 비밀번호 (12자 이상, 따옴표 안에)
#    (짧은 버전 deploy/oracle-cloud-init-short.sh 처럼 환경 변수로 넘겨도 됨)
LOOIN_OWNER_TOKEN="${LOOIN_OWNER_TOKEN:-여기에-나만-아는-긴-비밀번호}"
#
#  두뇌 API 키는 여기 넣지 않아요 — 설치가 끝난 뒤 앱의 "나 → 두뇌 설정"에서 넣습니다.
#  설치 기록: /var/log/looin-setup.log   |   업데이트: sudo looin-update
# ─────────────────────────────────────────────────────────────────────────────
SERVER_ZIP="https://github.com/akaLooin/LooinRepository/releases/download/server-latest/looin-server.zip"

exec > /var/log/looin-setup.log 2>&1
set -eux

# 비밀번호를 바꾸지 않았거나 너무 짧으면 설치하지 않는다 (누구나 들어올 수 있게 되므로)
case "$LOOIN_OWNER_TOKEN" in *여기에*) echo "STOP: LOOIN_OWNER_TOKEN 을 바꾸세요"; exit 1;; esac
if [ "${#LOOIN_OWNER_TOKEN}" -lt 12 ]; then echo "STOP: 비밀번호는 12자 이상"; exit 1; fi

# 메모리가 작은 서버를 위해 스왑 2GB
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y openjdk-21-jre-headless caddy unzip curl

# Oracle 우분투 이미지는 기본 방화벽이 80/443 을 막는다 → 열어준다
POS=$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
POS=${POS:-1}
iptables -I INPUT "$POS" -p tcp -m state --state NEW --dport 443 -j ACCEPT
iptables -I INPUT "$POS" -p tcp -m state --state NEW --dport 80 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi

# 서버 프로그램 설치/업데이트 명령 (GitHub 가 미리 만들어 둔 배포본을 내려받는다)
cat > /usr/local/bin/looin-update <<UPD
#!/bin/bash
set -e
tmp=\$(mktemp -d)
curl -fsSL -o "\$tmp/s.zip" "$SERVER_ZIP"
unzip -q "\$tmp/s.zip" -d "\$tmp"
rm -rf /opt/looin-server.old
[ -d /opt/looin-server ] && mv /opt/looin-server /opt/looin-server.old
mv "\$tmp"/server-* /opt/looin-server
rm -rf "\$tmp"
systemctl restart looin 2>/dev/null || true
echo "Looin 서버 업데이트 완료"
UPD
chmod +x /usr/local/bin/looin-update
looin-update

# 실행 계정, 설정(비밀번호는 root 만 읽을 수 있게)
id looin >/dev/null 2>&1 || useradd --system --home /var/lib/looin --create-home looin
MEM_MB=$(free -m | awk '/Mem:/ {print $2}')
if [ "$MEM_MB" -lt 2000 ]; then HEAP=320m; else HEAP=1g; fi
umask 077
cat > /etc/looin.env <<ENV
LOOIN_OWNER_TOKEN=$LOOIN_OWNER_TOKEN
LOOIN_DATA_DIR=/var/lib/looin
PORT=8080
LOOIN_AUTO_WORLD_HOURS=6
JAVA_OPTS="-Xmx$HEAP -XX:+UseSerialGC -Xss512k"
ENV
umask 022

cat > /etc/systemd/system/looin.service <<'UNIT'
[Unit]
Description=Looin World server
After=network-online.target
Wants=network-online.target

[Service]
User=looin
EnvironmentFile=/etc/looin.env
ExecStart=/opt/looin-server/bin/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now looin

# 서버의 공인 IP → 무료 HTTPS 도메인 (예: 140.238.1.2 → 140-238-1-2.sslip.io), Caddy 가 인증서 자동 발급
IP=$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)
DOMAIN="$(echo "$IP" | tr . -).sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	reverse_proxy localhost:8080 {
		flush_interval -1
	}
}
CADDY
systemctl restart caddy
echo "LOOIN READY: https://$DOMAIN"
