const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  const res = await client.query(`SELECT id FROM linha WHERE codigo_linha = '002'`);
  if (res.rows.length === 0) {
    console.log("Linha 002 não encontrada");
    await client.end();
    return;
  }
  const linhaId = res.rows[0].id;
  
  const rawData = fs.readFileSync('jsonsIntinerarios/linha002.json');
  const data = JSON.parse(rawData);
  
  const pc1 = data.filter(d => d.itinerario?.sentido?.sigla === 'PC1' && d.sequencia !== undefined).sort((a, b) => a.sequencia - b.sequencia);
  const pc2 = data.filter(d => d.itinerario?.sentido?.sigla === 'PC2' && d.sequencia !== undefined).sort((a, b) => a.sequencia - b.sequencia);
  
  const coords = [];
  for (const pt of pc1) {
    coords.push([pt.latitude, pt.longitude, 'PC1']);
  }
  for (const pt of pc2) {
    coords.push([pt.latitude, pt.longitude, 'PC2']);
  }
  
  const coordsJson = JSON.stringify(coords);
  
  await client.query(`
    UPDATE mapa_linha 
    SET coordenadas_rota = $2::jsonb 
    WHERE linha_id = $1
  `, [linhaId, coordsJson]);
  
  // se não atualizou nada, inserimos
  await client.query(`
    INSERT INTO mapa_linha (linha_id, url_imagem, coordenadas_rota) 
    SELECT $1, '', $2::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM mapa_linha WHERE linha_id = $1)
  `, [linhaId, coordsJson]);
  
  console.log(`Atualizado linha ${linhaId} com ${coords.length} pontos (PC1 + PC2)`);
  await client.end();
}

run().catch(console.error);
