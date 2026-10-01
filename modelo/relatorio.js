// Memória de cálculo — Tubulão sem base / com base, no padrão do template Eletrobras / Araxá.
// window.RelatorioTubulao(run, doc, logos) -> HTML completo (A4, paginado, pronto para imprimir/PDF).
(function () {
  const F = (v, d) => (v === null || v === undefined || v === '' || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d });
  const E = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ST = v => { const ok = v === 'ATENDE' || v === 'IDEAL' || v === 'OK', bad = v === 'REVER'; return '<b style="color:' + (ok ? '#00B050' : bad ? '#EE0000' : '#000') + '">' + E(v) + '</b>'; };
  const STATUS = ['PARA COMENTÁRIOS', 'PARA INFORMAÇÃO', 'PARA COTAÇÃO', 'PARA COMPRA', 'LIBERADO PARA EXECUÇÃO', 'CERTIFICADO', 'CONFORME FORNECIDO', 'CONFORME CONSTRUÍDO', 'CANCELADO'];

  function paginar() {
    const src = document.getElementById('fonte'), pages = document.getElementById('pages'), tpl = document.getElementById('tplPage');
    const nova = () => { const p = tpl.content.firstElementChild.cloneNode(true); pages.appendChild(p); return p.querySelector('.corpo'); };
    const over = b => b.scrollHeight > b.clientHeight + 1;
    const puxar = b => { const m = []; while (b.lastElementChild && b.lastElementChild.classList.contains('kwn') && b.children.length > 1) m.unshift(b.removeChild(b.lastElementChild)); return m; };
    let body = nova();
    const colocar = (b, fresh) => {
      body.appendChild(b);
      if (!over(body)) return;
      const tb0 = b.tagName === 'TABLE' && b.tBodies[0];
      if (tb0 && tb0.rows.length > 1) {
        const nt = b.cloneNode(false); if (b.tHead) nt.appendChild(b.tHead.cloneNode(true));
        const tb = document.createElement('tbody'); nt.appendChild(tb);
        while (over(body) && tb0.rows.length > 1) tb.insertBefore(tb0.rows[tb0.rows.length - 1], tb.firstChild);
        const cabe = !over(body) && (tb0.rows.length >= 2 || fresh);
        if (cabe) { body = nova(); colocar(nt, true); return; }
        while (tb.rows.length) tb0.appendChild(tb.rows[0]);
      }
      if (fresh) return;
      body.removeChild(b); const m = puxar(body); body = nova(); m.forEach(x => body.appendChild(x)); colocar(b, true);
    };
    Array.from(src.children).forEach(b => {
      if (b.classList.contains('quebra')) { if (body.children.length) body = nova(); return; }
      colocar(b, false);
    });
    src.remove();
    const all = Array.from(document.querySelectorAll('.page')), tot = all.length;
    all.forEach((p, i) => { p.querySelectorAll('.pg').forEach(e => e.textContent = i + 1); p.querySelectorAll('.tot').forEach(e => e.textContent = tot); });
    document.querySelectorAll('[data-tocref]').forEach(e => { const h = document.getElementById(e.getAttribute('data-tocref')); const pg = h && h.closest('.page'); e.textContent = pg ? all.indexOf(pg) + 1 : ''; });
  }

  window.RelatorioTubulao = function (run, doc, logos, figs) {
    doc = doc || {}; logos = logos || {}; figs = figs || {};
    const INCLUIR_CAPA = false;   // capa desativada por enquanto
    const ent = run.entrada, res = run.res, M = ent.materiais, torre = run.torreNome, tipo = ent.tipo_fundacao;
    const solos = res.solos.filter(n => res.resultados[n]);
    const R = n => res.resultados[n];
    const TB = run.ft === 'tcb', nomeF = run.tipo || 'Tubulão sem base', nomeFl = nomeF.toLowerCase();
    const sub = s => String(s || '').replace(/\{torre\}/gi, torre).replace(/\{tipo\}/gi, tipo).replace(/\{fundacao\}/gi, nomeF.toUpperCase());
    const titulo = sub(doc.titulo || 'FUNDAÇÕES DAS TORRES – TORRE {torre}');
    const subtitulo = sub(doc.subtitulo || '{fundacao} – {torre}-{tipo}');
    const numDoc = doc.numDoc || '', rev = doc.rev || '0';
    const fcd = M.fck_mpa / M.gamma_concreto, fyd = M.fyk_mpa / M.gamma_aco;

    // ---------- numeração ----------
    let h1 = 0, h2 = 0, h3 = 0, tabN = 0, figN = 0; const toc = [];
    const H1 = t => { h1++; h2 = 0; h3 = 0; tabN = 0; figN = 0; const id = 's' + h1; toc.push({ id, n: '' + h1, t, lvl: 1 }); return '<h1 id="' + id + '" class="kwn">' + h1 + '<span class="tab"></span>' + E(t).toUpperCase() + '</h1>'; };
    const H2 = t => { h2++; h3 = 0; const n = h1 + '.' + h2, id = 's' + n.replace(/\./g, '_'); toc.push({ id, n, t, lvl: 2 }); return '<h2 id="' + id + '" class="kwn">' + n + '<span class="tab"></span>' + E(t) + '</h2>'; };
    const H3 = t => { h3++; const n = h1 + '.' + h2 + '.' + h3, id = 's' + n.replace(/\./g, '_'); toc.push({ id, n, t, lvl: 3 }); return '<h3 id="' + id + '" class="kwn">' + n + '<span class="tab"></span>' + E(t) + '</h3>'; };
    const P = t => '<p>' + t + '</p>';
    const EQ = t => '<div class="eq">' + t + '</div>';
    const ONDE = linhas => '<table class="simb">' + linhas.map(l => '<tr><td class="s">' + l[0] + '</td><td class="e">=</td><td>' + l[1] + '</td></tr>').join('') + '</table>';
    const TAB = (cap, head, rows, o) => {
      o = o || {}; tabN++;
      const hd = Array.isArray(head[0]) ? head : [head];
      return '<p class="leg kwn">Tabela ' + h1 + '.' + tabN + ' – ' + cap + '</p><table class="g' + (o.cls ? ' ' + o.cls : '') + '">' + (o.cols ? '<colgroup>' + o.cols.map(w => '<col style="width:' + w + '">').join('') + '</colgroup>' : '') +
        '<thead>' + hd.map(r => '<tr>' + r.map(c => typeof c === 'object' ? '<th colspan="' + c.span + '">' + c.t + '</th>' : '<th>' + c + '</th>').join('') + '</tr>').join('') + '</thead><tbody>' +
        rows.map(r => '<tr>' + r.map((c, i) => '<td' + (i === 0 && o.left ? ' class="l"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    };
    const TT = (cap, campos) => TAB(cap, ['Grandeza', 'Unid.'].concat(solos.map(n => 'Solo ' + n)),
      campos.map(([k, lab, un, d]) => [lab, un || '-'].concat(solos.map(n => { const v = typeof k === 'function' ? k(R(n), n) : R(n)[k]; return d === null ? (typeof v === 'string' && /ATENDE|REVER|IDEAL|ACEIT/.test(v) ? ST(v) : E(v)) : F(v, d); }))),
      { left: true, cols: ['34%', '10%'].concat(solos.map(() => (56 / solos.length) + '%')) });

    // ---------- geometria derivada ----------
    const geo = n => { const g = ent.geometrias[n], A = Math.PI * g.diametro_m ** 2 / 4, Hmin = g.comprimento_enterrado_m + g.afloramento_min_m, Hmax = g.comprimento_enterrado_m + g.afloramento_max_m; return { g, A, Hmin, Hmax, Vmin: A * Hmin, Vmax: A * Hmax, Vesc: A * g.comprimento_enterrado_m, Pfm: M.peso_especifico_concreto_kgf_m3 * A * Hmin, PfM: M.peso_especifico_concreto_kgf_m3 * A * Hmax }; };
    const figura = () => {
      const s = '<svg viewBox="0 0 260 300" style="width:62mm;height:auto;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg" font-family="Tahoma,Arial" font-size="10">' +
        '<rect x="20" y="110" width="220" height="180" fill="#eeeae2"/><line x1="20" y1="110" x2="240" y2="110" stroke="#7a5c33" stroke-width="1.5"/>' +
        (TB ? '<path d="M110 40 H150 V225 L172 250 V275 H88 V250 L110 225 Z" fill="#fff" stroke="#000" stroke-width="1.2"/><text x="176" y="266">Db</text>' : '<rect x="110" y="40" width="40" height="235" fill="#fff" stroke="#000" stroke-width="1.2"/>') +
        '<line x1="130" y1="20" x2="130" y2="290" stroke="#555" stroke-dasharray="6 3 1.5 3" stroke-width=".7"/>' +
        '<line x1="136" y1="55" x2="140" y2="40" stroke="#00B050" stroke-width="3"/><line x1="140" y1="40" x2="146" y2="14" stroke="#039dcc" stroke-width="3"/>' +
        '<line x1="85" y1="40" x2="85" y2="110" stroke="#000" stroke-width=".7"/><line x1="80" y1="40" x2="90" y2="40" stroke="#000" stroke-width=".7"/><line x1="80" y1="110" x2="90" y2="110" stroke="#000" stroke-width=".7"/><text x="70" y="79" text-anchor="middle">G</text>' +
        '<line x1="85" y1="110" x2="85" y2="275" stroke="#000" stroke-width=".7"/><line x1="80" y1="275" x2="90" y2="275" stroke="#000" stroke-width=".7"/><text x="70" y="196" text-anchor="middle">L</text>' +
        '<line x1="110" y1="285" x2="150" y2="285" stroke="#000" stroke-width=".7"/><text x="130" y="298" text-anchor="middle">D</text>' +
        (TB ? '' : '<line x1="175" y1="40" x2="175" y2="275" stroke="#000" stroke-width=".7"/><line x1="170" y1="40" x2="180" y2="40" stroke="#000" stroke-width=".7"/><line x1="170" y1="275" x2="180" y2="275" stroke="#000" stroke-width=".7"/><text x="186" y="160">H = L + G</text>') +
        '<text x="236" y="104" text-anchor="end" fill="#7a5c33">Terreno</text><text x="152" y="12">Stub</text></svg>';
      figN++; return '<div class="fig">' + s + '<p class="leg">Figura ' + h1 + '.' + figN + ' – Geometria esquemática do ' + nomeFl + '</p></div>';
    };

    // ---------- gráficos (estilo P-Calc) e desenhos do esquema ----------
    const tf = v => (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const passo = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
    const COR = { 'compressão': '#0b7a3e', 'tração': '#d2691e' }, AZ = '#1f3fbf', FUNDO = '#fffbea';
    const svgIni = (W, H) => '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg" font-family="Tahoma,Arial" font-size="9">';
    // Diagrama de interação N × M (barras adotadas) com as hipóteses
    const grafNM = (env, casos) => {
      if (!env || !env.length) return '';
      const W = 330, H = 270, L = 44, R = 10, T = 22, Bm = 34;
      const nE = env.map(p => p[0]), nC = casos.map(c => c.N);
      const nLo = Math.min(Math.min.apply(null, nE), Math.min.apply(null, nC.concat([0])));
      const nHi = Math.min(Math.max.apply(null, nE), Math.max(4 * Math.max.apply(null, nC.concat([0])), -1.2 * nLo, 1));
      const pad = (nHi - nLo) * 0.06, y0 = nLo - pad, y1 = nHi + pad;
      const mMax = 1.12 * Math.max.apply(null, env.filter(p => p[0] <= y1).map(p => p[1]).concat(casos.map(c => c.M)).concat([1]));
      const X = m => L + m / mMax * (W - L - R), Y = n => T + (y1 - n) / (y1 - y0) * (H - T - Bm);
      let s = svgIni(W, H) + '<defs><clipPath id="cnm' + (++figClip) + '"><rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - Bm) + '"/></clipPath></defs>' +
        '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - Bm) + '" fill="' + FUNDO + '" stroke="#000" stroke-width=".8"/>';
      const dm = passo(mMax / 4), dn = passo((y1 - y0) / 5);
      for (let i = 1, m = dm; m < mMax; i++, m = i * dm) s += '<line x1="' + X(m) + '" x2="' + X(m) + '" y1="' + T + '" y2="' + (H - Bm) + '" stroke="#888" stroke-dasharray="3 3" stroke-width=".5"/><text x="' + X(m) + '" y="' + (H - Bm + 11) + '" text-anchor="middle">' + tf(m) + '</text>';
      for (let i = Math.ceil(y0 / dn), n = i * dn; n <= y1; i++, n = i * dn) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(n) + '" y2="' + Y(n) + '" stroke="' + (i === 0 ? '#000' : '#888') + '" stroke-dasharray="' + (i === 0 ? '' : '3 3') + '" stroke-width="' + (i === 0 ? .8 : .5) + '"/><text x="' + (L - 4) + '" y="' + (Y(n) + 3) + '" text-anchor="end">' + tf(n) + '</text>';
      s += '<polyline clip-path="url(#cnm' + figClip + ')" points="' + env.map(p => X(Math.max(p[1], 0)) + ',' + Y(p[0])).join(' ') + '" fill="none" stroke="' + AZ + '" stroke-width="1.6"/>';
      casos.forEach(c => { s += '<circle cx="' + X(c.M) + '" cy="' + Y(c.N) + '" r="3" fill="' + (COR[c.tipo] || '#000') + '" stroke="#fff" stroke-width=".6"/>'; });
      s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-weight="700">M<tspan font-size="7" dy="2">d</tspan><tspan dy="-2"> (tf·m)</tspan></text>' +
        '<text transform="rotate(-90 10 ' + ((T + H - Bm) / 2) + ')" x="10" y="' + ((T + H - Bm) / 2) + '" text-anchor="middle" font-weight="700">N<tspan font-size="7" dy="2">d</tspan><tspan dy="-2"> (tf) – compressão +</tspan></text>' +
        '<text x="' + (W / 2) + '" y="13" text-anchor="middle" font-weight="700" font-size="10">Diagrama de interação N × M</text></svg>';
      return s;
    };
    // Flexão oblíqua: contornos Mx × My, envoltórias mínimas e seções
    const grafMxMy = mx => {
      if (!mx || !mx.contornos) return '';
      const S = 270, P = 30, T = 22, conts = mx.contornos.filter(c => c.pontos && c.pontos.length);
      const raios = [1].concat.apply([1], conts.map(c => c.pontos.map(p => Math.hypot(p[0], p[1]))))
        .concat((mx.casos || []).map(c => Math.hypot(c.Mx_kgfm, c.My_kgfm))).concat(conts.map(c => Math.max(c.m1d_min_xx || 0, c.m1d_min_2a_xx || 0)));
      const R = 1.1 * Math.max.apply(null, raios), k = (S - 2 * P) / 2 / R, cx = S / 2 + 8, cy = T + (S - 2 * P) / 2 + 4;
      const X = m => cx + m * k, Y = m => cy - m * k, W = S + 16, H = T + S - 2 * P + 36;
      let s = svgIni(W, H) + '<rect x="' + X(-R) + '" y="' + Y(R) + '" width="' + (2 * R * k) + '" height="' + (2 * R * k) + '" fill="' + FUNDO + '" stroke="#000" stroke-width=".8"/>';
      const g = passo(R / 3);
      for (let i = -Math.floor(R / g); i <= Math.floor(R / g); i++) {
        const m = i * g, st = i ? 'stroke="#888" stroke-dasharray="3 3" stroke-width=".5"' : 'stroke="#000" stroke-width=".8"';
        s += '<line x1="' + X(m) + '" x2="' + X(m) + '" y1="' + Y(R) + '" y2="' + Y(-R) + '" ' + st + '/><line x1="' + X(-R) + '" x2="' + X(R) + '" y1="' + Y(m) + '" y2="' + Y(m) + '" ' + st + '/>';
        if (i) s += '<text x="' + X(m) + '" y="' + (Y(-R) + 11) + '" text-anchor="middle">' + tf(m) + '</text><text x="' + (X(-R) - 3) + '" y="' + (Y(m) + 3) + '" text-anchor="end">' + tf(m) + '</text>';
      }
      conts.forEach(c => { s += '<polygon points="' + c.pontos.map(p => X(p[0]) + ',' + Y(p[1])).join(' ') + '" fill="none" stroke="' + (c.tipo === 'compressão' ? AZ : COR['tração']) + '" stroke-width="1.5"/>'; });
      const cm = conts.find(c => c.m1d_min_xx);
      if (cm) {
        s += '<ellipse cx="' + X(0) + '" cy="' + Y(0) + '" rx="' + cm.m1d_min_xx * k + '" ry="' + cm.m1d_min_yy * k + '" fill="none" stroke="#333" stroke-dasharray="4 2" stroke-width="1"/>';
        if (cm.m1d_min_2a_xx > cm.m1d_min_xx * 1.001) s += '<ellipse cx="' + X(0) + '" cy="' + Y(0) + '" rx="' + cm.m1d_min_2a_xx * k + '" ry="' + cm.m1d_min_2a_yy * k + '" fill="none" stroke="#333" stroke-dasharray="1 2" stroke-width="1.2"/>';
      }
      conts.forEach(c => (c.secoes || []).forEach(sc => {
        const x = X(sc.Mx_kgfm), y = Y(sc.My_kgfm), r = 3.6, cor = COR[c.tipo] || '#000';
        s += sc.secao === 'topo' ? '<polygon points="' + [x, y - r * 1.15, x - r, y + r * .75, x + r, y + r * .75].join(' ') + '" fill="' + cor + '"/>'
          : sc.secao === 'base' ? '<polygon points="' + [x, y - r * 1.2, x + r, y, x, y + r * 1.2, x - r, y].join(' ') + '" fill="' + cor + '"/>'
          : '<circle cx="' + x + '" cy="' + y + '" r="' + (r * .85) + '" fill="' + cor + '"/>';
      }));
      s += '<text x="' + (X(R) - 2) + '" y="' + (Y(0) - 4) + '" text-anchor="end" font-style="italic" font-weight="700">M<tspan font-size="7" dy="2">xd</tspan></text>' +
        '<text x="' + (X(0) + 4) + '" y="' + (Y(R) + 10) + '" font-style="italic" font-weight="700">M<tspan font-size="7" dy="2">yd</tspan></text>' +
        '<text x="' + (W / 2) + '" y="13" text-anchor="middle" font-weight="700" font-size="10">Diagrama de interação N, Mx, My (FCO)</text>' +
        '<text x="' + (W / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="8">Momentos em tf·m</text></svg>';
      return s;
    };
    let figClip = 0;
    const legGraf = '<p class="nota">Legenda: <span style="color:' + AZ + '">━</span> resistente no N<sub>d</sub> de compressão; <span style="color:' + COR['tração'] + '">━</span> resistente no N<sub>d</sub> de tração; ' +
      '- - - envoltória mínima de 1ª ordem; ···· envoltória mínima com 2ª ordem; ▲ topo, ● seção intermediária, ◆ base (seção crítica); verde = compressão, laranja = tração.</p>';
    const FIGS = (cap, itens) => { figN++; return '<div class="fig figrow"><div class="figgrid">' + itens.filter(Boolean).map(x => '<div class="figcel">' + x + '</div>').join('') + '</div><p class="leg">Figura ' + h1 + '.' + figN + ' – ' + cap + '</p></div>'; };

    // ---------- conteúdo ----------
    const B = [];
    B.push('<div class="quebra"></div>');
    B.push('<div id="sumario"><p class="sumtit">SUMÁRIO</p>@@TOC@@</div>');
    B.push('<div class="quebra"></div>');

    if (run.ft === 'sap') {
      const MS = ent.materiais, TBL = res.tabelas || {}, SS = ent.solos || [];
      const tabH = (cap, recs, fields, o) => TAB(cap, fields.map(x => x[1]), (recs || []).map(rw => fields.map(([k, , d]) => { const v = rw[k]; if (typeof v === 'boolean') return v ? 'Sim' : 'Não'; if (typeof v === 'number') return F(v, d === undefined ? 2 : d); if (typeof v === 'string' && /ATENDE|REVER/.test(v)) return ST(/NÃO|REVER/.test(v) ? 'REVER' : 'ATENDE'); return E(v); })), o);
      const fckM = MS.fck_kgf_cm2 / 10, fykM = MS.fyk_kgf_cm2 / 10;
      B.push(H1('Objetivo'));
      B.push(P('Este documento apresenta a metodologia de cálculo e os resultados do dimensionamento da fundação em sapata, tipo ' + E(tipo) + ', para os solos ' + solos.join(', ') + (ent.tipificacao ? ' da ' + E(ent.tipificacao) : '') + ' e as cargas máximas' + (ent.sistema_cargas ? ' ' + E(ent.sistema_cargas.toLowerCase()) : '') + ' atuantes na torre ' + E(torre) + ' do empreendimento.'));
      B.push(H1('Referências'));
      ['Alonso, Urbano Rodriguez. Exercícios de fundações. São Paulo: Edgard Blücher, 1983;', 'Biarez J. and Barraud Y. – “The Use of Soil Mechanics Methods for Adapting Tower Foundations to Soil Conditions”, CIGRÉ 1968, 22-06;', 'Bowles J.E. – Foundation Analysis and Design – 1977;', 'Cintra, José Carlos A.; Aoki, Nelson; Albiero, José Henrique – Fundações diretas: projeto geotécnico. São Paulo: Oficina de Textos, 2011;', 'Süssekind J. C. – Concreto Armado – Vol. II;', '– Torre Tipo ' + E(torre) + ' – Cálculo Estrutural.'].forEach((x, i) => B.push('<p class="ref">[' + (i + 1) + ']<span class="tab"></span>' + x + '</p>'));
      B.push(P('As normas técnicas abaixo, em suas últimas revisões, devem ser observadas no projeto das fundações:'));
      B.push('<p class="ref"><b>ABNT - Associação Brasileira de Normas Técnicas</b></p><p class="ref">NBR 6122<span class="tab"></span>Projeto e Execução de Fundações</p><p class="ref">NBR 6118<span class="tab"></span>Projeto de Estruturas de Concreto</p>');
      B.push(H1('Características dos materiais utilizados'));
      B.push(H2('Concreto Armado'));
      B.push(TAB('Características Físicas e de Resistência do Concreto Armado', ['Tipo', 'Simb.', 'Unid.', 'Valor'], [['Resistência Característica do Concreto', 'f<sub>ck</sub>', 'MPa', F(fckM, 0)], ['Resistência de Cálculo', 'f<sub>cd</sub>', 'MPa', F(fckM / MS.gamma_c, 3)], ['Coeficiente de Minoração de Resistência do Concreto', 'γ<sub>c</sub>', '-', F(MS.gamma_c, 2)], ['Cobrimento das Armaduras', 'Cobr', 'cm', F(MS.cob_cm, 1)], ['Peso Específico do Concreto', 'γ<sub>conc</sub>', 'kgf/m³', F(MS.gamma_concreto, 0)]], { left: true, cols: ['56%', '14%', '14%', '16%'] }));
      B.push(H2('Aço'));
      B.push(TAB('Características Físicas e de Resistência do Aço', ['Tipo', 'Simb.', 'Unid.', 'Valor'], [['Resistência Característica do Aço à Tração', 'f<sub>yk</sub>', 'MPa', F(fykM, 0)], ['Resistência de Cálculo', 'f<sub>yd</sub>', 'MPa', F(fykM / MS.gamma_s, 2)], ['Coeficiente de Minoração de Resistência do Aço', 'γ<sub>s</sub>', '-', F(MS.gamma_s, 2)], ['Peso Específico do Aço', 'γ<sub>aço</sub>', 'kgf/m³', F(MS.gamma_aco, 0)]], { left: true, cols: ['56%', '14%', '14%', '16%'] }));
      B.push(H2('Parâmetros do solo'));
      B.push(TAB('Parâmetros geotécnicos para solos' + (ent.tipificacao ? ' – ' + E(ent.tipificacao) : ''), ['Tipos'].concat(SS.map(x => E(x.nome))), [['Peso específico (kgf/m³)'].concat(SS.map(x => F(x.gamma, 0))), ['Coesão (kgf/m²)'].concat(SS.map(x => F(x.coesao, 0))), ['Ângulo de atrito (°)'].concat(SS.map(x => F(x.phi, 0))), ['Tensão admissível de referência (kgf/cm²)'].concat(SS.map(x => F(x.sigma_adm, 2))), ['Solo-cimento no reaterro'].concat(SS.map(x => E(x.solo_cimento))), ['Peso específico solo-cimento (kgf/m³)'].concat(SS.map(x => F(x.gamma_sc, 0)))], { left: true }));
      B.push(H1('Metodologia de cálculo'));
      B.push(P('Nos itens seguintes são apresentadas as expressões empregadas no dimensionamento das fundações em sapata, conforme a planilha de referência.'));
      B.push(H2('Verificação à compressão'));
      B.push(EQ('σ<sub>méd</sub> = (γ<sub>f</sub> · V + P<sub>fM</sub> + P<sub>s</sub>) / A²'));
      B.push(EQ('σ<sub>borda</sub> = (γ<sub>f</sub> · V + P<sub>fM</sub> + P<sub>s</sub>) / A² + 6 · (T + L<sub>g</sub>) · (L + G<sub>máx</sub>) / A³'));
      B.push(P('Quando a excentricidade relativa caracteriza contato parcial, a tensão de borda é obtida pela tabela de coeficientes k de contato da referência. A tensão admissível é calculada por:'));
      B.push(EQ('σ<sub>adm</sub> = [ c · N<sub>c</sub> · S<sub>c</sub> + γ · L · N<sub>q</sub> · S<sub>q</sub> + ½ · γ · A · N<sub>γ</sub> · 0,6 ] / 3'));
      B.push(EQ('FS = mín( σ<sub>adm</sub> / σ<sub>méd</sub> ; 1,3 · σ<sub>adm</sub> / σ<sub>borda</sub> ) ≥ 1,0'));
      B.push(P('Adicionalmente verifica-se o critério empírico σ<sub>emp</sub> = σ<sub>adm,ref</sub> + γ · L, com as mesmas relações de tensão média e de borda.'));
      B.push(H2('Verificação ao deslizamento'));
      B.push(EQ('FS = [ (V + P<sub>fm</sub> + P<sub>s</sub>) · tanϕ + A² · c ] / (γ<sub>f</sub> · H<sub>R</sub>) ≥ 1,0'));
      B.push(H2('Verificação ao arrancamento (Biarez)'));
      B.push(EQ('Q<sub>rt</sub> = 4 · A · D² · γ · M<sub>γ</sub> + P<sub>fm</sub> + P<sub>s</sub> ; &nbsp; D = L<sub>a</sub> + L<sub>f</sub> &lt; D<sub>c</sub> = 2,5 · (A − a)'));
      B.push(P('Categoria 2, ruptura generalizada. Quando há solo-cimento no reaterro, P<sub>s</sub> considera o peso específico do solo-cimento.'));
      B.push(H2('Verificação ao tombamento'));
      B.push(EQ('M<sub>tomb</sub> = (γ<sub>f</sub> · T − P<sub>fM</sub>) · A / 3 + γ<sub>f</sub> · H · (L + G<sub>máx</sub>) ; &nbsp; M<sub>eq</sub> = Q<sub>rt</sub> · A / 3'));
      B.push(EQ('FS = M<sub>eq</sub> / M<sub>tomb</sub> ≥ 1,0'));
      B.push(H2('Armaduras e punção'));
      B.push(P('A armadura da base (N3 superior e N4 inferior) é dimensionada à flexão pelas tabelas k<sub>c</sub>/k<sub>s</sub>, unificando as duas malhas pela maior necessidade. A armadura longitudinal do fuste (N1) é dimensionada pela envoltória resistente da seção quadrada (diagrama de interação N × M), obtida por compatibilidade de deformações conforme a NBR 6118 (itens 8.2.10.1, 8.3.6 e 17.2.2), com as barras distribuídas nas quatro faces e flexão verificada no eixo principal e na diagonal; os efeitos de segunda ordem são considerados quando λ &gt; λ<sub>lim</sub>, pelo critério da planilha de referência. As barras adotadas são verificadas em todas as hipóteses (F.S. = M<sub>Rd</sub> / M<sub>d</sub>) e no plano M<sub>x</sub> × M<sub>y</sub>, com o momento resultante no eixo principal (direção mais desfavorável). Para comparação, a taxa mecânica ω também é obtida pelo ábaco 3.8. Os estribos (N2) seguem o item 17.4.2 da NBR 6118. A punção é verificada na face do fuste:'));
      B.push(EQ('τ<sub>Sd</sub> = γ<sub>f</sub> · V / (4 · a · d) + 0,6 · M<sub>d</sub> / (W<sub>p</sub> · d) &nbsp;≤&nbsp; τ<sub>Rd2</sub>'));
      B.push(H1('Cargas máximas nas fundações'));
      B.push(P('As cargas máximas atuantes nas fundações foram obtidas a partir da memória de cálculo da estrutura, conforme referenciado no Item 2 deste documento:'));
      const sisC = ent.sistema_cargas ? ' (' + E(ent.sistema_cargas.toLowerCase()) + ')' : '';
      const cargRows = arr => arr.map(c => [E(c.hipotese), F(c.vertical_kgf, 0), F(c.transversal_kgf, 0), F(c.longitudinal_kgf, 0), F(Math.hypot(c.transversal_kgf, c.longitudinal_kgf), 1)]);
      const cargHead = ['Hipótese', 'Vertical (kgf)', 'Transversal (kgf)', 'Longitudinal (kgf)', 'Resultante (kgf)'];
      B.push(TAB('Cargas Máximas de Compressão' + sisC + ' nas Fundações – ' + E(torre) + '.', cargHead, cargRows(ent.cargas_compressao)));
      B.push(TAB('Cargas Máximas de Tração' + sisC + ' nas Fundações – ' + E(torre) + '.', cargHead, cargRows(ent.cargas_tracao)));
      B.push(P('Para efeito de dimensionamento geotécnico e estrutural, serão aplicados, respectivamente, os fatores de ponderação de carga de ' + F(ent.coef_geo, 2) + ' e ' + F(ent.coef_estr, 2) + ' sobre as cargas máximas apresentadas neste item.'));
      B.push(H1('Dimensionamento'));
      B.push(H2('Geometria da sapata'));
      B.push(TT('Geometria adotada por tipo de solo', [['A_m', 'A', 'm', 2], ['a_m', 'a', 'm', 2], ['La_m', 'L<sub>a</sub>', 'm', 2], ['Lb_m', 'L<sub>b</sub>', 'm', 2], ['Lf_m', 'L<sub>f</sub>', 'm', 2], ['L_m', 'L', 'm', 2], ['D_m', 'D', 'm', 2], ['Dc_m', 'D<sub>c</sub>', 'm', 2], ['rigidez', 'Rigidez', '-', null], ['vent_m3', 'V<sub>enterrado</sub>', 'm³', 3], ['reaterro_m3', 'V<sub>reaterro</sub>', 'm³', 3], ['Pmin_kgf', 'P<sub>fm</sub>', 'kgf', 0], ['Pmax_kgf', 'P<sub>fM</sub>', 'kgf', 0], ['Ps_kgf', 'P<sub>s</sub>', 'kgf', 0]]));
      B.push(H2('Verificações geotécnicas'));
      B.push(TT('Compressão e deslizamento', [['sigma_adm_calc', 'σ<sub>adm</sub>', 'kgf/cm²', 3], ['sigma_empirica', 'σ<sub>emp</sub>', 'kgf/cm²', 3], ['sigma_media_max', 'σ<sub>méd,máx</sub>', 'kgf/cm²', 3], ['sigma_borda_max', 'σ<sub>borda,máx</sub>', 'kgf/cm²', 3], ['FS_compressao_min', 'FS compressão', '-', 2], ['FS_empirico_min', 'FS empírico', '-', 2], ['compressao', 'Situação', '-', null], ['FS_deslizamento_min', 'FS deslizamento', '-', 2], ['deslizamento', 'Situação', '-', null]]));
      B.push(TT('Arrancamento e tombamento', [['Qrt_kgf', 'Q<sub>rt</sub>', 'kgf', 0], ['FS_arrancamento_min', 'FS arrancamento', '-', 2], ['arrancamento', 'Situação', '-', null], ['FS_tombamento_min', 'FS tombamento', '-', 2], ['FS_USBR_min', 'FS USBR', '-', 2], ['tombamento', 'Situação', '-', null]]));
      solos.forEach(n => { const T = TBL[n]; if (!T) return; B.push(H3('Solo ' + n + ' – verificações por hipótese'));
        B.push(tabH('Compressão por hipótese – solo ' + E(n), T.compressao, [['hipotese', 'Hipótese'], ['sigma_media', 'σ<sub>méd</sub>', 3], ['sigma_borda', 'σ<sub>borda</sub>', 3], ['sigma_min_linear', 'σ<sub>mín</sub>', 3], ['FS_compressao', 'FS comp.', 2], ['FS_empirico', 'FS emp.', 2], ['FS_deslizamento', 'FS desl.', 2], ['resultado', 'Resultado']], { cls: 'q' }));
        B.push(tabH('Tração por hipótese – solo ' + E(n), T.tracao, [['hipotese', 'Hipótese'], ['FS_arrancamento', 'FS arrancamento', 2], ['FS_tombamento', 'FS tombamento', 2], ['FS_USBR', 'FS USBR', 2], ['resultado', 'Resultado']])); });
      B.push(H2('Armadura da base'));
      solos.forEach(n => { const T = TBL[n]; if (T) B.push(tabH('Base – hipóteses de cálculo – solo ' + E(n), T.base, [['marca', 'Marca'], ['hipotese', 'Hipótese'], ['Md_kgfm', 'M<sub>d</sub> (kgf·m)', 0], ['Mdmin_kgfm', 'M<sub>d,mín</sub>', 0], ['d_cm', 'd (cm)', 1], ['kc', 'k<sub>c</sub>', 2], ['ks', 'k<sub>s</sub>', 3], ['As_calc_cm2', 'A<sub>s,calc</sub>', 2], ['As_min_cm2', 'A<sub>s,mín</sub>', 2]], { cls: 'q' })); });
      B.push(H2('Armadura do fuste'));
      solos.forEach(n => { const T = TBL[n], x = R(n), fg = figs[n] || {}; if (!T) return;
        B.push(H3('Solo ' + n + ' – verificação da seção do fuste'));
        B.push(tabH('Fuste – hipóteses de cálculo – solo ' + E(n), (T.fuste || []).map(rw => Object.assign({}, rw, { tipo: rw.tipo === 'tracao' ? 'tração' : rw.tipo === 'compressao' ? 'compressão' : rw.tipo, FS: rw.MRd_kgfm && rw.Md_adot_kgfm ? rw.MRd_kgfm / rw.Md_adot_kgfm : null })),
          [['tipo', 'Tipo'], ['hipotese', 'Hip.'], ['Nd_kgf', 'N<sub>d</sub>', 0], ['Md_adot_kgfm', 'M<sub>d</sub>', 0], ['lambda_', 'λ', 1], ['omega', 'ω envolt.', 3], ['omega_abaco', 'ω ábaco', 3], ['As_calc_cm2', 'A<sub>s</sub> (cm²)', 2], ['MRd_kgfm', 'M<sub>Rd</sub>', 0], ['FS', 'F.S.', 2]], { cls: 'q' }));
        if (fg.corte || fg.planta) B.push(FIGS('Corte e seção do fuste com a armadura adotada – solo ' + E(n), [fg.corte, fg.planta]));
        B.push(FIGS('Diagramas de interação das barras adotadas (' + E(x.N1_txt) + ' mm) – solo ' + E(n),
          [grafNM(x.N1_envoltoria, (T.fuste || []).map(c => ({ tipo: c.tipo === 'tracao' ? 'tração' : 'compressão', N: (c.tipo === 'tracao' ? -1 : 1) * c.Nd_kgf, M: Math.abs(c.Md_adot_kgfm) }))), grafMxMy(x.N1_mxmy)]));
        B.push(legGraf); });
      B.push(H2('Estribos e punção'));
      B.push(TT('Estribos (Posição N2) e punção', [['N2_txt', 'N2', '-', null], ['N2_Vd_kgf', 'V<sub>d</sub>', 'kgf', 0], ['N2_Vc_kgf', 'V<sub>c</sub>', 'kgf', 0], ['N2_Vsw_kgf', 'V<sub>sw</sub>', 'kgf', 0], ['N2_VRd2_kgf', 'V<sub>Rd2</sub>', 'kgf', 0], ['FS_puncao_min', 'FS punção', '-', 2], ['puncao', 'Situação', '-', null]]));
      B.push(H2('Armaduras adotadas'));
      B.push(TAB('Resumo das armaduras adotadas', ['Solo', 'Base N3/N4 (por direção)', 'Transpasse N3/N4 (cm)', 'Fuste N1', 'M<sub>d</sub>/M<sub>Rd</sub> N1', 'Transpasse N1 (cm)', 'Estribos N2'], solos.map(n => { const x = R(n); return [n, E(x.base_txt) + ' cm', F(x.N3_transpasse_cm, 0) + ' / ' + F(x.N4_transpasse_cm, 0), E(x.N1_txt) + ' mm', F(x.N1_utilizacao, 2), F(x.N1_transpasse_cm, 0), E(x.N2_txt) + ' cm']; })));
      B.push(H2('Resumo das verificações'));
      B.push(TAB('Resumo das verificações por tipo de solo', ['Solo', 'Compressão', 'Deslizamento', 'Arrancamento', 'Tombamento', 'Punção', 'Rigidez'], solos.map(n => { const x = R(n); return [n, ST(x.compressao), ST(x.deslizamento), ST(x.arrancamento), ST(x.tombamento), ST(x.puncao), ST(x.rigidez)]; })));
      B.push(H2('Tabelas de quantitativos'));
      solos.forEach(n => { const q = res.quantitativos[n]; if (!q) return;
        B.push(TAB('SAPATA — ' + E(torre) + '-' + E(tipo) + '-' + E(n) + ' — POR FUNDAÇÃO',
          [[{ t: 'DIMENSÕES', span: 3 }, { t: 'VOLUMES', span: 3 }, { t: E(q.n1), span: 3 }, { t: E(q.n2), span: 2 }, { t: 'PESO', span: 2 }],
           ['G (cm)', 'H (m)', 'P (m)', 'Concreto (m³)', 'Escavação (m³)', 'Reaterro (m³)', 'Compr. unit. (m)', 'Qtd.', 'Peso (kgf)', 'Qtd.', 'Peso (kgf)', 'Base (kgf)', 'Total (kgf)']],
          q.linhas.map(l => [F(l.G_cm, 0), F(l.H_m, 2), F(l.P_m, 2), F(l.concreto_m3, 2), F(l.escavacao_m3, 2), F(l.reaterro_m3, 2), F(l.N1_unit_m, 2), F(l.N1_qtd, 0), F(l.N1_kg, 1), F(l.N2_qtd, 0), F(l.N2_kg, 1), F(l.base_kg, 1), '<b>' + F(l.aco_total_kg, 1) + '</b>']), { cls: 'q' }));
        const T = TBL[n]; if (T) B.push(tabH('Ferro da base – solo ' + E(n), T.ferro_base, [['marca', 'Marca'], ['quantidade', 'Quantidade', 0], ['comprimento_m', 'Comprimento (m)', 2], ['phi_mm', 'Ø (mm)', 1], ['peso_kg', 'Peso (kgf)', 1]])); });
    } else {
    B.push(H1('Objetivo'));
    B.push(P('Este documento apresenta a metodologia de cálculo e os resultados do dimensionamento da fundação em ' + nomeFl + ', tipo ' + E(tipo) + ', para os solos ' + solos.join(', ') + ' e as cargas máximas atuantes na torre ' + E(torre) + ' do empreendimento.'));

    B.push(H1('Referências'));
    const refs = ['Alonso, Urbano Rodriguez. Exercícios de fundações. São Paulo: Edgard Blücher, 1983;', 'Biarez J. and Barraud Y. – “The Use of Soil Mechanics Methods for Adapting Tower Foundations to Soil Conditions”, CIGRÉ 1968, 22-06;', 'Bowles J.E. – Foundation Analysis and Design – 1977;', 'Campos, João Carlos de – Elementos de fundações em concreto. São Paulo: Oficina de Textos, 2015;', 'Cintra, José Carlos A.; Aoki, Nelson; Albiero, José Henrique – Fundações diretas: projeto geotécnico. São Paulo: Oficina de Textos, 2011;', 'Garcia, O. C. – Influência da Qualidade da Compactação dos Reaterros na Capacidade de Carga de Fundações Submetidas a Esforços de Tração;', 'Pfeil W. – Dimensionamento do Concreto Armado à Flexão Composta – 1976;', 'Sabóia, Maciel e F. Costa – Fundações - Projeto de Suportes de Linhas de Transmissão - Novas Tecnologias e Confiabilidade (XI ERIAC);', 'Süssekind J. C. – Concreto Armado – Vol. II;'];
    if (doc.ref11) refs.push(E(doc.ref11));
    refs.push('– Torre Tipo ' + E(torre) + ' – Cálculo Estrutural' + (ent.stub.codigo ? ' – Stub ' + E(ent.stub.codigo) : '') + '.');
    refs.forEach((r, i) => B.push('<p class="ref">[' + (i + 1) + ']<span class="tab"></span>' + r + '</p>'));
    B.push(P('As normas técnicas abaixo, em suas últimas revisões, devem ser observadas no projeto das fundações:'));
    B.push('<p class="ref"><b>ABNT - Associação Brasileira de Normas Técnicas</b></p><p class="ref">NBR 6122<span class="tab"></span>Projeto e Execução de Fundações</p><p class="ref">NBR 6118<span class="tab"></span>Projeto de Estruturas de Concreto (2023)</p>');

    B.push(H1('Simbologia'));
    B.push(ONDE([['D', 'diâmetro do fuste do tubulão'], ['L', 'comprimento enterrado do fuste'], ['G', 'afloramento do fuste (G<sub>mín</sub> e G<sub>máx</sub>)'], ['H', 'altura total do tubulão (L + G)'], ['A<sub>b</sub>', 'área da seção transversal do fuste'], ['ϕ', 'ângulo de atrito interno do solo'], ['c', 'coesão do solo'], ['τ', 'tensão de aderência lateral solo-fuste'], ['γ<sub>t</sub>', 'peso específico do solo'], ['γ<sub>conc</sub>', 'peso específico do concreto armado'], ['γ<sub>c</sub>', 'coeficiente de minoração da resistência do concreto'], ['γ<sub>s</sub>', 'coeficiente de minoração da resistência do aço'], ['γ<sub>f</sub>', 'fator de ponderação das cargas (geotécnico / estrutural)'], ['f<sub>ck</sub>', 'resistência característica do concreto à compressão'], ['f<sub>yk</sub>', 'resistência característica do aço à tração'], ['σ<sub>adm</sub>', 'tensão admissível de compressão do solo'], ['σ<sub>sol</sub>', 'tensão solicitante na base do tubulão'], ['C', 'carga de compressão máxima'], ['T', 'carga de tração máxima'], ['H<sub>R</sub>', 'carga horizontal resultante'], ['M<sub>s</sub>', 'momento solicitante de tombamento'], ['M<sub>r</sub>', 'momento resistente de tombamento'], ['K<sub>p</sub>', 'coeficiente de empuxo passivo'], ['P<sub>fm</sub>', 'peso da fundação com fuste mínimo'], ['P<sub>fM</sub>', 'peso da fundação com fuste máximo'], ['Q<sub>rt</sub>', 'capacidade de carga à tração (arrancamento)'], ['N<sub>d</sub>, M<sub>d</sub>', 'esforço normal e momento fletor de cálculo no fuste'], ['e<sub>v</sub>', 'excentricidade vertical oriunda da inclinação do stub'], ['ν, μ, ω', 'esforço normal relativo, momento relativo e taxa mecânica de armadura'], ['M<sub>1d,mín</sub>', 'momento mínimo de primeira ordem'], ['λ, λ<sub>1</sub>', 'índice de esbeltez e seu valor-limite'], ['M<sub>2d</sub>', 'momento de segunda ordem'], ['M<sub>Rd</sub>', 'momento resistente de cálculo para o N<sub>d</sub> da hipótese'], ['F.S.', 'fator de segurança da seção, M<sub>Rd</sub> / M<sub>d</sub>'], ['A<sub>s</sub>', 'área de armadura longitudinal'], ['V<sub>d</sub>', 'força cortante solicitante de cálculo'], ['V<sub>Rd2</sub>, V<sub>Rd3</sub>', 'forças cortantes resistentes de cálculo'], ['V<sub>c</sub>, V<sub>sw</sub>', 'parcelas resistidas pelo concreto e pela armadura transversal']]));

    B.push(H1('Características dos materiais utilizados'));
    B.push(P('Serão detalhadas nesta sessão as características físicas e de resistência dos materiais a serem empregadas nas fundações das torres.'));
    B.push(H2('Concreto Armado'));
    B.push(P('Define-se para o empreendimento uma classe de concreto C' + F(M.fck_mpa, 0) + ', de acordo com a NBR 6118, Tabela 6.1.'));
    B.push(TAB('Características Físicas e de Resistência do Concreto Armado', ['Tipo', 'Simb.', 'Unid.', 'Valor'], [
      ['Resistência Característica do Concreto', 'f<sub>ck</sub>', 'MPa', F(M.fck_mpa, 0)], ['Resistência de Cálculo', 'f<sub>cd</sub>', 'MPa', F(fcd, 3)], ['Coeficiente de Minoração de Resistência do Concreto', 'γ<sub>c</sub>', '-', F(M.gamma_concreto, 2)], ['Cobrimento das Armaduras', 'Cobr', 'cm', F(M.cobrimento_cm, 1)], ['Peso Específico do Concreto', 'γ<sub>conc</sub>', 'kgf/m³', F(M.peso_especifico_concreto_kgf_m3, 0)]], { left: true, cols: ['56%', '14%', '14%', '16%'] }));
    B.push(H2('Aço'));
    B.push(TAB('Características Físicas e de Resistência do Aço', ['Tipo', 'Simb.', 'Unid.', 'Valor'], [
      ['Resistência Característica do Aço à Tração', 'f<sub>yk</sub>', 'MPa', F(M.fyk_mpa, 0)], ['Resistência de Cálculo', 'f<sub>yd</sub>', 'MPa', F(fyd, 2)], ['Coeficiente de Minoração de Resistência do Aço', 'γ<sub>s</sub>', '-', F(M.gamma_aco, 2)], ['Peso Específico do Aço', 'γ<sub>aço</sub>', 'kgf/m³', F(M.peso_especifico_aco_kgf_m3, 0)]], { left: true, cols: ['56%', '14%', '14%', '16%'] }));
    B.push(H2('Parâmetros do solo'));
    B.push(TAB('Parâmetros geotécnicos para solos' + (ent.tipificacao ? ' – ' + E(ent.tipificacao) : ''), ['Tipos'].concat(ent.solos.map(s => E(s.nome))), [
      ['Peso específico (kgf/m³)'].concat(ent.solos.map(s => F(s.gamma_kgf_m3, 0))), ['Coesão (kgf/m²)'].concat(ent.solos.map(s => F(s.coesao_kgf_m2, 0))), ['Ângulo de atrito (°)'].concat(ent.solos.map(s => F(s.phi_graus, 0))), ['Tensão de aderência (kgf/cm²)'].concat(ent.solos.map(s => F(s.aderencia_kgf_cm2, 2))), ['Solo submerso'].concat(ent.solos.map(s => s.submerso ? 'Sim' : 'Não'))], { left: true }));

    B.push(H1('Metodologia de cálculo'));
    B.push(P('Nos itens seguintes são apresentadas as metodologias empregadas para o dimensionamento das fundações em ' + nomeFl + ', considerando a variação do tipo de solo e da torre analisada.'));
    B.push(H2('Verificação à compressão'));
    B.push(P('A tensão solicitante na base do tubulão (σ<sub>sol</sub>), descontada a parcela resistida pelo atrito lateral ao longo do fuste, deverá ser igual ou inferior à tensão admissível do solo ao nível da base:'));
    B.push(EQ('σ<sub>sol</sub> = (γ<sub>f</sub> · C + P<sub>fM</sub> − Q<sub>l</sub>) / A<sub>b</sub> &nbsp;≤&nbsp; σ<sub>adm</sub>'));
    B.push(EQ(TB ? 'Q<sub>l</sub> = τ · π · D<sub>f</sub> · (L − 1,5 · D<sub>b</sub>)' : 'Q<sub>l</sub> = τ · π · D · L'));
    if (TB) B.push(P('No tubulão com base, A<sub>b</sub> é a área da base alargada (π·D<sub>b</sub>²/4) e o peso próprio considera fuste, tronco de cone do alargamento e rodapé cilíndrico. O atrito lateral é desconsiderado no trecho de 1,5·D<sub>b</sub> acima da ponta.'));
    B.push(P('A tensão admissível foi obtida pela expressão de capacidade de carga com fatores de forma, adotando-se fator de segurança igual a 3:'));
    B.push(EQ('σ<sub>adm</sub> = [ c · N<sub>c</sub> · S<sub>c</sub> + γ<sub>t</sub> · L · N<sub>q</sub> · S<sub>q</sub> + ½ · γ<sub>t</sub> · D · N<sub>γ</sub> · S<sub>γ</sub> ] / 3'));
    B.push(EQ('N<sub>q</sub> = e<sup>π·tanϕ</sup> · tan²(45° + ϕ/2) ; &nbsp; N<sub>c</sub> = (N<sub>q</sub> − 1) / tanϕ ; &nbsp; N<sub>γ</sub> = 2 · (N<sub>q</sub> + 1) · tanϕ'));
    B.push(EQ('S<sub>q</sub> = 1 + tanϕ ; &nbsp; S<sub>c</sub> = 1 + N<sub>q</sub> / N<sub>c</sub> ; &nbsp; S<sub>γ</sub> = 0,6'));
    B.push(H2('Verificação ao tombamento'));
    B.push(P('O momento resistente, mobilizado pelo empuxo passivo do solo ao longo do comprimento enterrado, deverá ser superior ao momento solicitante oriundo da maior carga horizontal resultante:'));
    B.push(EQ('M<sub>s</sub> = γ<sub>f</sub> · H<sub>R,máx</sub> · (L + G<sub>máx</sub>)'));
    B.push(EQ('M<sub>r</sub> = ½ · D · γ<sub>t</sub> · L³ · K<sub>p</sub> ; &nbsp; K<sub>p</sub> = tan²(45° + ϕ/2)'));
    B.push(EQ('FS = M<sub>r</sub> / M<sub>s</sub> &nbsp;&gt;&nbsp; 1,0'));
    B.push(H2('Verificação ao arrancamento (Método de Grenoble)'));
    B.push(P('A capacidade de carga de ruptura à tração do tubulão, considerando ruptura generalizada ao longo do fuste, é dada por:'));
    if (TB) { B.push(EQ('Q<sub>rt</sub> = Q<sub>b</sub> + Q<sub>f</sub> + P<sub>fm</sub>')); B.push(EQ('Q<sub>b</sub> = (A<sub>b</sub> − A<sub>f</sub>) · F<sub>b</sub> · C<sub>b</sub> · (γ<sub>t</sub> · L<sub>e</sub> · tanϕ + c)')); B.push(EQ('Q<sub>f</sub> = π · D<sub>f</sub> · L<sub>e</sub> · ( c · M<sub>c</sub> + γ<sub>t</sub> · L<sub>e</sub> · M<sub>ϕγ</sub> ) ; &nbsp; L<sub>e</sub> = L<sub>f</sub> + L<sub>a</sub>/2')); }
    else B.push(EQ('Q<sub>rt</sub> = π · D · L · ( c · M<sub>c</sub> + γ<sub>t</sub> · L · M<sub>ϕγ</sub> + q<sub>0</sub> · M<sub>q</sub> ) + P<sub>fm</sub>'));
    B.push(P('Os coeficientes de capacidade de carga M<sub>c</sub>, M<sub>ϕγ</sub> e M<sub>q</sub> são obtidos em função do ângulo de atrito interno do solo (ϕ) e da profundidade relativa L/R, para um ângulo de ruptura α = −ϕ/8, conforme Biarez e Barraud [2]. Para solos submersos, o peso específico do concreto é reduzido em 1000 kgf/m³ no cálculo de P<sub>fm</sub>. A relação entre a capacidade de carga à tração e a tração máxima de cálculo deverá satisfazer:'));
    B.push(EQ('Q<sub>rt</sub> &nbsp;≥&nbsp; T<sub>d</sub> = γ<sub>f</sub> · T'));
    B.push(H2('Cálculo da armadura do fuste'));
    B.push(P('Os esforços de cálculo no fuste são obtidos para cada hipótese de carga, considerando a posição do ponto de momento máximo abaixo do terreno e a excentricidade vertical decorrente da inclinação do stub (expressão da planilha de referência):'));
    B.push(EQ('N<sub>d</sub> = γ<sub>f</sub> · V'));
    B.push(EQ('M<sub>1d</sub> = γ<sub>f</sub> · H<sub>R</sub> · [ G<sub>máx</sub> + e<sub>h</sub> + 0,545 · √( H<sub>R</sub> / (γ<sub>t</sub> · D · K<sub>p</sub>) ) ] − γ<sub>f</sub> · V · e<sub>v</sub>'));
    B.push(P('Nas hipóteses de compressão, o momento de primeira ordem não é tomado menor que o momento mínimo (NBR 6118, 11.3.3.4.3), e o efeito local de segunda ordem é avaliado pelo método do pilar-padrão com curvatura aproximada (NBR 6118, 15.8.3.3.2), tratando o fuste como balanço (ℓ<sub>e</sub> = 2ℓ, com ℓ igual ao afloramento mais a profundidade do momento máximo):'));
    B.push(EQ('M<sub>1d,mín</sub> = N<sub>d</sub> · (0,015 + 0,03 · D) ; &nbsp; λ = ℓ<sub>e</sub> / (D/4) ; &nbsp; λ<sub>1</sub> = (25 + 12,5 · e<sub>1</sub>/D) / α<sub>b</sub>, &nbsp;35 ≤ λ<sub>1</sub> ≤ 90'));
    B.push(EQ('1/r = 0,005 / [D · (ν + 0,5)] ≤ 0,005 / D ; &nbsp; M<sub>d,tot</sub> = α<sub>b</sub> · M<sub>1d</sub> + N<sub>d</sub> · ℓ<sub>e</sub>² / 10 · 1/r &nbsp;≥&nbsp; M<sub>1d</sub> &nbsp; (λ &gt; λ<sub>1</sub>; α<sub>b</sub> = 0,90)'));
    B.push(P('A armadura longitudinal é dimensionada pela envoltória resistente da seção (diagrama de interação N × M), obtida por compatibilidade de deformações conforme a NBR 6118 (itens 8.2.10.1, 8.3.6 e 17.2.2): concreto com diagrama parábola-retângulo e α<sub>c</sub> = 0,85, sem resistência à tração; aço com diagrama elastoplástico; e estados-limite últimos definidos pelos polos A (ε<sub>s</sub> = 10 ‰), B (ε<sub>cu</sub>) e C (ε<sub>c2</sub>). Para cada hipótese, determina-se a menor armadura que faz o par (N<sub>d</sub>, M<sub>d</sub>) ficar dentro da envoltória; a maior delas define A<sub>s,calc</sub>:'));
    B.push(EQ('M<sub>Rd</sub>(N<sub>d</sub>, A<sub>s,calc</sub>) ≥ M<sub>d</sub> ; &nbsp; A<sub>s,req</sub> = máx(A<sub>s,calc</sub> ; 0,4% · A<sub>b</sub>) ; &nbsp; ω = A<sub>s,calc</sub> · f<sub>yd</sub> / (A<sub>b</sub> · 0,85 · f<sub>cd</sub>)'));
    B.push(P('Essa análise é feita uma única vez, com as barras posicionadas no raio correspondente à maior bitola disponível (a favor da segurança). A bitola é escolhida entre as disponíveis priorizando espaçamento entre ' + F(ent.armaduras.espacamento_longitudinal_ideal_min_cm, 0) + ' e ' + F(ent.armaduras.espacamento_longitudinal_ideal_max_cm, 0) + ' cm (ideal), admitindo-se de ' + F(ent.armaduras.espacamento_longitudinal_min_cm, 0) + ' a ' + F(ent.armaduras.espacamento_longitudinal_max_cm, 0) + ' cm, com no mínimo 6 barras (NBR 6118, 18.4.2.2) e o menor excesso de aço. Em seguida, as barras adotadas são verificadas em todas as hipóteses, obtendo-se o momento resistente M<sub>Rd</sub> e o fator de segurança F.S. = M<sub>Rd</sub> / M<sub>d</sub>.'));
    B.push(P('A flexão composta oblíqua é verificada no plano M<sub>x</sub> × M<sub>y</sub>: para o esforço normal de cada hipótese crítica, a linha neutra é girada em torno da seção e calcula-se o contorno resistente, que deve englobar os momentos solicitantes e a envoltória mínima com segunda ordem (NBR 6118, 15.3.2). Como a seção é circular, o momento resultante é representado sobre o eixo M<sub>x</sub>. Para comparação, a taxa mecânica ω também é obtida pelos ábacos de Pfeil [7] (5.2 e 5.4), com ν = N<sub>d</sub> / (0,85 · f<sub>cd</sub> · D²) e μ = ν · e / D.'));
    B.push(H2('Cálculo da armadura de cisalhamento (estribos)'));
    B.push(P('O cálculo da armadura dos estribos foi baseado no item 17.4.2 da norma NBR 6118. Assim sendo, a força cortante solicitante de cálculo, numa determinada seção transversal, deve respeitar, simultaneamente, as duas seguintes condições:'));
    B.push(EQ('1) &nbsp; V<sub>d</sub> ≤ V<sub>Rd2</sub> = 0,27 · α<sub>v2</sub> · f<sub>cd</sub> · b<sub>w</sub> · d ; &nbsp; α<sub>v2</sub> = 1 − f<sub>ck</sub>/250'));
    B.push(EQ('2) &nbsp; V<sub>d</sub> ≤ V<sub>Rd3</sub> = V<sub>c</sub> + V<sub>sw</sub>'));
    B.push(EQ('V<sub>c</sub> = 0,6 · f<sub>ctd</sub> · b<sub>w</sub> · d ; &nbsp; f<sub>ctd</sub> = f<sub>ctk,inf</sub> / γ<sub>c</sub> ; &nbsp; f<sub>ctk,inf</sub> = 0,21 · f<sub>ck</sub><sup>2/3</sup>'));
    B.push(EQ('V<sub>sw</sub> = (A<sub>sw</sub> / s) · 0,9 · d · f<sub>yd</sub>'));
    B.push(ONDE([['V<sub>d</sub>', 'força cortante solicitante de cálculo, na seção'], ['b<sub>w</sub>', 'largura da seção, adotada igual ao diâmetro D'], ['d', 'altura útil da seção, igual a D − cobrimento'], ['A<sub>sw</sub>', 'área da armadura transversal (dois ramos)'], ['s', 'espaçamento dos estribos']]));
    B.push(P('Entre as combinações de bitolas e espaçamentos (10 ou 15 cm) que atendem V<sub>sw</sub> &gt; V<sub>d</sub>, adota-se a de menor consumo de aço por metro.'));

    B.push(H1('Cargas máximas nas fundações'));
    B.push(P('As cargas máximas atuantes nas fundações foram obtidas a partir da memória de cálculo da estrutura, conforme referenciado no Item 2 deste documento. As tabelas a seguir apresentam os valores de referência utilizados no dimensionamento das fundações:'));
    const cargRows = arr => arr.map(c => [E(c.hipotese), F(c.vertical_kgf, 0), F(c.transversal_kgf, 0), F(c.longitudinal_kgf, 0), F(Math.hypot(c.transversal_kgf, c.longitudinal_kgf), 1)]);
    const cargHead = ['Hipótese', 'Vertical (kgf)', 'Transversal (kgf)', 'Longitudinal (kgf)', 'Resultante (kgf)'];
    const sisC = ent.sistema_cargas ? ' (' + E(ent.sistema_cargas.toLowerCase()) + ')' : '';
    B.push(TAB('Cargas Máximas de Compressão' + sisC + ' nas Fundações – ' + E(torre) + '.', cargHead, cargRows(ent.cargas_compressao)));
    B.push(TAB('Cargas Máximas de Tração' + sisC + ' nas Fundações – ' + E(torre) + '.', cargHead, cargRows(ent.cargas_tracao)));
    B.push(P('Observamos que as cargas máximas informadas são últimas, ou seja, levam em consideração os coeficientes de sobrecarga utilizados no dimensionamento estrutural.'));
    B.push(P('Para efeito de dimensionamento geotécnico e estrutural, serão aplicados, respectivamente, os fatores de ponderação de carga de ' + F(M.coef_geotecnico, 2) + ' e ' + F(M.coef_estrutural, 2) + ' sobre as cargas máximas resultantes no topo da fundação apresentadas neste item.'));

    B.push(H1('Dimensionamento'));
    B.push(P('Nos itens seguintes são apresentados os cálculos e resultados do dimensionamento da fundação em ' + nomeFl + '.'));
    B.push(H2('Geometria do tubulão'));
    B.push(figura());
    if (TB) B.push(TT('Geometria adotada por tipo de solo', [['D_m', 'D<sub>f</sub>', 'm', 2], ['Db_m', 'D<sub>b</sub>', 'm', 2], [(r, n) => ent.geometrias[n].angulo_base_graus, 'α', '°', 0], ['La_m', 'L<sub>a</sub>', 'm', 2], ['Lb_m', 'L<sub>b</sub>', 'm', 2], ['Lf_m', 'L<sub>f</sub>', 'm', 2], ['L_enterrado_m', 'L', 'm', 2], [(r, n) => ent.geometrias[n].afloramento_min_m, 'G<sub>mín</sub>', 'm', 2], [(r, n) => ent.geometrias[n].afloramento_max_m, 'G<sub>máx</sub>', 'm', 2], ['volume_concreto_min_m3', 'V<sub>conc,mín</sub>', 'm³', 2], ['volume_concreto_max_m3', 'V<sub>conc,máx</sub>', 'm³', 2], ['volume_escavacao_m3', 'V<sub>esc</sub>', 'm³', 2], ['peso_proprio_min_kgf', 'P<sub>fm</sub>', 'kgf', 0], ['peso_proprio_max_kgf', 'P<sub>fM</sub>', 'kgf', 0]]));
    else B.push(TT('Geometria adotada por tipo de solo', [
      [(r, n) => geo(n).g.diametro_m, 'D', 'm', 2], [(r, n) => geo(n).g.comprimento_enterrado_m, 'L', 'm', 2], [(r, n) => geo(n).g.afloramento_min_m, 'G<sub>mín</sub>', 'm', 2], [(r, n) => geo(n).g.afloramento_max_m, 'G<sub>máx</sub>', 'm', 2],
      [(r, n) => geo(n).Hmin, 'H<sub>mín</sub>', 'm', 2], [(r, n) => geo(n).Hmax, 'H<sub>máx</sub>', 'm', 2], [(r, n) => geo(n).A, 'A<sub>b</sub>', 'm²', 4], [(r, n) => geo(n).Vmin, 'V<sub>conc,mín</sub>', 'm³', 2], [(r, n) => geo(n).Vmax, 'V<sub>conc,máx</sub>', 'm³', 2], [(r, n) => geo(n).Vesc, 'V<sub>esc</sub>', 'm³', 2], [(r, n) => geo(n).Pfm, 'P<sub>fm</sub>', 'kgf', 0], [(r, n) => geo(n).PfM, 'P<sub>fM</sub>', 'kgf', 0]]));
    const st = res.stub;
    B.push(H2('Stub e excentricidade'));
    B.push(TAB('Dados do stub e excentricidade vertical resultante', ['Grandeza', 'Unid.', 'Valor'], [
      ['Código do stub', '-', E(ent.stub.codigo)], ['Altura real', 'mm', F(st.altura_real_mm, 1)], ['Altura vertical', 'mm', F(st.altura_vertical_mm, 1)], ['Altura enterrada', 'mm', F(st.altura_enterrada_mm, 1)], ['Espessura', 'mm', F(st.espessura_mm, 1)],
      ['Ângulo real β', '°', F(st.angulo_real_graus, 3)], ['Projeção real E', 'mm', F(st.projecao_real_mm, 2)], ['Inclinação real', '%', F(st.inclinacao_real_percentual, 3)], ['Excentricidade vertical e<sub>v</sub>', 'mm', F(res.excentricidade_vertical_mm, 3)]], { left: true, cols: ['56%', '14%', '30%'] }));
    B.push(H2('Verificação à compressão'));
    B.push(TT('Fatores de capacidade de carga', [[r => r.fatores.tan_phi, 'tan ϕ', '-', 4], [r => r.fatores.Nq, 'N<sub>q</sub>', '-', 3], [r => r.fatores.Nc, 'N<sub>c</sub>', '-', 3], [r => r.fatores.Ngamma, 'N<sub>γ</sub>', '-', 3], [r => r.fatores.Sq, 'S<sub>q</sub>', '-', 3], [r => r.fatores.Sc, 'S<sub>c</sub>', '-', 3], [r => r.fatores.Sgamma, 'S<sub>γ</sub>', '-', 2], [r => r.fatores.Kp, 'K<sub>p</sub>', '-', 3]]));
    B.push(TT('Verificação à compressão', [['sigma_solicitante_kgf_cm2', 'σ<sub>sol</sub>', 'kgf/cm²', 2], ['sigma_admissivel_kgf_cm2', 'σ<sub>adm</sub>', 'kgf/cm²', 2], ['compressao', 'Situação', '-', null]]));
    B.push(H2('Verificação ao tombamento'));
    B.push(TT('Verificação ao tombamento', [['momento_solicitante_kgfm', 'M<sub>s</sub>', 'kgf·m', 1], ['momento_resistente_kgfm', 'M<sub>r</sub>', 'kgf·m', 1], ['fs_tombamento', 'FS', '-', 2], ['tombamento', 'Situação', '-', null]]));
    B.push(H2('Verificação ao arrancamento'));
    B.push(TT('Verificação ao arrancamento (Grenoble)', [['tracao_solicitante_kgf', 'T<sub>d</sub>', 'kgf', 1]].concat(TB ? [['resistencia_base_kgf', 'Q<sub>b</sub>', 'kgf', 1], ['resistencia_fuste_kgf', 'Q<sub>f</sub>', 'kgf', 1], ['peso_proprio_min_kgf', 'P<sub>fm</sub>', 'kgf', 0]] : []).concat([ ['resistencia_arrancamento_kgf', 'Q<sub>rt</sub>', 'kgf', 2], ['fs_arrancamento', 'FS', '-', 2], ['arrancamento', 'Situação', '-', null]])));
    B.push(H2('Armadura do fuste'));
    B.push(H3('Esforços críticos'));
    B.push(TT('Esforços críticos de flexo-compressão e flexo-tração', [['hipotese_compressao_n1', 'Hipótese crítica de compressão', '-', null], ['Nd_compressao_kgf', 'N<sub>d</sub> compressão', 'kgf', 0], ['Md_compressao_kgfm', 'M<sub>d</sub> compressão (com M<sub>1d,mín</sub> e 2ª ordem)', 'kgf·m', 0],
      ['hipotese_tracao_n1', 'Hipótese crítica de tração', '-', null], ['Nd_tracao_kgf', 'N<sub>d</sub> tração', 'kgf', 0], ['Md_tracao_kgfm', 'M<sub>d</sub> tração', 'kgf·m', 0]]));
    B.push(H3('Armadura longitudinal (Posição N1)'));
    B.push(TT('Armadura longitudinal – envoltória resistente N × M (Posição N1)', [['caso_governante_n1', 'Hipótese que governa A<sub>s</sub>', '-', null], ['omega', 'ω (envoltória)', '-', 3], ['omega_abaco', 'ω pelo ábaco (referência)', '-', 3], ['rho_percentual', 'ρ', '%', 3],
      ['As_calculada_cm2', 'A<sub>s,calc</sub>', 'cm²', 2], ['As_minima_cm2', 'A<sub>s,mín</sub>', 'cm²', 2], ['As_requerida_cm2', 'A<sub>s,req</sub>', 'cm²', 2], ['As_adotada_cm2', 'A<sub>s,adot</sub>', 'cm²', 2], ['bitola_longitudinal_mm', 'Ø', 'mm', 1], ['quantidade_barras', 'Nº de barras', '-', 0], ['espacamento_longitudinal_cm', 'Espaçamento', 'cm', 1], ['faixa_espacamento_n1', 'Classificação', '-', null], ['transpasse_cm', 'Transpasse', 'cm', 0],
      ['hipotese_verificacao_n1', 'Hipótese de maior M<sub>d</sub>/M<sub>Rd</sub>', '-', null], ['MRd_n1_kgfm', 'M<sub>Rd</sub> (barras adotadas)', 'kgf·m', 0], ['utilizacao_n1', 'M<sub>d</sub> / M<sub>Rd</sub>', '-', 2]]));
    solos.forEach(n => {
      const r = R(n), cs = r.casos_n1 || [], fg = figs[n] || {};
      B.push(H3('Solo ' + n + ' – verificação da seção do fuste'));
      if (fg.corte || fg.planta) B.push(FIGS('Corte e seção do fuste com a armadura adotada – solo ' + E(n), [fg.corte, fg.planta]));
      B.push(FIGS('Diagramas de interação das barras adotadas (' + r.quantidade_barras + ' Ø ' + F(r.bitola_longitudinal_mm, r.bitola_longitudinal_mm % 1 ? 1 : 0) + ' mm) – solo ' + E(n),
        [grafNM(r.envoltoria_n1, cs.map(c => ({ tipo: c.tipo, N: c.Nd_kgf, M: Math.abs(c.Md_kgfm) }))), grafMxMy(r.mxmy_n1)]));
      B.push(legGraf);
      if (cs.length) B.push(TAB('Esforços e verificação por hipótese – solo ' + E(n), ['Hip.', 'Tipo', 'N<sub>d</sub> (kgf)', 'M<sub>1d</sub> (kgf·m)', 'M<sub>1d,mín</sub>', 'λ', 'M<sub>2d</sub>', 'M<sub>d</sub> (kgf·m)', 'A<sub>s,nec</sub> (cm²)', 'M<sub>Rd</sub> (kgf·m)', 'F.S.'],
        cs.map(c => [E(c.hipotese), E(c.tipo), F(c.Nd_kgf, 0), F(c.M1d_kgfm, 0), c.tipo === 'compressão' ? F(c.M1d_min_kgfm, 0) : '—', c.tipo === 'compressão' ? F(c.lambda, 1) : '—', c.tipo === 'compressão' ? F(c.M2d_kgfm, 0) : '—',
          F(c.Md_kgfm, 0), F(c.As_cm2, 2), F(c.MRd_kgfm, 0), '<b style="color:' + (c.MRd_kgfm >= Math.abs(c.Md_kgfm) ? '#00B050' : '#EE0000') + '">' + F(Math.abs(c.Md_kgfm) > 0 ? c.MRd_kgfm / Math.abs(c.Md_kgfm) : null, 2) + '</b>']), { cls: 'q' }));
    });
    B.push(H2('Cálculo da armadura de cisalhamento (estribo)'));
    B.push(TT('Verificação ao cisalhamento (Posição N2)', [['Vd_kgf', 'V<sub>d</sub>', 'kgf', 1], ['Vrd2_kgf', 'V<sub>Rd2</sub>', 'kgf', 0], ['Vc_kgf', 'V<sub>c</sub>', 'kgf', 0], ['bitola_estribo_adotada_mm', 'Ø', 'mm', 1], ['espacamento_estribo_adotado_cm', 's', 'cm', 0], ['Vsw_kgf', 'V<sub>sw</sub>', 'kgf', 0], ['criterio_Vsw_maior_Vd', 'V<sub>sw</sub> &gt; V<sub>d</sub>', '-', null], ['Vrd3_kgf', 'V<sub>Rd3</sub>', 'kgf', 0], ['fs_cisalhamento', 'FS', '-', 2], ['cisalhamento', 'Situação', '-', null]]));
    B.push(H2('Armaduras adotadas'));
    B.push(TAB('Resumo das armaduras adotadas', ['Solo', 'Longitudinal (Posição N1)', 'A<sub>s,adot</sub> (cm²)', 'M<sub>d</sub>/M<sub>Rd</sub>', 'Transpasse (cm)', 'Estribos (Posição N2)'],
      solos.map(n => { const r = R(n); return [n, r.quantidade_barras + ' Ø ' + F(r.bitola_longitudinal_mm, 1) + ' mm cada ' + F(r.espacamento_longitudinal_cm, 1) + ' cm', F(r.As_adotada_cm2, 2), F(r.utilizacao_n1, 2), F(r.transpasse_cm, 0), 'Ø ' + F(r.bitola_estribo_adotada_mm, 1) + ' mm cada ' + F(r.espacamento_estribo_adotado_cm, 0) + ' cm']; })));
    B.push(H2('Resumo das verificações'));
    B.push(TAB('Resumo das verificações por tipo de solo', ['Solo', 'Compressão', 'Tombamento', 'Arrancamento', 'Cisalhamento', 'Espaç. N1'],
      solos.map(n => { const r = R(n); return [n, ST(r.compressao), ST(r.tombamento) + ' (FS ' + F(r.fs_tombamento) + ')', ST(r.arrancamento) + ' (FS ' + F(r.fs_arrancamento) + ')', ST(r.cisalhamento) + ' (FS ' + F(r.fs_cisalhamento) + ')', ST(r.faixa_espacamento_n1)]; })));
    B.push(H2('Tabelas de quantitativos'));
    B.push(P('As tabelas a seguir apresentam os quantitativos por fundação para cada tipo de solo, em função do afloramento G.'));
    solos.forEach(n => {
      const q = res.quantitativos[n]; if (!q) return;
      B.push(TAB(nomeF.toUpperCase() + ' — ' + E(torre) + '-' + E(tipo) + '-' + E(n) + ' — POR FUNDAÇÃO',
        [[{ t: 'DIMENSÕES', span: TB ? 3 : 2 }, { t: 'VOLUMES', span: 2 }, { t: E(q.n1), span: 3 }, { t: E(q.n2), span: 3 }, { t: 'PESO', span: 1 }],
         ['G (cm)', 'H (m)'].concat(TB ? ['P fuste (m)'] : []).concat(['Concreto (m³)', 'Escavação (m³)', 'Compr. unit. (m)', 'Compr. total (m)', 'Peso (kgf)', 'Quant.', 'Compr. total (m)', 'Peso (kgf)', 'Total (kgf)'])],
        q.linhas.map(l => [F(l.G_cm, 0), F(l.H_m, 2)].concat(TB ? [F(l.P_fuste_m, 2)] : []).concat([F(l.concreto_m3, 2), F(l.escavacao_m3, 2), F(l.n1_comp_unit_m, 2), F(l.n1_comp_total_m, 0), F(l.n1_peso_kgf, 0), F(l.n2_quantidade, 0), F(l.n2_comp_total_m, 0), F(l.n2_peso_kgf, 0), '<b>' + F(l.peso_total_kgf, 0) + '</b>'])), { cls: 'q' }));
    });

    }

    const tocHtml = toc.map(t => '<div class="toc l' + t.lvl + '"><span class="tn">' + t.n + '</span><span class="tt">' + E(t.t) + '</span><span class="dots"></span><span class="tp" data-tocref="' + t.id + '"></span></div>').join('');
    const corpo = B.join('\n').replace('@@TOC@@', tocHtml);

    // ---------- capa e cabeçalho ----------
    const L = k => logos[k] ? '<img src="' + logos[k] + '" alt="">' : '';
    const colRev = Math.min(8, Math.max(0, parseInt(rev, 10) || 0));
    const grade = ['DATA', 'PROJETO', 'EXECUÇÃO', 'VERIFICAÇÃO', 'APROVAÇÃO'], gv = [doc.data, doc.projeto, doc.execucao, doc.verificacao, doc.aprovacao];
    const statusSel = doc.status || 'PARA COMENTÁRIOS';
    const capa = '<section class="page capa">' +
      '<table class="c"><colgroup><col style="width:13%"><col style="width:13%"><col style="width:44%"><col style="width:10%"><col style="width:8%"><col style="width:4%"><col style="width:8%"></colgroup>' +
      '<tr><td colspan="3" class="mc">MEMÓRIA DE CÁLCULO</td><td class="lb">Nº<br>DOCUMENTO:</td><td colspan="3" class="v b">' + E(numDoc) + '</td></tr>' +
      '<tr><td rowspan="5" class="logo">' + L('eletrobras') + '</td><td class="lb">Nº EMPREENDIMENTO:</td><td class="v">' + E(doc.numEmp) + '</td><td class="lb">REVISÃO:</td><td colspan="3" class="v c">' + E(rev) + '</td></tr>' +
      '<tr><td class="lb">UNIDADE:</td><td class="v">' + E(doc.unidade) + '</td><td class="lb">FOLHA:</td><td class="v c">1</td><td class="v c">de</td><td class="v c"><span class="tot"></span></td></tr>' +
      '<tr><td class="lb">LOCAL:</td><td colspan="5" class="v">' + E(doc.local) + '</td></tr>' +
      '<tr><td class="lb">CÓD. INSTALAÇÃO:</td><td colspan="5" class="v b">' + E(doc.codInst) + '</td></tr>' +
      '<tr><td class="lb">TAG:</td><td colspan="5" class="v">' + E(doc.tag) + '</td></tr>' +
      '<tr><td rowspan="3" class="logo2">' + L('ccee') + L('araxa') + '</td><td class="lb">TÍTULO:</td><td colspan="5" class="v b">' + E(titulo) + '</td></tr>' +
      '<tr><td class="lb">SUBTÍTULO:</td><td colspan="5" class="v b">' + E(subtitulo) + ' – MEMÓRIA DE CÁLCULO</td></tr>' +
      '<tr><td class="lb">Nº FORNECEDOR:</td><td class="v">' + E(doc.numForn) + '</td><td class="lb">REVISÃO:</td><td colspan="3" class="v c">' + E(rev) + '</td></tr></table>' +
      '<div class="revbox"><table class="c rev"><colgroup><col style="width:13%"><col style="width:52%"><col style="width:5%"><col style="width:30%"></colgroup>' +
      '<tr><td colspan="4" class="th">ÍNDICE DE REVISÕES</td></tr><tr><td class="th">REV</td><td colspan="3" class="th">DESCRIÇÃO E/OU FOLHAS ATINGIDAS</td></tr>' +
      STATUS.map((s, i) => '<tr class="st">' + (i === 0 ? '<td rowspan="' + STATUS.length + '" class="v c t nb">' + E(rev) + '</td><td rowspan="' + STATUS.length + '" class="v t nb">' + E(doc.revDesc || 'EMISSÃO INICIAL') + '</td>' : '') + '<td class="x">' + (s === statusSel ? 'X' : '') + '</td><td class="sl">' + s + '</td></tr>').join('') +
      '</table><div class="fillr"><div></div><div></div><div></div><div></div></div></div>' +
      '<table class="c grade"><colgroup><col style="width:12%">' + Array.from({ length: 9 }, () => '<col style="width:9.77%">').join('') + '</colgroup>' +
      '<tr><td></td>' + Array.from({ length: 9 }, (_, i) => '<td class="c">REV. ' + i + '</td>').join('') + '</tr>' +
      grade.map((g, gi) => '<tr><td>' + g + '</td>' + Array.from({ length: 9 }, (_, i) => '<td class="c">' + (i === colRev ? E(gv[gi]) : '') + '</td>').join('') + '</tr>').join('') +
      '<tr><td colspan="10" class="aviso">AS INFORMAÇÕES DESTE DOCUMENTO SÃO PROPRIEDADE DE ELETROBRAS, SENDO PROIBIDA A UTILIZAÇÃO FORA DA SUA FINALIDADE.<br>PARA DIVULGAÇÃO E USO EXTERNO, ELETROBRAS DEVERÁ SER CONSULTADA.</td></tr></table></section>';

    const cab = '<table class="c hd"><colgroup><col style="width:13%"><col style="width:46%"><col style="width:12%"><col style="width:7%"><col style="width:4%"><col style="width:8%"><col style="width:10%"></colgroup>' +
      '<tr><td colspan="2" rowspan="2" class="mc">MEMÓRIA DE CÁLCULO</td><td class="lb">Nº PROJETO:</td><td colspan="3" class="v b">' + E(numDoc) + '</td><td class="v"><span class="lb2">rev:</span> ' + E(rev) + '</td></tr>' +
      '<tr><td class="lb">FOLHA:</td><td class="v c"><span class="pg"></span></td><td class="v c">de</td><td colspan="2" class="v c"><span class="tot"></span></td></tr>' +
      '<tr><td class="lb">TÍTULO:</td><td colspan="6" class="v b">' + E(titulo) + '</td></tr>' +
      '<tr><td class="lb">SUBTÍTULO:</td><td colspan="6" class="v b">' + E(subtitulo) + ' – MEMÓRIA DE CÁLCULO</td></tr></table>';

    const css = '@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0}body{background:#7b8085;font-family:Arial,Helvetica,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '#pages{display:flex;flex-direction:column;align-items:center;gap:8mm;padding:8mm 0}' +
      '.page{width:210mm;height:297mm;background:#fff;padding:10mm 10mm 15mm 12.5mm;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.35)}' +
      '.corpo{flex:1;overflow:hidden;padding:6mm 2mm 0 2mm;min-height:0}' +
      'table.c{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Verdana,sans-serif}table.c td{border:1px solid #000;padding:1.2mm 1.6mm;font-size:8pt;vertical-align:middle}' +
      '.mc{font-weight:700;font-size:13pt!important;padding-left:3mm!important}.lb{font-weight:700;font-size:6pt!important;text-transform:uppercase}.lb2{font-weight:700;font-size:6pt;text-transform:uppercase}.v{font-size:9pt!important}.b{font-weight:700}.c{text-align:center}' +
      '.logo{text-align:center}.logo img{width:24mm}.logo2{text-align:center}.logo2 img{display:block;margin:1.5mm auto;max-width:24mm;max-height:13mm}' +
      '.capa{padding-right:5mm}.revbox{flex:1;display:flex;flex-direction:column;min-height:0}.revbox table{border-top:0}.nb{border-bottom:0!important}.fillr{flex:1;display:grid;grid-template-columns:13% 52% 5% 30%;border:1px solid #000;border-top:0}.fillr div{border-right:1px solid #000}.fillr div:last-child{border-right:0}.fillr div:nth-child(3),.fillr div:nth-child(4){border-top:1px solid #000}.rev .th{text-align:center;font-size:9pt!important}.rev tr.st td{height:5.5mm;font-size:6.5pt}.rev td.x{text-align:center;font-weight:700;font-size:8pt}.rev .sl{font-size:6.5pt!important}.rev td.t{vertical-align:top;font-size:8pt}' +
      '.grade td{font-size:6.5pt!important;height:5.5mm;border-top:0}.aviso{text-align:center;font-size:6.5pt!important;line-height:1.6}' +
      '.hd{margin-bottom:0}' +
      'h1{font-family:Tahoma,Verdana,sans-serif;font-size:12pt;font-weight:700;margin:6mm 0 3mm}h2{font-family:Tahoma,Verdana,sans-serif;font-size:11pt;font-weight:700;margin:5mm 0 2.5mm}h3{font-family:Tahoma,Verdana,sans-serif;font-size:11pt;font-weight:400;margin:4mm 0 2mm}.corpo>h1:first-child,.corpo>h2:first-child{margin-top:0}' +
      '.tab{display:inline-block;width:10mm}' +
      'p{font-size:11pt;line-height:1.45;text-align:justify;margin:0 0 3mm}p.ref{text-align:left;padding-left:10mm;text-indent:-10mm;margin-bottom:1.5mm;font-size:11pt}' +
      '.eq{font-family:"Cambria Math","Times New Roman",serif;font-style:italic;font-size:12pt;text-align:center;margin:2mm 0 3.5mm}.eq sub,.eq sup{font-size:.7em}' +
      'p.leg{font-family:Tahoma,Verdana,sans-serif;font-weight:700;font-size:10pt;text-align:center;margin:4mm 0 2mm}' +
      'table.g{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Tahoma,Verdana,sans-serif;margin-bottom:4mm}table.g th,table.g td{border:1px solid #000;padding:1mm 1.5mm;font-size:9.5pt;text-align:center;vertical-align:middle}table.g th{font-weight:700}table.g td.l{text-align:left}' +
      'table.q th,table.q td{font-size:7pt;padding:.8mm .8mm}table.q thead tr:first-child th{font-size:6.5pt}' +
      'table.simb{border-collapse:collapse;font-size:11pt;margin:0 0 3mm 4mm}table.simb td{padding:.6mm 1.5mm;vertical-align:top}table.simb td.s{white-space:nowrap;font-style:italic;font-family:"Times New Roman",serif;font-size:12pt}table.simb td.e{width:6mm;text-align:center}' +
      '.fig{margin:2mm 0 3mm}.fig p.leg{margin-top:2mm}.figgrid{display:flex;gap:4mm;justify-content:center;align-items:flex-start}.figcel{flex:1 1 0;max-width:92mm}.figcel svg{max-height:95mm}p.nota{font-size:8.5pt;line-height:1.35;margin:0 0 3mm}' +
      '.sumtit{font-family:Tahoma,Verdana,sans-serif;font-weight:700;font-size:12pt;text-align:center;margin:0 0 5mm}.toc{display:flex;align-items:baseline;font-family:Tahoma,Verdana,sans-serif;font-size:10pt;margin:0 0 1.6mm}.toc.l1{font-weight:700;margin-top:2.5mm;text-transform:uppercase}.toc.l2{padding-left:5mm}.toc.l3{padding-left:10mm}.toc .tn{width:13mm;flex:none}.toc .dots{flex:1;border-bottom:1px dotted #000;margin:0 1.5mm;transform:translateY(-1mm)}.toc .tp{width:7mm;text-align:right}' +
      '#fonte{position:absolute;left:-9999px;top:0;width:190mm}' +
      '@media print{body{background:#fff}#pages{display:block;padding:0}.page{box-shadow:none;break-after:page;page-break-after:always}.page:last-child{break-after:auto}}';

    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + E((numDoc ? numDoc + ' – ' : '') + subtitulo + ' – Memória de Cálculo') + '</title><style>' + css + '</style></head><body>' +
      '<div id="pages">' + (INCLUIR_CAPA ? capa : '') + '</div>' +
      '<template id="tplPage"><section class="page">' + cab + '<div class="corpo"></div></section></template>' +
      '<div id="fonte">' + corpo + '</div>' +
      '<script>(' + paginar.toString() + ')();<\/script></body></html>';
  };
})();
