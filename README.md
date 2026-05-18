# investor-portal

Static investor portal served by `server.js`.

## Local Development

```sh
ACCESS_CODE='<portal-code>' DECK_ACCESS_CODE='<deck-code>' npm start
```

Do not commit real access codes. Local access codes should be supplied through
environment variables or a private shell/session configuration.

## Production Environment

Production requires these environment variables or Secret Manager injections:

- `ACCESS_CODE` - full investor portal access code
- `DECK_ACCESS_CODE` - deck-only access code for `/deck`
- `SESSION_SECRET` - cookie signing secret
