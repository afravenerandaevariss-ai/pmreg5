import uploadHandler from './api/upload-chunk.js';
import processHandler from './api/process-excel.js';

async function testFull() {
  const sessionId = 'test-session-full-1';
  
  // Create a minimal fake excel file base64
  const fakeBase64 = Buffer.from('fake data').toString('base64');
  
  const uploadReq = {
    method: 'POST',
    body: { session_id: sessionId, chunk_index: 0, data: fakeBase64 }
  };
  
  const uploadRes = {
    status: function(code) { console.log('Upload Status:', code); return this; },
    json: function(data) { console.log('Upload JSON:', data); },
    send: function(data) { console.log('Upload Send:', data); }
  };

  console.log('Testing upload...');
  await uploadHandler(uploadReq, uploadRes);

  const processReq = {
    method: 'POST',
    body: { session_id: sessionId, type: 'iw39' }
  };

  const processRes = {
    status: function(code) { console.log('Process Status:', code); return this; },
    json: function(data) { console.log('Process JSON:', data); },
    send: function(data) { console.log('Process Send:', data); }
  };

  console.log('Testing process...');
  await processHandler(processReq, processRes);
}

testFull();
