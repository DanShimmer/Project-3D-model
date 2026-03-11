const path = require('path');

// Set module resolution to Back-end/src/node_modules
const modulesPath = path.join(__dirname, 'src', 'node_modules');
process.env.NODE_PATH = modulesPath;
require('module').Module._initPaths();

// Register ts-node
require(path.join(modulesPath, 'ts-node')).register({
  project: path.join(__dirname, 'src', 'tsconfig.json'),
  transpileOnly: true
});

// Keep alive
setInterval(() => {}, 30000);

// Load server
require('./src/server.ts');
