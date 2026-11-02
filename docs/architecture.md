# ForgeQuote architecture

ForgeQuote is one deployable modular monolith. The React/Vite client is separately deployable from the single Express API process, and all business modules share one PostgreSQL database.

## Request flow

`Route -> authentication/authorization middleware -> controller -> service -> repository -> PostgreSQL`

The RFQ service coordinates its repository transaction and calls the public audit service to record creates and updates. Dashboard aggregation owns its read queries. Auth, users, and customers expose only their public service/controller interfaces to other modules.

## Database lifecycle

`npm run migrate` executes the ordered SQL files in `server/migrations` and records each filename in `schema_migrations`. The server does not create schema objects at startup. `npm run seed` is idempotent and only inserts sample RFQs when the database has no RFQs.

## Deployment

Set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `PORT`, and `COOKIE_SECURE=true` behind HTTPS. The browser uses a credentialed HttpOnly cookie; the API does not accept a client-submitted role as authorization.
