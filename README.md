# investor-portal

Static investor portal served by `server.js`.

## Local Development

```sh
npm start
```

Local development defaults are provided for the portal and deck access codes.

## Production Environment

Production requires these environment variables or Secret Manager injections:

- `ACCESS_CODE` - full investor portal access code
- `DECK_ACCESS_CODE` - deck-only access code for `/deck`
- `SESSION_SECRET` - cookie signing secret
