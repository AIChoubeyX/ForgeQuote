import * as repository from './dashboard.repository.js';
export const getMetrics = user => repository.metrics(user);
