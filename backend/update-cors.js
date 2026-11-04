import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const envPath = './.env';
let envContent = fs.readFileSync(envPath, 'utf8');

// Update CLIENT_ORIGIN to allow both ports
const newOrigin = 'http://localhost:5173,http://localhost:5174';
const newEnvContent = envContent.replace(/^CLIENT_ORIGIN=.*/m, `CLIENT_ORIGIN=${newOrigin}`);

fs.writeFileSync(envPath, newEnvContent);
console.log('Updated CLIENT_ORIGIN to:', newOrigin);
