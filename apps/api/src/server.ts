import 'dotenv/config';

import { app } from './app';
import { assertOAuthRedirectConfigured } from './lib/oauthProviders';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

assertOAuthRedirectConfigured();

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
