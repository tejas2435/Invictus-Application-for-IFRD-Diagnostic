const fs = require('fs');

fetch('https://restcountries.com/v3.1/all')
  .then(r => r.json())
  .then(data => {
    const codes = data.map(c => {
      const root = c.idd?.root?.replace('+', '') || '';
      const suffix = c.idd?.suffixes?.[0] || '';
      return {
        label: c.name.common + ' (+' + root + suffix + ')',
        value: '+' + root + suffix
      };
    }).filter(c => c.value && c.value !== '+').sort((a,b) => a.label.localeCompare(b.label));
    
    const unique = [];
    const map = new Map();
    for (const item of codes) {
      if(!map.has(item.label)){ 
        map.set(item.label, true); 
        unique.push({ label: item.label, value: item.value });
      }
    }
    fs.writeFileSync('src/data/countries.js', 'export const countryOptions = ' + JSON.stringify(unique, null, 2) + ';');
    console.log('Done, length: ' + unique.length);
  });
