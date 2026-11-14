// Nạp server/.env.local cho các script chạy local. PHẢI là import ĐẦU TIÊN của script,
// vì lib/config.ts đọc biến môi trường ngay khi được import.
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
