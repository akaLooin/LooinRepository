# 서버를 무료 클라우드에 올리기 (폰만으로 가능)

Oracle Cloud "Always Free" 서버에 Looin World 를 설치합니다. **명령어를 칠 필요가 없어요** —
서버를 만들 때 설치 스크립트를 붙여넣으면 자동으로 설치되고, API 키는 앱에서 넣습니다.

## 1) 서버 만들기 (Oracle 콘솔)
1. 메뉴 ☰ → **컴퓨트 → 인스턴스** → **인스턴스 생성**
2. 이름: `looin`
3. **이미지**: Canonical **Ubuntu 24.04**
4. **Shape**: **Ampere → VM.Standard.A1.Flex**, OCPU **2** / 메모리 **12GB** ("항상 무료 적격" 표시 확인. 안 되면 1 / 6)
5. **네트워킹**: 새 VCN 생성(기본값), **공용 IPv4 주소 자동 할당 켜기**
6. **SSH 키**: "개인 키 저장"으로 내려받아 보관 (나중에 직접 들어갈 일이 생길 때만 필요)
7. **고급 옵션 → 관리(Management) → cloud-init 스크립트 붙여넣기**:
   [`deploy/oracle-cloud-init.sh`](../deploy/oracle-cloud-init.sh) 내용을 통째로 붙여넣고,
   맨 위 `LOOIN_OWNER_TOKEN="…"` 의 따옴표 안을 **나만 아는 긴 비밀번호**로 바꾸기
8. **생성** → 상태가 "실행 중"이 되면 **공용 IP 주소**를 메모

## 2) 문 열기 (80, 443 포트)
1. 인스턴스 화면 → **서브넷** 링크 → **보안 목록(Default Security List)** → **수신 규칙 추가**
2. 소스 CIDR `0.0.0.0/0`, IP 프로토콜 TCP, 대상 포트 `80,443` → 추가

## 3) 기다리기
설치·빌드에 **10~20분** 걸려요 (무료 서버라 첫 빌드가 느림). 그 사이에 HTTPS 인증서도 자동으로 발급돼요.

## 4) 앱에서 접속
1. 앱의 **서버 주소**에 **공용 IP** 를 그대로 입력 (예: `140.238.12.34`) → 자동으로 `https://140-238-12-34.sslip.io` 로 연결
2. **접속 토큰**에 1)-7 에서 정한 비밀번호
3. **나 → 🧠 두뇌 설정**에서 Claude 키, 크레딧 날짜(25), Gemini 키 등을 넣고 저장 → 바로 아카엘이 깨어나요

## 문제가 생기면
- 20분이 지나도 접속이 안 되면: 2)의 포트를 열었는지 확인
- 그래도 안 되면 Oracle 콘솔의 **Cloud Shell** 에서 SSH 로 들어가 `sudo cat /var/log/looin-setup.log` 로 설치 기록 확인
- 업데이트: 서버에서 `cd /opt/looin && sudo git pull && sudo docker compose up -d --build`
- 백업: `/opt/looin/data/` 폴더 (대화·기억·설정이 모두 여기 있음)

## 다른 선택지
- **집 PC**: `docker compose up -d --build` 후 앱에 `http://PC내부IP:8080` 입력 (같은 Wi-Fi 에서만)
- **Tailscale**: 포트를 열지 않고 내 기기끼리만 연결하고 싶을 때
