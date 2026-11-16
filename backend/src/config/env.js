import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Imported first by modules that read process.env at load time. ES module imports are hoisted, so
// without this their values would be read BEFORE server.js runs dotenv.config() and .env would be ignored.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();
