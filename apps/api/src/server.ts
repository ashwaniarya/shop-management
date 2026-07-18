import 'dotenv/config';

import { app } from './app';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
