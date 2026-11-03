# ForgeQuote deployment

ForgeQuote remains a React/Vite client, Express API, and PostgreSQL modular
monolith.

## Environment

Configure these variables on the server only:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `PORT`
- `COOKIE_SECURE=true` behind HTTPS
- `PRIVATE_DOCUMENTS_DIR`
- `GROQ_API_KEY` for AI-assisted intake
- `GROQ_MODEL` (default `openai/gpt-oss-20b`; verify it is available in the account)

Never use a `VITE_` variable for `GROQ_API_KEY`. Do not commit `.env` files.
Rotate any credential that has been pasted into a chat, ticket, terminal log, or
source-control system.

## Release steps

1. Install dependencies with `npm ci`.
2. Run `npm run migrate` against the intended database.
3. Build the client with `npm run build`.
4. Start the API with `npm run start --workspace server`.
5. Serve the generated `client/dist` from the client deployment and set
   `CLIENT_ORIGIN` to its HTTPS origin.

AI intake is optional. If Groq is unavailable or not configured, manual RFQ
entry continues to work and extraction requests return an actionable error.
Only text-based PDF extraction is supported; scanned drawings require OCR
outside this module before submission.
