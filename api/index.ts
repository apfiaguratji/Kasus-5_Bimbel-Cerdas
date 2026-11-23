import express from 'express';
import { createApiRouter } from '../server/apiRouter.ts';

const app = express();
const apiRouter = createApiRouter();

app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
