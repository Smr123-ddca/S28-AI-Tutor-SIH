const fs = require('fs');
const path = './src/middleware/auth.middleware.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/id: 'fa95b2d7-82ab-472d-a2f0-ce65da3bd342', \/\/ Genuine Supabase Dev Profile/g, "id: '3d999019-498e-4d72-a4c2-dc194c25948a', // Test Context");
fs.writeFileSync(path, content);
console.log("Updated auth.middleware.js");
