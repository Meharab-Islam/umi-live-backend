const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

module.exports = {
  adminBaseURL:
    process.env.GAME_ADMIN_BASE_URL ||
    process.env.ADMIN_BASE_URL ||
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.BACKEND_PORT || 5050}`,
  PORT: process.env.GAME_ROULETTECASINO_PORT
    ? parseInt(process.env.GAME_ROULETTECASINO_PORT, 10)
    : process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 5066,
  mongoDbConnectionString:
    process.env.MONGO_URI ||
    "mongodb://admin:lUrXdgertg4OZwerswee333erdsq@178.128.99.229:27017/imlive?authSource=admin",
};

