const fs = require('fs');

let inbound = fs.readFileSync('./dialogs.json', 'utf8');
inbound = inbound.replaceAll(/\[/g, '');
inbound = inbound.replaceAll(/\]/g, '');
inbound = inbound.replaceAll(/\"/g, '');
inbound = inbound.replaceAll(/\{/g, '');
inbound = inbound.replaceAll(/}/g, '');
inbound = inbound.replaceAll(/[a-zA-Z]/g, '');
inbound = inbound.replaceAll(/\\/g, '');
inbound = inbound.replaceAll(/\,/g, '');
inbound = inbound.replaceAll(/\:/g, '');
inbound = inbound.replaceAll(/[0-9]/g, '');
fs.writeFileSync('./dialogs2.txt', inbound);