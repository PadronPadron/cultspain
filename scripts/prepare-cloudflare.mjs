import {readFile,writeFile} from 'node:fs/promises';
const deployment=JSON.parse(await readFile(new URL('../cloudflare.production.json',import.meta.url),'utf8'));
const path=new URL('../dist/server/wrangler.json',import.meta.url),generated=JSON.parse(await readFile(path,'utf8'));
if(!deployment.d1_databases[0].database_id)throw Error('Falta el ID de D1.');
Object.assign(generated,deployment,{topLevelName:deployment.name});
generated.observability={enabled:false}; // Avoid collecting client information in automatic runtime logs.
await writeFile(path,JSON.stringify(generated,null,2)+'\n');
console.log('Configuración preparada para Worker cultspain / cultspain.com. No se ha desplegado nada.');
