# 서버를 무료 클라우드에 올리기

내 PC 를 켜둘 필요 없이, 무료 클라우드 서버에서 Looin World 서버가 24시간 돌아가게 합니다.
**한 번만 설치하면 그 뒤로는 신경 쓸 일이 거의 없어요** (자동 재시작 설정 포함).

## 추천: Oracle Cloud "Always Free"

- 평생 무료인 ARM 서버. Looin World 서버(가벼운 Kotlin 서버 + SQLite)에는 충분해요.
- 2026년 6월부터 무료 한도가 **ARM 2코어 / 12GB 메모리**로 줄었다는 보도가 있어요. 그래도 이 서버에는 넉넉해요.
  가입 전에 [공식 무료 등급 안내](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm)에서 현재 한도를 확인하세요.
- 주의할 점
  - 가입할 때 본인 확인용으로 카드가 필요해요 (무료 자원만 쓰면 청구되지 않아요).
  - 지역에 따라 "Out of capacity"로 ARM 서버 생성이 안 될 때가 있어요 → 시간을 두고 다시 시도하거나 다른 가용 영역 선택.
  - 무료 한도를 넘는 크기로 만들면 서버가 정지될 수 있으니 **2 OCPU / 12GB 이하**로 만드세요.

### 1) 서버 만들기
1. Oracle Cloud 가입 → 홈 지역은 가까운 곳 (예: 서울/춘천).
2. *Compute → Instances → Create instance*
   - Image: **Ubuntu 24.04**
   - Shape: **Ampere (VM.Standard.A1.Flex)**, OCPU 1~2 / Memory 6~12GB
   - SSH 키: "Generate a key pair" → 개인 키 파일을 꼭 저장
3. 만들어지면 표시되는 **Public IP** 를 메모.

### 2) 접속해서 설치하기 (복사·붙여넣기)
PC 터미널(Windows 는 PowerShell)에서:
```bash
ssh -i 저장한개인키파일 ubuntu@서버IP
```
서버 안에서:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
git clone https://github.com/akaLooin/LooinRepository.git looin && cd looin
cp .env.example .env
nano .env          # 토큰과 무료 두뇌 키 입력 후 Ctrl+O, Enter, Ctrl+X
sudo docker compose up -d --build     # 처음엔 빌드에 몇 분 걸려요
sudo docker compose logs -f           # "Looin World 서버 시작" 이 보이면 성공 (Ctrl+C 로 나가기)
```
> 저장소가 비공개라면 `git clone` 때 GitHub 아이디와 **Personal access token**(비밀번호 대신)을 입력하세요.

### 3) 폰에서 안전하게 접속하기 — Tailscale (무료, 추천)
서버 포트를 인터넷에 열지 않고, 내 기기끼리만 연결되는 사설망을 만듭니다.
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up        # 나오는 링크로 로그인
tailscale ip -4          # 100.x.x.x 형태의 주소 메모
```
폰과 PC 에도 Tailscale 앱을 설치하고 같은 계정으로 로그인 → Looin World 앱의 서버 주소에 `http://100.x.x.x:8080` 입력.

> 인터넷에 직접 공개하고 싶다면 Oracle 보안 목록(Security List)에서 포트를 열고 도메인 + HTTPS(Caddy 등)를 붙여야 해요.
> 혼자 쓰는 단계에서는 Tailscale 이 훨씬 간단하고 안전합니다.

### 업데이트할 때
```bash
cd looin && git pull && sudo docker compose up -d --build
```
데이터(`looin/data/`)는 그대로 유지돼요. 가끔 `data/looin.db` 를 다른 곳에 복사해 백업해 두세요.

## 다른 선택지
- **Google Cloud 무료 e2-micro**: 메모리가 1GB 라 빠듯하지만 가능. 역시 카드 등록 필요.
- **집 PC**: `docker compose up -d` 또는 `./gradlew :server:run`. 꺼지면 세계도 멈춰요.
- **(나중에) 서버 없는 모드**: 폰 안에서 모든 걸 돌리는 방식도 가능하지만 PC 와의 동기화가 어려워 지금은 보류.
