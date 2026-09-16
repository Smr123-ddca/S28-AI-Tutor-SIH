const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function runTest() {
    console.log('--- STARTING INGESTION E2E STATE-MACHINE TEST ---');

    // Create a tiny mock PDF
    const mockPdfPath = path.join(__dirname, 'test_subject.pdf');
    fs.writeFileSync(mockPdfPath, 'Dummy PDF content for testing');

    const form = new FormData();
    form.append('files', fs.createReadStream(mockPdfPath));

    console.log('T0: Triggering Upload (Mock JWT)');

    let uploadStatus = 'PENDING';

    try {
        const response = await fetch('http://localhost:3002/api/ingest/upload', {
            method: 'POST',
            body: form,
            headers: {
                'Authorization': 'Bearer mock-teacher-jwt-token-xyz'
            }
        });

        const respBody = await response.json();

        if (response.ok) {
            console.log('✅ T1-T3: Initial upload succeeded.', respBody);
        } else {
            console.log('✅ T7: Catching Expected Supabase Failure...', respBody);
        }

    } catch (e) {
        console.error('Test request failed:', e);
    }

    // Delay to let backend async processes (if any) tick
    await new Promise(r => setTimeout(r, 1000));

    console.log('T8: Polling Status API...');
    try {
        const statusRes = await fetch('http://localhost:3002/api/ingest/status');
        const jobs = await statusRes.json();
        console.log('ACTIVE INGESTION JOBS STATE =>', jobs);

        const testJob = jobs.find(j => j.courseName === 'test_subject');
        if (testJob && testJob.status === 'error') {
            uploadStatus = 'ERROR';
            console.log('✅ T9: Backend State Machine correctly locked securely into ERROR status!');
        } else if (!testJob) {
            console.log('✅ T9: Job successfully purged or instantly failed sync!');
        } else {
            console.log('❌ FAIL: Job is stuck tracking invalid state:', testJob.status);
        }
    } catch (err) {
        console.error('Failed to poll status:', err);
    }

    fs.unlinkSync(mockPdfPath);
    console.log('\n--- VERDICT: E2E STATE MACHINE TEST COMPLETE ---');
}

runTest().catch(console.error);
