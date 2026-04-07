#!/bin/sh
set -eu

cat <<EOF >/etc/nginx/conf.d/default.conf
server {
  listen ${PORT:-80};
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

cat <<EOF >/usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  apiUrl: '${API_URL:-/api}'
};
EOF
