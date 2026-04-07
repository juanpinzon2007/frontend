#!/bin/sh
set -eu

api_proxy_block=""

case "${API_URL:-/api}" in
  http://*|https://*)
    api_proxy_block=$(cat <<EOF
  location = /api {
    return 301 /api/;
  }

  location /api/ {
    proxy_http_version 1.1;
    proxy_ssl_server_name on;
    proxy_set_header Host \$proxy_host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_pass ${API_URL%/}/;
  }
EOF
)
    frontend_api_url="/api"
    ;;
  *)
    frontend_api_url="${API_URL:-/api}"
    ;;
esac

cat <<EOF >/etc/nginx/conf.d/default.conf
server {
  listen ${PORT:-80};
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

${api_proxy_block}

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

cat <<EOF >/usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  apiUrl: '${frontend_api_url}'
};
EOF
