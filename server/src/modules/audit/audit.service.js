import * as repository from './audit.repository.js';
export const recordRfqEvent = (client, event) => repository.record(client, event);
