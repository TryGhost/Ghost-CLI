module.exports = ({name, dir, user, environment, ghostExecPath}) => `[Unit]
Description=Ghost systemd service for blog: ${name}
Documentation=https://ghost.org/docs/

[Service]
Type=simple
WorkingDirectory=${dir}
User=${user}
Environment="NODE_ENV=${environment}"
ExecStart=${ghostExecPath} run
Restart=always

[Install]
WantedBy=multi-user.target
`;
