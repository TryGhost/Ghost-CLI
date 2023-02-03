# FROM node:16
FROM uffizzi/ttyd:nodejs

ENV NODE_ENV=development

WORKDIR /app

COPY . .

RUN npm i

# Set user and group
ARG user=appuser
ARG group=appuser
ARG uid=9000
ARG gid=9000
RUN groupadd -g ${gid} ${group}
RUN useradd -u ${uid} -g ${group} -s /bin/sh -m ${user}

RUN chown -R ${user}:${group} /app

# Install zsh
# https://ohmyz.sh/
RUN apt-get update && apt-get install -y zsh
RUN yes | bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

RUN mkdir /web
RUN chown -R ${user}:${group} /web

# Switch to user
USER ${uid}:${gid}

# Create app
RUN cd /web && /app/bin/ghost install local

# Switch to root
USER root
