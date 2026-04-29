import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../data.json');

let data = { users: [] };

try {
  if (fs.existsSync(dbPath)) {
    data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
} catch (err) {
  console.log('Creating new database file');
}

const save = () => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const users = {
  create: (user) => {
    const existing = data.users.find(u => u.email === user.email || u.username === user.username);
    if (existing) {
      const error = new Error('Username or email already exists');
      error.code = 'SQLITE_CONSTRAINT_UNIQUE';
      throw error;
    }
    const newUser = {
      id: data.users.length + 1,
      username: user.username,
      email: user.email,
      password: user.password,
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    save();
    return newUser;
  },
  findByEmail: (email) => data.users.find(u => u.email === email),
  findById: (id) => data.users.find(u => u.id === id),
  findAll: () => data.users.map(({ password, ...user }) => user),
  clear: () => { data.users = []; save(); }
};

export default users;