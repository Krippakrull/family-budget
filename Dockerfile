FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/migrate.mjs ./migrate.mjs

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "node migrate.mjs && node build"]
