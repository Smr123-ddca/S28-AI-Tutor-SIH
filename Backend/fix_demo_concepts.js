const fs = require('fs');
const path = require('path');
['DSA_Code_Reference_Annotated', 'DBMS_Code_Reference_Annotated', 'IES_Demo_Course_Structured'].forEach(course => {
    let cp = path.join(__dirname, `src/data/${course}_concepts.json`);
    if (fs.existsSync(cp)) {
        console.log(`\n\n--- ${course} Concepts ---`);
        let d = JSON.parse(fs.readFileSync(cp));
        let arr = d.concepts || d;
        console.log(arr.slice(0, 15).map(c => c.name));
    }
});
