fetch('https://pmreg5.afratarigan.my.id/')
  .then(r => r.text())
  .then(t => { 
    const match = t.match(/src="(\/assets\/index-[^"]+\.js)"/); 
    if(match) { 
      console.log('Found chunk:', match[1]); 
      fetch('https://pmreg5.afratarigan.my.id' + match[1])
        .then(r => r.text())
        .then(js => { 
          console.log('Includes VEHICLE_MASTER_COUNT?', js.includes('VEHICLE_MASTER_COUNT')); 
          console.log('Includes masterMapResult.data?', js.includes('masterMapResult.data'));
          console.log('Includes mmEntries.forEach?', js.includes('mmEntries.forEach'));
        }); 
    } else {
      console.log('Chunk not found');
    }
  });
