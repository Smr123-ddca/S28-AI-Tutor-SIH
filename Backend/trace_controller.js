const { explain } = require('./src/controllers/explain.controller');
const fs = require('fs');

async function testController() {
    const class_id = "dcb2c4de-ea57-434a-82d2-f5342ba5a08d";
    const student_id = "3d999019-498e-4d72-a4c2-dc194c25948a";
    const subject = "Economics_Chunking_Reference";

    let errorObj = null;

    const req = {
        body: {
            question: "Start a practice session",
            subject: subject,
            class_id: class_id,
            student_id: student_id
        },
        user: { id: student_id }
    };

    const res = {
        status: (code) => {
            return {
                json: (obj) => {
                    errorObj = { code, obj };
                }
            };
        },
        json: (obj) => {
            errorObj = { code: 200, obj };
        }
    };

    try {
        await explain(req, res);
        fs.writeFileSync('controller_trace.json', JSON.stringify(errorObj, null, 2));
    } catch (e) {
        fs.writeFileSync('controller_trace.json', JSON.stringify({ crash: e.message, stack: e.stack }, null, 2));
    }
    process.exit(0); // force exit
}
testController();
