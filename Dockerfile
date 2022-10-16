FROM ghcr.io/runcitadel/deno:main
WORKDIR /app

COPY . .

RUN deno cache --unstable main.ts

EXPOSE 8000

CMD ["deno", "run", "--unstable", "--allow-all", "main.ts"]