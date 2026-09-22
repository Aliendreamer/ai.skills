# syntax=docker/dockerfile:1
# Tiny nginx edge proxy — the single public entrypoint of the cluster.
# Transparent mediator: `/api/` -> backend, everything else -> SSR frontend, `/hc` -> 200.
# Plain official nginx; `files/nginx.conf` makes it listen on :8080.
FROM nginx:1.27-alpine

COPY ./files/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
