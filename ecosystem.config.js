module.exports = {
    apps: [
        {
            name: "sso",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 4012",
            cwd: "/data/projects/entroly_sso",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PORT: 4012,
            },
        },
    ],
};
