# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine

WORKDIR /src


# Deliberately IDENTICAL to apps/backend/Dockerfile's runtime setup — same base family, same packages,
# same env. The only intended difference between the two images is that this one runs
# `dotnet watch` against bind-mounted source instead of a published build.
#
# All four are named even though the SDK base already ships tzdata + ICU and already defaults
# INVARIANT=false. Relying on those defaults is what would make dev only ACCIDENTALLY equivalent to prod:
# the day a base image drops one, dev keeps working and prod breaks — the exact failure this parity rules
# out. apk is idempotent, so naming an already-present package costs nothing.
#
#   krb5-libs      libgssapi_krb5.so.2 — Npgsql probes GSSAPI at startup (password auth, not Kerberos).
#                  NOTE: the Debian package is libgssapi-krb5-2, which does NOT exist on Alpine.
#   tzdata         Timezone database, for ENV TZ below.
#   icu-libs +     Globalization data, since INVARIANT=false.
#   icu-data-full
RUN apk add --no-cache tzdata icu-libs icu-data-full krb5-libs


# TZ and INVARIANT mirror the runtime image, so log timestamps and globalization behave identically here.
# DOTNET_NOLOGO and the polling watcher are the only dev-specific settings — bind mounts do not raise
# inotify events, so the default file watcher sees nothing.
ENV TZ=Europe/Sofia \
  DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
  DOTNET_NOLOGO=1 \
  DOTNET_USE_POLLING_FILE_WATCHER=1 \
  ASPNETCORE_HTTP_PORTS=8080

# Manifests only (Central Package Management): warm the restore layer. Only the backend project is
# restored — it has no reference to the test project (the test project references it, not the
# reverse), and apps/backend/.dockerignore excludes the test project from the build context anyway.
COPY Directory.Build.props Directory.Packages.props <AppName>.Backend.csproj ./
# NuGet downloads can be reset mid-flight on slow/flaky networks; --disable-parallel lowers connection
# pressure and a short retry loop rides out transient failures instead of failing the whole build.
RUN for i in 1 2 3; do \
  echo "dotnet restore (attempt $i)…"; \
  dotnet restore <AppName>.Backend.csproj --disable-parallel && break; \
  [ "$i" = "3" ] && { echo "dotnet restore failed after 3 attempts" >&2; exit 1; }; \
  sleep 10; \
  done

EXPOSE 8080
CMD ["dotnet", "watch", "run", "--project", "<AppName>.Backend.csproj", "--urls", "http://+:8080", "--non-interactive"]
