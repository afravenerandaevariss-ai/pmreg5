import { createClient } from '@supabase/supabase-js';

async function testBackend() {
  const fileContent = "This is a fake excel file base64 content just for testing.";
  const base64Data = Buffer.from(fileContent).toString('base64');
  const sessionId = 'test-session-123';
  
  // Test upload chunk
  const uploadRes = await fetch('http://localhost:3000/api/upload-chunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, chunk_index: 0, data: base64Data })
  });
  const uploadText = await uploadRes.text();
  console.log('Upload chunk status:', uploadRes.status);
  console.log('Upload chunk response:', uploadText);

  // Test process
  const processRes = await fetch('http://localhost:3000/api/process-excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, type: 'iw39' })
  });
  const processText = await processRes.text();
  console.log('Process status:', processRes.status);
  console.log('Process response:', processText);
}

testBackend();
