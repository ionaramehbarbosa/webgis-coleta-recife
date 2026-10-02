// CONFIGURAÇÃO: altere os nomes dos campos para adaptar aos seus dados.
const CAMPOS={bairro:'bairro',tipo:'tiporesiduo',endereco:'endereco',complemento:'complemento',observacao:'observacao'};
const $=id=>document.getElementById(id);
const mapa=L.map('mapa').setView([-8.05,-34.92],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(mapa);
L.control.scale({imperial:false}).addTo(mapa);
const camada=L.layerGroup().addTo(mapa);
L.control.layers(null,{'Registros de coleta':camada}).addTo(mapa);
let registros=[], marcadores=new Map();
const valor=(f,c)=>String(f.properties?.[CAMPOS[c]]??'').trim();
const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function preencher(id,c){const sel=$(id);sel.replaceChildren(new Option('Todos',''));[...new Set(registros.map(f=>valor(f,c)||'Não informado'))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(v=>sel.add(new Option(v,v)));}
function carregar(dados){
 if(dados.type!=='FeatureCollection'||!Array.isArray(dados.features))throw Error('Use um GeoJSON do tipo FeatureCollection.');
 registros=dados.features.filter(f=>f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>=2&&f.geometry.coordinates.slice(0,2).every(Number.isFinite)&&Math.abs(f.geometry.coordinates[0])<=180&&Math.abs(f.geometry.coordinates[1])<=90);
 if(!registros.length)throw Error('Nenhum ponto válido encontrado. Confira geometria e coordenadas.');
 const omitidos=dados.features.length-registros.length;
 preencher('bairro','bairro');preencher('tipo','tipo');$('busca').value='';$('visiveis').checked=false;
 $('status').textContent=`${registros.length} registros válidos carregados. ${omitidos} feições omitidas por geometria ou coordenadas incompatíveis.`;
 const limites=L.latLngBounds(registros.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]));mapa.fitBounds(limites,{padding:[25,25],maxZoom:15});atualizar();
}
function atualizar(){
 camada.clearLayers();marcadores.clear();
 const filtrados=registros.filter(f=>(!$('bairro').value||(valor(f,'bairro')||'Não informado')===$('bairro').value)&&(!$('tipo').value||(valor(f,'tipo')||'Não informado')===$('tipo').value)&&normal([valor(f,'endereco'),valor(f,'observacao')].join(' ')).includes(normal($('busca').value.trim())));
 const exibidos=filtrados.filter(f=>!$('visiveis').checked||mapa.getBounds().contains([f.geometry.coordinates[1],f.geometry.coordinates[0]]));
 // O mapa mostra todos os registros que atendem aos filtros de atributos.
 filtrados.forEach(f=>{const m=L.circleMarker([f.geometry.coordinates[1],f.geometry.coordinates[0]],{radius:7,color:'#155d75',fillOpacity:.8});const div=document.createElement('div');['tipo','bairro','endereco','complemento','observacao'].forEach(c=>{const p=document.createElement('p');p.textContent=`${c}: ${valor(f,c)||'Não informado'}`;div.append(p);});m.bindPopup(div).addTo(camada);marcadores.set(f,m);});
 $('contador').textContent=`Base: ${registros.length} registros. Filtros de atributos: ${filtrados.length}. ${$('visiveis').checked?'Na área visível':'Resultados'}: ${exibidos.length}.`;
 const contagens=new Map();exibidos.forEach(f=>{const t=valor(f,'tipo')||'Não informado';contagens.set(t,(contagens.get(t)||0)+1);});$('grafico').replaceChildren();const max=Math.max(1,...contagens.values());[...contagens].sort((a,b)=>b[1]-a[1]).forEach(([t,n])=>{const p=document.createElement('div');p.className='categoria';p.textContent=`${t}: ${n}`;const bar=document.createElement('div');bar.className='barra';bar.style.width=`${n/max*100}%`;$('grafico').append(p,bar);});
 $('lista').replaceChildren();exibidos.slice(0,100).forEach(f=>{const b=document.createElement('button');b.className='registro';b.textContent=`${valor(f,'endereco')||'Endereço não informado'} — ${valor(f,'bairro')} — ${valor(f,'tipo')}`;b.onclick=()=>{mapa.setView([f.geometry.coordinates[1],f.geometry.coordinates[0]],16);marcadores.get(f)?.openPopup();};$('lista').append(b);});if(exibidos.length>100){const p=document.createElement('p');p.textContent='Lista limitada aos primeiros 100 resultados; contagens incluem todos. Refine os filtros.';$('lista').append(p);}
}
$('arquivo').onchange=async e=>{try{carregar(JSON.parse(await e.target.files[0].text()));}catch(err){$('status').textContent=err.message;}};
['bairro','tipo','visiveis'].forEach(id=>$(id).onchange=atualizar);$('busca').oninput=atualizar;
$('limpar').onclick=()=>{$('bairro').value='';$('tipo').value='';$('busca').value='';$('visiveis').checked=false;atualizar();};
$('extensao').onclick=()=>{if(registros.length)mapa.fitBounds(L.latLngBounds(registros.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]])),{padding:[25,25],maxZoom:15});};
mapa.on('moveend',()=>{if($('visiveis').checked)atualizar();});
// Em hospedagem HTTP, carregar automaticamente o arquivo publicado.
if(/^https?:$/.test(location.protocol))fetch('./dados.geojson').then(r=>{if(!r.ok)throw Error('dados.geojson não encontrado. Publique o arquivo ao lado do index.html.');return r.json();}).then(carregar).catch(e=>$('status').textContent=e.message);
