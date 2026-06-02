const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  const files = fs.readdirSync('jsonsIntinerarios');

  for (const file of files) {
    if (!file.startsWith('linha') || !file.endsWith('.json')) continue;
    
    const filePath = path.join('jsonsIntinerarios', file);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    
    let data;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      continue;
    }

    if (!Array.isArray(data) || data.length === 0) continue;

    const codigoLinhaMatch = file.match(/linha(.*)\.json/i);
    if (!codigoLinhaMatch) continue;
    
    let codigoLinha = codigoLinhaMatch[1].toUpperCase();

    const res = await client.query(`SELECT id FROM linha WHERE codigo_linha = $1`, [codigoLinha]);
    if (res.rows.length === 0) {
      continue;
    }
    const linhaId = res.rows[0].id;
    
    // Agrupa por itinerario.id para cada sentido, evitando zigzags quando há multiplos itinerários com mesma sigla
    const groupedPC1 = {};
    const groupedPC2 = {};

    data.forEach(d => {
      if (d.sequencia === undefined || !d.itinerario || !d.itinerario.sentido) return;
      
      const sigla = d.itinerario.sentido.sigla;
      const itinId = d.itinerario.id;
      
      if (sigla === 'PC1') {
        if (!groupedPC1[itinId]) groupedPC1[itinId] = [];
        groupedPC1[itinId].push(d);
      } else if (sigla === 'PC2') {
        if (!groupedPC2[itinId]) groupedPC2[itinId] = [];
        groupedPC2[itinId].push(d);
      }
    });

    // Pega o itinerário que tiver mais pontos (o traçado principal)
    let pc1 = [];
    let maxPc1 = 0;
    for (const id in groupedPC1) {
      if (groupedPC1[id].length > maxPc1) {
        maxPc1 = groupedPC1[id].length;
        pc1 = groupedPC1[id];
      }
    }

    let pc2 = [];
    let maxPc2 = 0;
    for (const id in groupedPC2) {
      if (groupedPC2[id].length > maxPc2) {
        maxPc2 = groupedPC2[id].length;
        pc2 = groupedPC2[id];
      }
    }

    pc1.sort((a, b) => a.sequencia - b.sequencia);
    pc2.sort((a, b) => a.sequencia - b.sequencia);
    
    const coords = [];
    for (const pt of pc1) {
      coords.push([pt.latitude, pt.longitude, 'PC1']);
    }
    for (const pt of pc2) {
      coords.push([pt.latitude, pt.longitude, 'PC2']);
    }

    if (coords.length === 0) {
      continue;
    }
    
    const coordsJson = JSON.stringify(coords);
    
    await client.query(`
      UPDATE mapa_linha 
      SET coordenadas_rota = $2::jsonb 
      WHERE linha_id = $1
    `, [linhaId, coordsJson]);
    
    await client.query(`
      INSERT INTO mapa_linha (linha_id, url_imagem, coordenadas_rota) 
      SELECT $1, '', $2::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM mapa_linha WHERE linha_id = $1)
    `, [linhaId, coordsJson]);
    
    console.log(`[Corrigido] Linha ${codigoLinha} salva com ${pc1.length} pontos (PC1) e ${pc2.length} pontos (PC2)`);
  }

  await client.end();
}

run().catch(console.error);
