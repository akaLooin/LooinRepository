#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Looin World 자동 설치 스크립트 (Oracle Cloud 인스턴스 생성 시 cloud-init 에 붙여넣기)
#
#  ▼ 아래 한 줄만 바꾸세요: 앱에 입력할 접속 비밀번호 (영문+숫자 20자 이상 추천, 따옴표 안에)
#    (짧은 버전 deploy/oracle-cloud-init-short.sh 처럼 환경 변수로 넘겨도 됨)
LOOIN_OWNER_TOKEN="${LOOIN_OWNER_TOKEN:-여기에-나만-아는-긴-비밀번호}"
#
#  두뇌 API 키는 여기 넣지 않아요 — 설치가 끝난 뒤 앱의 "나 → 두뇌 설정"에서 넣습니다.
#  설치 기록: 서버의 /var/log/looin-setup.log
# ─────────────────────────────────────────────────────────────────────────────
REPO="https://github.com/akaLooin/LooinRepository.git"
BRANCH="claude/personal-ai-world-platform-0vh9be"

exec > /var/log/looin-setup.log 2>&1
set -eux

# 비밀번호를 바꾸지 않았거나 너무 짧으면 설치하지 않는다 (누구나 들어올 수 있게 되므로)
case "$LOOIN_OWNER_TOKEN" in *여기에*) echo "STOP: LOOIN_OWNER_TOKEN 을 바꾸세요"; exit 1;; esac
if [ "${#LOOIN_OWNER_TOKEN}" -lt 12 ]; then echo "STOP: 비밀번호는 12자 이상"; exit 1; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 git curl
systemctl enable --now docker

# Oracle 우분투 이미지는 기본 방화벽이 80/443 을 막는다 → 열어준다
POS=$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
POS=${POS:-1}
iptables -I INPUT "$POS" -p tcp -m state --state NEW --dport 443 -j ACCEPT
iptables -I INPUT "$POS" -p tcp -m state --state NEW --dport 80 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi

if [ ! -d /opt/looin ]; then
  git clone --depth 1 -b "$BRANCH" "$REPO" /opt/looin
fi
cd /opt/looin

# 서버의 공인 IP → 무료 HTTPS 도메인 (예: 140.238.1.2 → 140-238-1-2.sslip.io)
IP=$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)
DOMAIN="$(echo "$IP" | tr . -).sslip.io"

if [ ! -f .env ]; then
  umask 077
  cat > .env <<ENV
LOOIN_OWNER_TOKEN=$LOOIN_OWNER_TOKEN
LOOIN_DOMAIN=$DOMAIN
LOOIN_AUTO_WORLD_HOURS=6
ENV
fi

docker compose up -d --build
echo "LOOIN READY: https://$DOMAIN"
