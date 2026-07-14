#!/usr/bin/env bash
# Sobe o ambiente de desenvolvimento local completo (DB + API + Web).
#
# Contorna dois problemas do ambiente atual:
#  1) O shell do VS Code roda com NoNewPrivileges=1; com SELinux Enforcing o podman
#     não consegue a transição de domínio (erro "newuidmap: Operation not permitted").
#     Solução: subir o container do Postgres via `systemd-run --user` (processo novo,
#     sem NNP, gerenciado pelo systemd do usuário).
#  2) fs.inotify.max_user_instances é baixo (128) e já fica saturado pelo VS Code,
#     então `tsx watch` e `next dev` estouram com ENOSPC. Solução: rodar a API sem
#     watch e o Next com polling (sem inotify).
#
# Uso:
#   bash scripts/dev-local.sh          # sobe tudo NO HOST (db em container, api/web via node)
#   bash scripts/dev-local.sh docker   # sobe TUDO EM CONTAINERS (podman compose)
#   bash scripts/dev-local.sh stop     # derruba tudo (host + containers)
#
# Depois: web em http://localhost:3000 · api em http://localhost:4000
# Contas demo (senha Senha@123): joao.captador@demo.com, maria.compradora@demo.com,
# admin@demo.com (equipe).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="postgresql://imob:imob@localhost:5432/imob"
export JWT_SECRET="teste-local-de-integracao-min-32-chars-ok"
export APP_WEB_URL="http://localhost:3000"
export CORS_ORIGIN="http://localhost:3000"
export BACKEND_URL="http://localhost:4000"

# podman precisa rodar fora do NoNewPrivileges (systemd --user = processo novo).
compose() {
  systemd-run --user --pipe --wait --collect --quiet --working-directory="$ROOT" \
    podman compose -f docker-compose.yml -f compose.podman.yml "$@"
}

docker_up() {
  echo "→ Subindo stack em containers (podman compose, rede do host)…"
  compose up -d --build
  # Quirk do podman-compose: o `up -d` derruba o container do db logo após subir.
  # Reinicia-o (idempotente) para deixar o Postgres de pé.
  echo "→ Garantindo o Postgres de pé…"
  podman start imob-parcerias_db_1 >/dev/null 2>&1 || true
  sleep 4
  echo
  echo "✔ Containers:"
  podman ps --format '   {{.Names}}  {{.Status}}' | grep imob || true
  echo "   Web:  http://localhost:3000   ·   API: http://localhost:4000"
  echo "   Parar: bash scripts/dev-local.sh stop"
}

docker_down() {
  echo "→ Derrubando containers…"
  compose down 2>/dev/null || true
}

stop() {
  echo "→ Derrubando stack local…"
  pkill -f "tsx src/server.ts" 2>/dev/null || true
  pkill -f "next dev -p 3000" 2>/dev/null || true
  systemctl --user stop imob-db 2>/dev/null || true
  systemctl --user reset-failed imob-db 2>/dev/null || true
  podman rm -f imob-test-db 2>/dev/null || true
  docker_down
  echo "✔ parado."
}

case "${1:-}" in
  stop)   stop; exit 0 ;;
  docker) docker_up; exit 0 ;;
esac

# 1) Postgres via systemd --user (evita o NoNewPrivileges/SELinux) --------------
if ! systemctl --user is-active --quiet imob-db; then
  echo "→ Subindo Postgres (serviço de usuário imob-db)…"
  systemctl --user reset-failed imob-db 2>/dev/null || true
  podman rm -f imob-test-db 2>/dev/null || true
  systemd-run --user --unit=imob-db --collect \
    podman run --rm --replace --name imob-test-db \
    -p 5432:5432 \
    -e POSTGRES_USER=imob -e POSTGRES_PASSWORD=imob -e POSTGRES_DB=imob \
    docker.io/library/postgres:16-alpine
else
  echo "→ Postgres já ativo."
fi

echo "→ Aguardando Postgres…"
for _ in $(seq 1 30); do
  if podman exec imob-test-db pg_isready -U imob -d imob >/dev/null 2>&1; then break; fi
  sleep 1
done

# 2) Migrações + seeds ----------------------------------------------------------
echo "→ Migrações…"
npm run migrate --workspace apps/api >/dev/null
# Seeds são opcionais (a base pode já estar populada) — não abortam o boot.
if [[ "${SEED:-1}" == "1" ]]; then
  echo "→ Seed demo + admin (SEED=0 para pular)…"
  npm run seed:demo --workspace apps/api >/dev/null 2>&1 || echo "  (seed demo pulado — base já populada)"
  ADMIN_NOME="Admin Demo" ADMIN_EMAIL="admin@demo.com" ADMIN_SENHA="Senha@123" \
    npm run seed:admin --workspace apps/api >/dev/null 2>&1 || echo "  (seed admin pulado)"
fi

# 3) API (sem watch) + Web (com polling) — evita o limite de inotify ------------
echo "→ API em http://localhost:4000 …"
pkill -f "tsx src/server.ts" 2>/dev/null || true
( cd apps/api && nohup npx tsx src/server.ts > /tmp/imob-api.log 2>&1 & )

echo "→ Web em http://localhost:3000 …"
pkill -f "next dev -p 3000" 2>/dev/null || true
WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true \
  nohup npm run dev --workspace apps/web > /tmp/imob-web.log 2>&1 &

sleep 8
echo
echo "✔ Pronto:"
echo "   Web:  http://localhost:3000   (log: /tmp/imob-web.log)"
echo "   API:  http://localhost:4000   (log: /tmp/imob-api.log)"
echo "   Demo: joao.captador@demo.com / admin@demo.com — senha Senha@123"
echo "   Parar: bash scripts/dev-local.sh stop"
