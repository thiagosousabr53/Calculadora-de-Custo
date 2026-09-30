const F = { g: 1, kg: 1000, ml: 1, l: 1000, un: 1 };
const fam = u => (u === 'g' || u === 'kg') ? 'g' : (u === 'ml' || u === 'l') ? 'ml' : 'un';
const brl = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isFinite(n) ? n : 0);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const DEFAULT = {
  sel: 1,
  ings: [
    { id: 11, nome: 'Farinha de trigo', preco: 22, qtd: 5, un: 'kg' },
    { id: 12, nome: 'Açúcar', preco: 5.5, qtd: 1, un: 'kg' },
    { id: 13, nome: 'Ovos', preco: 20, qtd: 30, un: 'un' },
    { id: 14, nome: 'Leite', preco: 5, qtd: 1, un: 'l' },
    { id: 15, nome: 'Manteiga', preco: 18, qtd: 500, un: 'g' },
    { id: 16, nome: 'Fermento biológico', preco: 9, qtd: 500, un: 'g' },
    { id: 17, nome: 'Sal', preco: 3, qtd: 1, un: 'kg' }
  ],
  prods: [
    {
      id: 1, nome: 'Pão francês', rend: 20, extra: 15, margem: 60, itens: [
        { ing: 11, qtd: 1, un: 'kg' }, { ing: 16, qtd: 20, un: 'g' }, { ing: 17, qtd: 20, un: 'g' }]
    },
    {
      id: 2, nome: 'Bolo simples', rend: 12, extra: 20, margem: 55, itens: [
        { ing: 11, qtd: 400, un: 'g' }, { ing: 12, qtd: 300, un: 'g' }, { ing: 13, qtd: 4, un: 'un' },
        { ing: 14, qtd: 250, un: 'ml' }, { ing: 15, qtd: 100, un: 'g' }]
    }
  ]
};

let S;
try { S = JSON.parse(localStorage.getItem('padaria-v1')) || null; } catch (e) { S = null; }
if (!S || !S.ings || !S.prods) S = JSON.parse(JSON.stringify(DEFAULT));

const save = () => { try { localStorage.setItem('padaria-v1', JSON.stringify(S)); } catch (e) { } };
const ing = id => S.ings.find(i => i.id === id);
const prod = () => S.prods.find(p => p.id === S.sel) || S.prods[0];

// custo por unidade-base (g, ml ou un)
function baseCost(i) {
  const q = i.qtd * F[i.un];
  return q > 0 ? i.preco / q : 0;
}
function itemCost(it) {
  const i = ing(it.ing);
  return i ? baseCost(i) * it.qtd * F[it.un] : 0;
}
function unitOptions(f, sel) {
  const list = f === 'g' ? ['g', 'kg'] : f === 'ml' ? ['ml', 'l'] : ['un'];
  return list.map(u => `<option value="${u}" ${u === sel ? 'selected' : ''}>${u}</option>`).join('');
}
function fixUnits() {
  S.prods.forEach(p => p.itens.forEach(it => {
    const i = ing(it.ing);
    if (i && fam(it.un) !== fam(i.un)) it.un = fam(i.un);
  }));
}

/* ---------- Ingredientes ---------- */
function addIng() {
  S.ings.push({ id: uid(), nome: 'Novo ingrediente', preco: 0, qtd: 1, un: 'kg' });
  render();
}
function delIng(id) {
  S.ings = S.ings.filter(i => i.id !== id);
  S.prods.forEach(p => p.itens = p.itens.filter(it => it.ing !== id));
  render();
}
function setIng(id, k, v) {
  const i = ing(id);
  if (k === 'nome') i.nome = v;
  else if (k === 'un') { i.un = v; fixUnits(); render(); return; }
  else i[k] = num(v);
  if (k === 'nome') { renderProd(); save(); return; }
  calc();
}
function renderIngs() {
  document.getElementById('ings').innerHTML = S.ings.map(i => `
    <div class="ing">
      <div class="full"><label>Nome</label>
        <input value="${esc(i.nome)}" oninput="setIng(${i.id},'nome',this.value)"></div>
      <div><label>Preço pago (R$)</label>
        <input type="number" inputmode="decimal" min="0" step="0.01" value="${i.preco}" oninput="setIng(${i.id},'preco',this.value)"></div>
      <div><label>Quantidade comprada</label>
        <div style="display:flex;gap:6px">
          <input type="number" inputmode="decimal" min="0" step="any" value="${i.qtd}" oninput="setIng(${i.id},'qtd',this.value)">
          <select style="width:72px" onchange="setIng(${i.id},'un',this.value)" aria-label="Unidade">
            ${['g', 'kg', 'ml', 'l', 'un'].map(u => `<option ${u === i.un ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div></div>
      <div class="pu full" style="display:flex;justify-content:space-between;align-items:center">
        <span id="pu-${i.id}"></span>
        <button class="x" onclick="delIng(${i.id})" aria-label="Remover ${esc(i.nome)}">Remover</button>
      </div>
    </div>`).join('') || '<p class="hint">Nenhum ingrediente ainda. Adicione o primeiro.</p>';
}

/* ---------- Produtos ---------- */
function addProd() {
  const p = { id: uid(), nome: 'Novo produto', rend: 1, extra: 15, margem: 50, itens: [] };
  S.prods.push(p); S.sel = p.id; render();
}
function delProd() {
  if (S.prods.length < 2) return;
  S.prods = S.prods.filter(p => p.id !== S.sel);
  S.sel = S.prods[0].id; render();
}
function setProd(k, v) {
  const p = prod();
  if (k === 'nome') { p.nome = v; renderTabs(); save(); return; }
  p[k] = num(v);
  calc();
}
function addItem() {
  const p = prod();
  if (!S.ings.length) return;
  const i = S.ings[0];
  p.itens.push({ ing: i.id, qtd: 0, un: fam(i.un) });
  renderProd();
}
function delItem(n) { prod().itens.splice(n, 1); renderProd(); }
function setItem(n, k, v) {
  const it = prod().itens[n];
  if (k === 'ing') {
    it.ing = +v;
    const i = ing(it.ing);
    if (i && fam(it.un) !== fam(i.un)) it.un = fam(i.un);
    renderProd(); return;
  }
  if (k === 'un') it.un = v; else it.qtd = num(v);
  calc();
}
function selProd(id) { S.sel = id; renderTabs(); renderProd(); save(); }

function renderTabs() {
  document.getElementById('tabs').innerHTML = S.prods.map(p =>
    `<button aria-pressed="${p.id === S.sel}" onclick="selProd(${p.id})">${esc(p.nome) || 'Sem nome'}</button>`).join('')
    + '<button onclick="addProd()">+ Produto</button>';
}
function renderProd() {
  const p = prod();
  const el = document.getElementById('prod');
  el.innerHTML = `
    <div class="row">
      <div style="grid-column:1/-1"><label>Nome do produto</label>
        <input value="${esc(p.nome)}" oninput="setProd('nome',this.value)"></div>
      <div><label>Rendimento (unidades ou fatias)</label>
        <input type="number" inputmode="numeric" min="1" step="1" value="${p.rend}" oninput="setProd('rend',this.value)"></div>
      <div><label>Gás, energia e embalagem (%)</label>
        <input type="number" inputmode="decimal" min="0" step="any" value="${p.extra}" oninput="setProd('extra',this.value)"></div>
      <div><label>Margem de lucro desejada (%)</label>
        <input type="number" inputmode="decimal" min="0" max="95" step="any" value="${p.margem}" oninput="setProd('margem',this.value)"></div>
    </div>
    <label>Ingredientes da receita</label>
    ${p.itens.map((it, n) => {
    const i = ing(it.ing);
    return `<div class="item">
        <select onchange="setItem(${n},'ing',this.value)" aria-label="Ingrediente">
          ${S.ings.map(x => `<option value="${x.id}" ${x.id === it.ing ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}
        </select>
        <input type="number" inputmode="decimal" min="0" step="any" value="${it.qtd}" oninput="setItem(${n},'qtd',this.value)" aria-label="Quantidade">
        <select onchange="setItem(${n},'un',this.value)" aria-label="Unidade">${unitOptions(i ? fam(i.un) : 'un', it.un)}</select>
        <div class="sum"><span id="sub-${n}"></span><button class="x" onclick="delItem(${n})">Remover</button></div>
      </div>`;
  }).join('') || '<p class="hint">Adicione os ingredientes que entram nesta receita.</p>'}
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="main" onclick="addItem()">Adicionar à receita</button>
      <button class="x" onclick="delProd()" ${S.prods.length < 2 ? 'disabled' : ''}>Excluir produto</button>
    </div>
    <div class="res" aria-live="polite">
      <div><span>Ingredientes</span><span id="r-ing"></span></div>
      <div><span>Gás, energia e embalagem</span><span id="r-ext"></span></div>
      <div><span>Custo total da receita</span><strong id="r-tot"></strong></div>
      <div class="unit"><span>Custo por unidade</span><span id="r-unit"></span></div>
      <div class="big"><span>Preço de venda sugerido</span><span id="r-price"></span></div>
      <div><span>Lucro por unidade</span><span id="r-lucro"></span></div>
      <div><span>Lucro da receita inteira</span><span id="r-lucro-t"></span></div>
    </div>`;
  calc();
}

/* ---------- Cálculo ---------- */
function calc() {
  S.ings.forEach(i => {
    const el = document.getElementById('pu-' + i.id);
    if (!el) return;
    const f = fam(i.un), c = baseCost(i);
    el.textContent = f === 'g' ? brl(c * 1000) + ' por kg' : f === 'ml' ? brl(c * 1000) + ' por litro' : brl(c) + ' por unidade';
  });
  const p = prod();
  if (!p) return;
  let soma = 0;
  p.itens.forEach((it, n) => {
    const c = itemCost(it); soma += c;
    const el = document.getElementById('sub-' + n);
    if (el) el.textContent = 'Custo: ' + brl(c);
  });
  const ext = soma * p.extra / 100;
  const tot = soma + ext;
  const rend = p.rend > 0 ? p.rend : 1;
  const unit = tot / rend;
  const m = Math.min(p.margem, 95) / 100;
  const preco = unit / (1 - m);
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  set('r-ing', brl(soma)); set('r-ext', brl(ext)); set('r-tot', brl(tot));
  set('r-unit', brl(unit)); set('r-price', brl(preco));
  set('r-lucro', brl(preco - unit)); set('r-lucro-t', brl((preco - unit) * rend));
  save();
}

function render() { fixUnits(); renderIngs(); renderTabs(); renderProd(); }
if (!prod()) S.sel = S.prods[0].id;
render();