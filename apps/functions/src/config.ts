import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 50,
});
