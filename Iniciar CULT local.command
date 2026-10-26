#!/bin/zsh
cd "$(dirname "$0")"
if ! curl --silent --fail --max-time 2 http://127.0.0.1:4173/api/availability >/dev/null; then
  mkdir -p .sites-runtime
  nohup npm run dev -- --port 4173 --hostname 127.0.0.1 > .sites-runtime/cult-local.log 2>&1 < /dev/null &
  echo $! > .sites-runtime/cult-local.pid
  for attempt in {1..30}; do
    if curl --silent --fail --max-time 1 http://127.0.0.1:4173/api/availability >/dev/null; then break; fi
    sleep 0.5
  done
fi
if curl --silent --fail --max-time 2 http://127.0.0.1:4173/api/availability >/dev/null; then
  open http://127.0.0.1:4173/admin.html
else
  echo "No se ha podido iniciar CULT SPAIN. Revisa .sites-runtime/cult-local.log."
  read "reply?Pulsa Intro para cerrar."
fi
