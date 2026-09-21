# syntax=docker/dockerfile:1
# Tiny nginx edge proxy — the single public entrypoint on OpenShift.
# Transparent mediator: `/api/` -> backend, everything else -> SSR frontend, `/hc` -> 200.
# Base image is the hardened, OpenShift-friendly nginx used across the estate
# (non-root, writable runtime dirs, listens on :8080). PLACEHOLDER — swap if needed.
FROM <registry>/<image-namespace>/nginx:current

COPY ./files/nginx.conf /etc/nginx/nginx.conf

# Runtime dirs must be writable by the arbitrary OpenShift UID (GID 0); the config stays
# read-only so a compromised nginx cannot rewrite its own routing.
RUN chmod -R ug+rwx /var/cache/nginx /var/run /var/log/nginx /var/lib \
    && chmod -R ug+rX /etc/nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
