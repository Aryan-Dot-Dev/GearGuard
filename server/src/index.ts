import express from 'express';
import dotenv from 'dotenv';
import { sequelize } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

await sequelize.sync({alter: true});
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, GearGuard!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});