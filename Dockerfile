FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    gosu \
    openssh-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/open-website-builder

COPY package.json package-lock.json ./
RUN npm ci

COPY LICENSE index.html vite.config.js vite.pub.config.js ./
COPY editor ./editor
COPY server ./server
COPY src ./src

RUN npm run build:pub

COPY docker-entrypoint.sh /usr/local/bin/owb-entrypoint
RUN chmod 0755 /usr/local/bin/owb-entrypoint \
  && mkdir -p /workspace /run/host-ssh

WORKDIR /workspace

EXPOSE 3003

ENTRYPOINT ["/usr/local/bin/owb-entrypoint"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3003"]