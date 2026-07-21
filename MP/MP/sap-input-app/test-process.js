import processHandler from './api/process-excel.js';

async function testDirect() {
  const req = {
    method: 'POST',
    body: { session_id: 'test-direct-1', type: 'iw39' }
  };
  const res = {
    status: function(code) {
      console.log('Status:', code);
      return this;
    },
    json: function(data) {
      console.log('JSON:', data);
    },
    send: function(data) {
      console.log('Send:', data);
    }
  };

  await processHandler(req, res);
}

testDirect();
