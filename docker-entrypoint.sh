#!/bin/sh
set -eu

project_root=/workspace
project_modules="$project_root/node_modules"
host_uid="${HOST_UID:-1000}"
host_gid="${HOST_GID:-1000}"
runtime_home=/home/node
runtime_cache=/tmp/owb-npm-cache

case "$host_uid:$host_gid" in
  *[!0-9:]*|:*)
    echo "HOST_UID and HOST_GID must be numeric." >&2
    exit 1
    ;;
esac

for required_file in package.json vite.config.js "${OWB_SITE_CONFIG:-owb.config.js}"; do
  if [ ! -f "$project_root/$required_file" ]; then
    echo "Mounted website is missing $required_file in $project_root." >&2
    exit 1
  fi
done

if [ ! -d /opt/open-website-builder/node_modules ]; then
  echo "OWB package is missing from /opt/open-website-builder." >&2
  exit 1
fi

mkdir -p "$project_modules" "$runtime_home" "$runtime_cache"
chown "$host_uid:$host_gid" "$project_modules" "$runtime_home" "$runtime_cache"

rm -rf "$runtime_home/.ssh"
if [ -d /run/host-ssh ]; then
  mkdir -p "$runtime_home/.ssh"
  cp -RP /run/host-ssh/. "$runtime_home/.ssh/"
  find "$runtime_home/.ssh" -type l -delete
  find "$runtime_home/.ssh" \( -type s -o -type b -o -type c -o -type p \) -delete
  find "$runtime_home/.ssh" -type d -exec chmod 0700 {} +
  find "$runtime_home/.ssh" -type f -exec chmod 0600 {} +
  chown -R "$host_uid:$host_gid" "$runtime_home/.ssh"
fi

dependency_source="$project_root/package.json"
install_command="npm install --package-lock=false"
if [ -f "$project_root/package-lock.json" ]; then
  dependency_source="$project_root/package-lock.json"
  install_command="npm ci"
fi

dependency_hash=$(node -e '
  const crypto = require("node:crypto");
  const fs = require("node:fs");
  process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"));
' "$dependency_source")
fingerprint_file="$project_modules/.owb-dependencies-fingerprint"

if [ ! -x "$project_modules/.bin/vite" ] \
  || [ ! -f "$fingerprint_file" ] \
  || [ "$(cat "$fingerprint_file")" != "$dependency_hash" ]; then
  echo "Installing website dependencies..."
  (
    cd "$project_root"
    gosu "$host_uid:$host_gid" env \
      HOME="$runtime_home" \
      NPM_CONFIG_CACHE="$runtime_cache" \
      sh -c "$install_command"
  )
  temporary_fingerprint="$fingerprint_file.tmp"
  printf '%s\n' "$dependency_hash" > "$temporary_fingerprint"
  chown "$host_uid:$host_gid" "$temporary_fingerprint"
  mv "$temporary_fingerprint" "$fingerprint_file"
fi

rm -rf "$project_modules/open-website-builder"
ln -s /opt/open-website-builder "$project_modules/open-website-builder"

export HOME="$runtime_home"
export NPM_CONFIG_CACHE="$runtime_cache"
exec gosu "$host_uid:$host_gid" "$@"