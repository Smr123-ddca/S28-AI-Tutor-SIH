const fs = require('fs');
fs.writeFileSync('env.txt', JSON.stringify(process.env, null, 2));
console.log("Dumped.");
