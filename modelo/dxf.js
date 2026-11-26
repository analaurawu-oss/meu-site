// Desenhos de fundação em DXF — tubulão sem base, tubulão com base e sapata; uma prancha A1 (841 × 594 mm) por solo.
// window.DxfFundacao(run, doc, geom) -> texto DXF (AutoCAD 2007, UTF-8). Requer modelo/dxf-writer.js.
// Arranjo, carimbo, símbolos, layers, cores e fontes copiados do modelo Autoportante_T / Autoportante_TB;
// ao contrário do modelo (sem escala), cada vista é desenhada em escala real (1:n escolhida para caber na prancha)
// e as cotas mostram o valor real, em centímetros.
(function () {
  const A1 = { w: 841, h: 594 };
  const GAP = 80;                     // distância entre pranchas no modelo
  const ESCALAS = [2, 5, 10, 20, 25, 40, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500];
  const GEOM_PADRAO = { largura_aba_mm: 150, base_transversal_m: 6, base_longitudinal_m: 6, deflexao_graus: 0 };

  const LAYERS = [
    ['ARX-CV-Contorno', 1, 'CONTINUOUS'], ['ARX-CV-Armadura', 3, 'CONTINUOUS'], ['STUB', 1, 'CONTINUOUS'],
    ['ARX-GR-Cota', 12, 'CONTINUOUS'], ['ARX-GR-Texto', 7, 'CONTINUOUS'], ['ARX-GR-Solo', 4, 'CONTINUOUS'],
    ['ARX-GR-Hachuras', 7, 'CONTINUOUS'], ['ARX-GR-LCentro', 7, 'ACAD_ISO04W100'], ['ARX-GR-LTracejada', 7, 'ACAD_ISO02W100'],
    ['ARX-GR-LContínua', 2, 'CONTINUOUS'], ['ARX-GR-LAuxiliar', 7, 'CONTINUOUS'], ['ARX-GR-Simbolo', 7, 'CONTINUOUS'],
    ['ARX-GR-Detalhe', 7, 'CONTINUOUS'], ['FORMATO', 7, 'CONTINUOUS'],
  ];
  const ESTILOS = [['Arial', 'arial.ttf'], ['ROMANS', 'romans.shx'], ['style2', 'tahoma.ttf']];   // estilos de texto do modelo

  const num = (v, d) => (v === null || v === undefined || v === '' || isNaN(v)) ? (d === undefined ? 0 : d) : Number(v);
  const fmt = (v, d) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const cm = v => { const x = Math.round(v * 10) / 10; return fmt(x, Number.isInteger(x) ? 0 : 1); };   // valor em cm, sem zeros à toa
  const rad = g => g * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;

  function menorEscala(larg, alt, maxW, maxH) {      // larg/alt em mm reais; devolve n de 1:n
    for (const n of ESCALAS) if (larg / n <= maxW && alt / n <= maxH) return n;
    return ESCALAS[ESCALAS.length - 1];
  }

  // ---------- caneta com deslocamento (cada prancha tem a sua origem), cor explícita e estilo de texto ----------
  function caneta(d, ox, oy) {
    const H = ['left', 'center', 'right'], V = ['baseline', 'bottom', 'middle', 'top'];
    const fim = () => {                                       // aplica cor explícita (grupo 62) à última forma
      const sh = d.activeLayer.shapes[d.activeLayer.shapes.length - 1], pr = Object.getPrototypeOf(sh);
      sh.aci = P.aci; sh.sty = P.sty;
      if ('hAlign' in sh) {                                   // TEXT: estilo (grupo 7) na posição certa, antes dos grupos de alinhamento
        if (!pr.__txt) {
          const base = Object.getPrototypeOf(pr);
          pr.tags = function (m) {
            m.push(0, 'TEXT'); base.tags.call(this, m);
            m.push(8, this.layer.name); if (this.aci != null) m.push(62, this.aci);
            m.point(this.x, this.y); m.push(40, this.height); m.push(1, this.value); m.push(50, this.rotation);
            m.push(7, this.sty || 'Arial');
            if (H.includes(this.hAlign, 1) || V.includes(this.vAlign, 1)) {
              m.push(72, Math.max(H.indexOf(this.hAlign), 0)); m.push(11, this.x); m.push(21, this.y); m.push(31, 0);
              m.push(100, 'AcDbText'); m.push(73, Math.max(V.indexOf(this.vAlign), 0));
            } else m.push(100, 'AcDbText');
          };
          pr.__txt = true;
        }
      } else if (!pr.__cor) {
        const orig = pr.tags;
        pr.tags = function (m) {
          const self = this, mp = Object.create(m);
          mp.push = function (c, v) { m.push(c, v); if (c === 8 && self.aci != null) m.push(62, self.aci); };
          return orig.call(this, mp);
        };
        pr.__cor = true;
      }
      return P;
    };
    const P = {
      cur: '0', aci: null, sty: 'Arial',
      L(nome) { d.setActiveLayer(nome); P.cur = nome; return P; },
      C(a) { P.aci = a == null ? null : a; return P; },      // cor explícita (ACI); null = por layer
      S(n) { P.sty = n || 'Arial'; return P; },
      ln(x1, y1, x2, y2) { d.drawLine(ox + x1, oy + y1, ox + x2, oy + y2); return fim(); },
      pl(pts, fechada, w0, w1) { d.drawPolyline(pts.map(p => [ox + p[0], oy + p[1]]), !!fechada, w0 || 0, w1 === undefined ? (w0 || 0) : w1); return fim(); },
      ci(x, y, r) { d.drawCircle(ox + x, oy + y, r); return fim(); },
      tx(x, y, h, s, al, v, rot) { d.drawText(ox + x, oy + y, h, rot || 0, String(s), al || 'left', v || 'baseline'); return fim(); },
      rect(x1, y1, x2, y2) { return P.pl([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], true); },
      arco(cx, cy, r, a0, a1, n) { const p = []; n = n || 24; for (let i = 0; i <= n; i++) { const a = rad(a0 + (a1 - a0) * i / n); p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return P.pl(p, false); },
    };
    return P;
  }

  // ---------- cotas: linhas e setas vermelhas (ARX-GR-Cota), texto branco (ARX-GR-Texto), como o estilo "Cota 80" ----------
  function seta(P, x, y, dx, dy) {                            // seta cheia de 2,2 mm; (dx,dy) aponta para dentro da cota
    P.pl([[x + dx * 2.2, y + dy * 2.2], [x, y]], false, 0.9, 0);
  }
  function cotaH(P, x1, x2, y, ye, txt, h) {                  // cota horizontal em y; extensões vão até ye
    h = h || 2.0; const s = Math.sign(y - ye) || 1, prev = P.cur, sg = Math.sign(x2 - x1) || 1;
    P.L('ARX-GR-Cota').ln(x1, ye, x1, y + s * 1.2).ln(x2, ye, x2, y + s * 1.2).ln(x1, y, x2, y);
    seta(P, x1, y, sg, 0); seta(P, x2, y, -sg, 0);
    if (txt !== '') P.L('ARX-GR-Texto').tx((x1 + x2) / 2, y + 0.9, h, txt, 'center', 'baseline');
    P.L(prev);
  }
  function cotaV(P, x, y1, y2, xe, txt, h) {                  // cota vertical em x; extensões vão até xe
    h = h || 2.0; const s = Math.sign(x - xe) || 1, prev = P.cur, sg = Math.sign(y2 - y1) || 1;
    P.L('ARX-GR-Cota').ln(xe, y1, x + s * 1.2, y1).ln(xe, y2, x + s * 1.2, y2).ln(x, y1, x, y2);
    seta(P, x, y1, 0, sg); seta(P, x, y2, 0, -sg);
    if (txt !== '') P.L('ARX-GR-Texto').tx(x - 0.9, (y1 + y2) / 2, h, txt, 'center', 'baseline', 90);
    P.L(prev);
  }
  function cotaDiag(P, x1, y1, x2, y2, off, txt, h) {         // cota paralela à reta (x1,y1)-(x2,y2), deslocada de off (lado esquerdo se > 0)
    h = h || 2.0; const prev = P.cur, L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off], e = Math.sign(off) * 1.2;
    P.L('ARX-GR-Cota').ln(x1, y1, a[0] + nx * e, a[1] + ny * e).ln(x2, y2, b[0] + nx * e, b[1] + ny * e).ln(a[0], a[1], b[0], b[1]);
    seta(P, a[0], a[1], ux, uy); seta(P, b[0], b[1], -ux, -uy);
    let ang = deg(Math.atan2(uy, ux)); if (ang > 90 || ang < -90) ang += 180;
    P.L('ARX-GR-Texto').tx((a[0] + b[0]) / 2 + nx * 0.9 * Math.sign(off), (a[1] + b[1]) / 2 + ny * 0.9 * Math.sign(off), h, txt, 'center', 'baseline', ang);
    P.L(prev);
  }
  // chamada: linha vermelha até um traço horizontal sob o texto (como as multilinhas do modelo); linhas extras vão abaixo do traço
  function chamada(P, x1, y1, x2, y2, txt, h) {
    h = h || 2.0; const prev = P.cur, ls = Array.isArray(txt) ? txt : [txt], dir = x2 >= x1 ? 1 : -1;
    const larg = Math.max(...ls.map(t => String(t).length)) * h * 0.56 + 1.5;
    P.L('ARX-GR-Cota').ln(x1, y1, x2, y2).ln(x2, y2, x2 + dir * larg, y2);
    P.L('ARX-GR-Texto');
    ls.forEach((t, k) => P.tx(x2 + dir * 0.8, k === 0 ? y2 + 0.9 : y2 - 0.9 - (k - 1) * (h + 0.8), h, t, dir > 0 ? 'left' : 'right', k === 0 ? 'baseline' : 'top'));
    P.L(prev);
  }
  // símbolo de título de vista (bloco "Subtítulo" do modelo): círculo azul, traços, sublinhado azul e textos
  function tituloVista(P, x, y, l1, l2, l3, esc) {
    const prev = P.cur; esc = esc || 1;
    P.L('ARX-GR-Simbolo').C(5).ci(x, y, 4.5 * esc).ln(x + 4.5 * esc, y, x + 50.78 * esc, y).ln(x, y - 4.5 * esc, x, y - 6.5 * esc).ln(x, y + 6.5 * esc, x, y + 4.5 * esc).ln(x - 4.5 * esc, y, x - 6.5 * esc, y).C(null);
    P.L('ARX-GR-Simbolo').tx(x + 6.05 * esc, y + 1.47 * esc, 4.5 * esc, l1, 'left', 'baseline');
    if (l3 === undefined) { if (l2) P.tx(x + 6.26 * esc, y - 3.81 * esc, 2.5 * esc, l2, 'left', 'baseline'); }
    else { P.tx(x + 6.05 * esc, y - 4.33 * esc, 3.0 * esc, l2, 'left', 'baseline'); P.tx(x + 6.05 * esc, y - 8.79 * esc, 2.3 * esc, l3, 'left', 'baseline'); }
    P.L(prev);
  }
  // marca de corte (triângulo azul com a letra), apontando para (dx,dy)
  function marcaCorte(P, x, y, letra, dx, dy) {
    const prev = P.cur, nx = -dy, ny = dx, a = 7, b = 5;
    P.L('ARX-GR-Simbolo').C(5).pl([[x, y], [x - dx * a + nx * b, y - dy * a + ny * b], [x - dx * a - nx * b, y - dy * a - ny * b]], true, 0.6, 0.6).C(null);
    P.tx(x - dx * 4.2, y - dy * 4.2 - 1.2, 2.6, letra, 'center', 'baseline');
    P.L(prev);
  }

  // ---------- faixa de solo hachurada ----------
  function hachuraSolo(P, xa, xb, yb, yt, passo, dentro) {   // dentro(x,y) => true se estiver no concreto
    P.L('ARX-GR-Hachuras');
    const step = 0.5;
    for (let c = yb - xb; c <= yt - xa; c += passo * Math.SQRT2) {
      const x0 = Math.max(xa, yb - c), x1 = Math.min(xb, yt - c);
      if (x1 - x0 < 0.3) continue;
      let ini = null;
      for (let x = x0; x <= x1 + 1e-6; x += step) {
        const fora = !dentro(x, x + c);
        if (fora && ini === null) ini = x;
        if ((!fora || x + step > x1) && ini !== null) {
          const fim = fora ? x1 : x - step;
          if (fim - ini > 0.4) P.ln(ini, ini + c, fim, fim + c);
          ini = null;
        }
      }
    }
  }

  // ---------- seção em L do stub (cantoneira) ----------
  function cantoneira(P, cx, cy, aba, esp, giro) {
    const a = aba, t = esp, pts = [[0, 0], [a, 0], [a, t], [t, t], [t, a], [0, a]].map(p => [p[0] - a / 2, p[1] - a / 2]);
    const c = Math.cos(rad(giro)), s = Math.sin(rad(giro));
    P.L('ARX-GR-LContínua').pl(pts.map(p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]), true);
  }

  // ---------- carimbo, quadro de revisões e títulos (bloco "A1 ELETROBRAS" do modelo, escala 0,2, origem em x = 841) ----------
  const CARIMBO = {"l":[[655.0,0.0,655.0,10.0,7],[470.0,10.0,470.0,0.0,7],[210.0,0.0,210.0,10.0,7],[-0.0,297.0,25.0,297.0,7],[210.0,594.0,210.0,584.0,7],[470.0,594.0,470.0,584.0,7],[656.0,538.8,831.0,538.8,7],[656.0,570.69,831.0,570.69,7],[656.0,565.37,831.0,565.37,7],[656.0,560.06,831.0,560.06,7],[656.0,554.74,831.0,554.74,7],[656.0,549.43,831.0,549.43,7],[656.0,544.11,831.0,544.11,7],[656.0,576.0,831.0,576.0,7],[761.99,584.0,761.99,520.97,4],[799.11,584.0,799.11,520.97,4],[781.58,584.0,781.58,520.97,4],[815.06,584.0,815.06,520.97,4],[666.63,584.0,666.63,520.97,4],[695.25,10.0,695.25,17.5,7],[695.25,31.25,695.25,65.03,7],[656.0,65.03,831.0,65.03,7],[831.0,31.25,656.0,31.25,7],[743.5,73.03,743.5,65.03,7],[695.25,17.5,831.0,17.5,7],[695.25,17.5,695.25,31.25,7],[656.0,533.49,831.0,533.49,7],[656.0,528.17,831.0,528.17,7],[655.0,594.0,655.0,584.0,7],[659.17,506.04,685.26,506.04,5],[659.17,457.42,672.64,457.42,5]],"p":[[[[0.0,594.0],[841.0,594.0],[841.0,0.0],[0.0,0.0]],7],[[[25.0,584.0],[831.0,584.0],[831.0,10.0],[25.0,10.0]],5],[[[831.0,584.0],[831.0,520.97],[656.0,520.97],[656.0,584.0]],160],[[[656.0,73.03],[831.0,73.03],[831.0,10.0],[656.0,10.0]],160],[[[724.51,85.12],[831.0,85.12],[831.0,73.03],[724.51,73.03]],7]],"t":[[771.35,579.56,2.66,"DATA","cm",4,"ROMANS",null],[791.14,579.56,2.66,"DES.","cm",4,"ROMANS",null],[823.03,579.56,2.66,"APROV.","cm",4,"ROMANS",null],[807.09,579.56,2.66,"VERIF.","cm",4,"ROMANS",null],[708.77,579.56,2.66,"ALTERAÇÃO","cm",4,"ROMANS",null],[661.31,579.56,2.66,"REV.","cm",4,"ROMANS",null],[710.89,61.78,2.0,"Nº EMPREENDIMENTO:","cm",156,"style2",null],[704.94,40.13,2.0,"INSTALAÇÃO:","cm",156,"style2",null],[699.53,34.13,2.0,"TAG:","cm",156,"style2",null],[788.38,61.78,2.0,"REVISÃO:","cm",156,"style2",null],[696.5,26.7,2.0,"TÍTULO:","lb",156,"style2",null],[696.5,20.95,2.0,"SUBTÍTULO:","lb",156,"style2",null],[696.5,14.75,2.0,"N°","lb",156,"style2",null],[744.62,70.03,2.0,"N°","lb",156,"style2",null],[696.5,11.63,2.0,"FORNECEDOR:","lb",156,"style2",null],[744.62,66.53,2.0,"DOCUMENTO:","lb",156,"style2",null],[756.12,14.75,2.0,"ESCALA:","lb",156,"style2",null],[804.0,14.75,2.0,"REVISÃO:","lb",156,"style2",null],[702.78,55.78,2.0,"UNIDADE:","cm",156,"style2",null],[786.99,55.78,2.0,"FOLHA:","cm",156,"style2",null],[700.98,49.78,2.0,"LOCAL:","cm",156,"style2",null],[701.64,43.78,2.0,"CÓDIGO","cm",156,"style2",null],[726.01,84.6,2.0,"FINALIDADE","lb",156,"style2",null],[661.31,573.34,2.3,"00A","cm",4,"ROMANS","rev"],[714.31,573.34,2.3,"EMISSÃO INICIAL","cm",4,"ROMANS","revDesc"],[771.78,573.34,2.3,"15/09/25","cm",4,"ROMANS","data"],[790.35,573.34,2.3,"PJA","cm",4,"ROMANS","execucao"],[807.09,573.34,2.3,"RCA","cm",4,"ROMANS","verificacao"],[823.03,573.34,2.3,"MCC","cm",4,"ROMANS","aprovacao"],[672.23,508.4,2.5,"REFERÊNCIAS:","cm",4,"ROMANS",null],[665.54,459.79,2.5,"NOTAS:","cm",4,"ROMANS",null],[699.75,69.03,3.2,"DESENHO","cm",7,"style2","?"],[796.58,69.03,3.2,"LTELB.13-FND-PE-CV.DSN-0034","cm",7,"style2","numDoc"],[777.75,79.07,2.5,"PARA COMENTÁRIOS","cm",7,"style2","status"],[727.78,60.66,2.5,"SPE.24.01","lb",7,"style2","numEmp"],[727.78,54.65,2.5,"LT-GERAL ELETROBRAS","lb",7,"style2","unidade"],[727.78,48.65,2.5,"LOTE 3 - 01/24","lb",7,"style2","local"],[797.37,60.9,2.5,"00A","lb",7,"style2","rev"],[805.47,54.9,2.5,"05","lb",7,"style2","nFolhas"],[771.58,27.81,2.5,"LOTE 3 - 01/24","cm",7,"style2","titulo"],[771.58,22.55,2.5,"FUNDAÇÃO EM TUBULÃO - TORRE M2AM ","cm",7,"style2","subtitulo"],[716.03,12.28,2.5,"7097-LT-C0-DE-0034","lb",7,"style2","numForn"],[768.19,12.36,2.5,"INDICADA","lb",7,"style2","escala"],[817.39,12.36,2.5,"00A","lb",7,"style2","rev"],[800.12,54.9,2.5,"DE","lb",7,"style2",null],[795.24,54.9,2.5,"{folha}","l",7,"style2",null]]};

  // ---------- quadro de texto com quebra de linha ----------
  function quebrar(txt, max) {
    const out = [];
    String(txt).split('\n').forEach(par => {
      const ind = (par.match(/^\s*/) || [''])[0].length ? '     ' : '';
      let lin = '';
      par.trim().split(/\s+/).forEach(w => {
        if ((lin + ' ' + w).trim().length > max) { out.push((out.length && ind && lin ? ind : '') + lin); lin = w; } else lin = (lin + ' ' + w).trim();
      });
      out.push(lin);
    });
    return out;
  }

  // ---------- dados de cada tipo de fundação, num formato único ----------
  function dados(ctx, nome) {
    const { ent, res, S, TB } = ctx, R = res.resultados[nome], Q = res.quantitativos[nome], M = ent.materiais;
    const lin = Q.linhas, ult = lin[lin.length - 1] || {};
    if (S) {
      const so = ent.solos.find(x => x.nome === nome) || {};
      return {
        R, Q, M, so, redonda: false, comBase: true,
        D: so.a, Db: so.A, Lenc: R.L_m, La: R.La_m, Lb: R.Lb_m, Gmin: so.gmin, Gmax: so.gmax,
        phi1: R.N1_phi_mm, nBar: R.N1_n, esp1: R.N1_esp_cm, transp1: R.N1_transpasse_cm,
        phi2: R.N2_phi_mm, esp2: R.N2_esp_cm, comp2cm: R.N2_comp_m * 100,
        n1Unit: num(ult.N1_unit_m, R.L_m + so.gmax + 0.1),
        base: { phi: R.base_phi_mm, n: R.base_n, esp: R.base_esp_cm, t3: R.N3_transpasse_cm, t4: R.N4_transpasse_cm },
        linhas: lin,
      };
    }
    const g = ent.geometrias[nome], n2 = (/comp\.\s*([\d.,]+)\s*cm/i.exec(Q.n2 || '') || [])[1];
    const D = g.diametro_m;
    return {
      R, Q, M, so: ent.solos.find(x => x.nome === nome) || {}, redonda: true, comBase: TB,
      D, Db: TB ? g.diametro_base_m : D, Lenc: g.comprimento_enterrado_m, La: TB ? R.La_m : 0, Lb: TB ? R.Lb_m : 0,
      Gmin: g.afloramento_min_m, Gmax: g.afloramento_max_m,
      phi1: R.bitola_longitudinal_mm, nBar: R.quantidade_barras, esp1: R.espacamento_longitudinal_cm, transp1: R.transpasse_cm,
      phi2: R.bitola_estribo_adotada_mm, esp2: R.espacamento_estribo_adotado_cm,
      comp2cm: n2 ? Number(String(n2).replace(',', '.')) : (Math.PI * (D - 2 * M.cobrimento_cm / 100) * 100 + 40),
      n1Unit: num(ult.n1_comp_unit_m, g.comprimento_enterrado_m + g.afloramento_max_m - 2 * M.cobrimento_cm / 100),
      base: null, linhas: lin,
    };
  }


  function desenharCarimbo(P, papeis) {
    const prev = P.cur; P.L('FORMATO');
    CARIMBO.p.forEach(p => P.C(p[1] === 7 ? null : p[1]).pl(p[0], true));
    CARIMBO.l.forEach(l => P.C(l[4] === 7 ? null : l[4]).ln(l[0], l[1], l[2], l[3]));
    const H = { l: 'left', c: 'center', r: 'right' }, V = { b: 'baseline', m: 'middle', t: 'top' };
    CARIMBO.t.forEach(t => {
      let s = t[3]; if (t[7] && t[7] !== '?') s = papeis[t[7]] !== undefined ? papeis[t[7]] : ''; else if (s === '{folha}') s = papeis.folha;
      if (s === '') return;
      P.S(t[6]).C(t[5] === 7 ? null : t[5]).tx(t[0], t[1], t[2], s, H[t[4][0]], V[t[4][1]]);
    });
    P.C(null).S('Arial').L(prev);
  }
  // bloco de texto corrido (referências e notas), cor e estilo do modelo
  function blocoTexto(P, x, yTopo, h, linhas, passo, aci, estilo) {
    P.S(estilo).C(aci).L('FORMATO'); let y = yTopo - h;
    linhas.forEach(l => { if (l !== '') P.tx(x, y, h, l, 'left', 'baseline'); y -= passo; });
    P.C(null).S('Arial');
  }

  // ============================================================== prancha ==============================================================
  function prancha(d, i, ctx) {
    const { run, ent, res, doc, geom, S, TB, torre, tipo, nomeF } = ctx;
    const nome = res.solos.filter(n => res.resultados[n])[i];
    const X = dados(ctx, nome), R = X.R, M = X.M;
    const P = caneta(d, i * (A1.w + GAP), 0);

    // ---------------- dados da fundação ----------------
    const D = X.D, Db = X.Db, Lenc = X.Lenc, La = X.La, Lb = X.Lb, Gmin = X.Gmin, Gmax = X.Gmax, comBase = X.comBase;
    const cobCm = M.cobrimento_cm !== undefined ? M.cobrimento_cm : M.cob_cm, fykMpa = M.fyk_mpa !== undefined ? M.fyk_mpa : M.fyk_kgf_cm2 / 10;
    const cob = cobCm / 100, phi1 = X.phi1 / 1000, phi2 = X.phi2 / 1000;
    const nBar = X.nBar, esp2 = X.esp2 / 100, n1Unit = X.n1Unit, n2CompCm = X.comp2cm, base = X.base;
    const stub = ent.stub, aba = num(geom.largura_aba_mm) / 1000, espStub = num(stub.espessura_mm) / 1000;
    const hStub = num(stub.altura_real_mm) / 1000, enterStub = num(stub.altura_enterrada_mm) / 1000, vis = Math.max(0, hStub - enterStub);
    const ang = k => Math.acos(1 / Math.max(1, num(stub[k], 1)));
    const beta = ang('secante_beta_real'), aLong = ang('secante_alfa_longitudinal'), aTrans = ang('secante_alfa_transversal');
    const Dn = S ? 'a' : 'D', rN1 = D / 2 - cob - phi2 - phi1 / 2, rN2 = D / 2 - cob - phi2 / 2;
    const rotuloN1 = 'N1 - ' + nBar + ' Ø' + fmt(X.phi1, 1), rotuloN2 = 'N2 - Ø' + fmt(X.phi2, 1) + ' c/' + cm(esp2 * 100);
    const rotBase = base ? base.n + ' Ø' + fmt(base.phi, 1) + ' c/' + cm(base.esp) : '';
    const bt = num(geom.base_transversal_m, 6), bl = num(geom.base_longitudinal_m, 6), dl = num(geom.deflexao_graus, 0);
    const dxM = bt / 2, dyM = bl / 2, dD = Math.hypot(dxM, dyM);          // distâncias do eixo do pé ao marco central
    const fyk = fykMpa, aco = fyk === 500 ? 'CA-50' : fyk === 600 ? 'CA-60' : 'fyk = ' + fyk + ' MPa';
    const so = X.so, ult = X.linhas[X.linhas.length - 1] || {};
    const sub = s => String(s || '').replace(/\{torre\}/gi, torre).replace(/\{tipo\}/gi, tipo).replace(/\{fundacao\}/gi, nomeF.toUpperCase());
    const pad2 = n => (n < 10 ? '0' : '') + n;

    // ---------------- formato, carimbo e quadro de revisões (bloco do modelo) ----------------
    desenharCarimbo(P, {
      rev: doc.rev || '0', revDesc: String(doc.revDesc || '').toUpperCase(), data: doc.data || '', execucao: doc.execucao || '', verificacao: doc.verificacao || '', aprovacao: doc.aprovacao || '',
      numDoc: doc.numDoc || '', status: doc.status || '', numEmp: doc.numEmp || '', unidade: doc.unidade || '', local: doc.local || '', nFolhas: pad2(ctx.nSolos),
      titulo: sub(doc.titulo || 'FUNDAÇÕES DAS TORRES - TORRE {torre}'), subtitulo: sub(doc.subtitulo || '{fundacao} - {torre}-{tipo}') + ' - SOLO ' + nome,
      numForn: doc.numForn || '', escala: 'INDICADA', folha: String(i + 1),
    });
    P.L('ARX-GR-Texto').tx(A1.w / 2, -20, 8, 'SOLO ' + nome, 'center', 'baseline');

    // ---------------- referências e notas (cores e estilos do modelo) ----------------
    const refs = ['MEMÓRIA DE CÁLCULO - ' + nomeF.toUpperCase() + ' - TORRE ' + torre + (doc.numDoc ? ' (' + doc.numDoc + ')' : '') + '.',
      'CADERNO DE DESENHO - TORRE TIPO ' + torre + (stub.codigo ? ' (' + stub.codigo + ')' : '') + '.'];
    if (doc.ref11) refs.push(String(doc.ref11));
    const linhasRef = []; refs.forEach((r, k) => quebrar((k + 1) + '. ' + r, 100).forEach(l => linhasRef.push(l)));
    blocoTexto(P, 659.4, 502.0, 2.2, linhasRef, 4.3, 3, 'Arial');
    const gk = k => (so[k] !== undefined ? so[k] : undefined);
    const notas = [
      'DIMENSÕES EM CENTÍMETRO, BITOLAS EM MILÍMETROS, EXCETO ONDE INDICADO.',
      'AS FUNDAÇÕES DEVERÃO SER EXECUTADAS DE ACORDO COM A NBR-6118 E NBR-6122.',
      'CONCRETO ESTRUTURAL:\n   FCK ≥ ' + M.fck_mpa + ' MPa;\n   A/C ≤ 0,6, AÇO: ' + aco + ';\n   COBRIMENTO = ' + cobCm + ' cm;\n   CONSUMO MÍNIMO DE CIMENTO ≥ 280 kg/m³;',
      'AS CAVAS DEVERÃO SER ABERTAS COM PAREDES VERTICAIS UTILIZANDO ESCAVAÇÃO MECANIZADA, SEGUINDO AS ESPECIFICAÇÕES PRESENTES NO PROJETO. CASO HAJA RISCO DE DESMORONAMENTO DEVERÃO SER PROTEGIDAS. DEVERÃO SER RIGOROSAMENTE CUMPRIDOS TODOS OS PREDISPOSTOS DA NR-18, NR-15, NBR 6122/2019 E MTE 644/2013. NÃO SERÁ PERMITIDA A EXECUÇÃO DESTE TIPO DE FUNDAÇÃO SEM A SUPERVISÃO DO PROFISSIONAL LEGALMENTE HABILITADO.',
      'AS ARMADURAS DEVERÃO SER PREPARADAS E MONTADAS DE ACORDO COM ESTE DESENHO, SENDO PERMITIDO O USO DE EMENDAS DESDE QUE ESTEJAM DE ACORDO COM A NBR 6118.',
      'TODOS OS VOLUMES, COMPRIMENTOS E PESO DOS FERROS SÃO TEÓRICOS, NÃO HAVENDO NENHUM ACRÉSCIMO NOS MESMOS.',
      'O ACABAMENTO NO TOPO DA FUNDAÇÃO, DEVERÁ SER FEITO DE MODO A EVITAR O ACÚMULO DE ÁGUA AO REDOR DO STUB, ASSEGURANDO UMA BOA DRENAGEM.',
      'A FIM DE EVITAR O ALÍVIO DAS TENSÕES LATERAIS DO SOLO, A CONCRETAGEM DEVERÁ SER EXECUTADA NO PRAZO MÁXIMO DE 3 DIAS APÓS O TÉRMINO DA ESCAVAÇÃO.',
      'DEVERÁ SER FEITA A VERIFICAÇÃO EM CAMPO DE POSSÍVEIS CAMINHOS DE ESCOAMENTO DE ÁGUAS PLUVIAIS QUE POSSAM OCASIONAR EROSÃO DO SOLO DE FUNDAÇÃO OU ALAGAMENTO DO LOCAL. CASO TAL PROCESSO SEJA OBSERVADO DEVERÃO SER EXECUTADOS SISTEMAS DE DRENAGEM SUPERFICIAL PARA DESVIO E CORRETA DESTINAÇÃO DAS ÁGUAS.',
      'O CONCRETO DEVERÁ SER LANÇADO ATRAVÉS DE TROMBA (FUNIL) DE COMPRIMENTO ADEQUADO PARA EVITAR A SEGREGAÇÃO DOS MATERIAIS E MANTER A HOMOGENEIDADE DO CONCRETO. A ALTURA DE QUEDA LIVRE NÃO DEVE ULTRAPASSAR 2 m (ITEM 9.5 DA NBR-14931).',
      'O CONCRETO LANÇADO DEVERÁ SOFRER VIBRAÇÃO CUIDADOSA, COM PREENCHIMENTO TOTAL DA CAVA, COMO CONTROLE DE EXECUÇÃO, DEVE-SE COMPARAR O CONSUMO DE MATERIAL DURANTE A CONCRETAGEM COM OS VOLUMES PREVISTOS NESTE DESENHO.',
      'NA IMPOSSIBILIDADE DE EXECUÇÃO DESTA FUNDAÇÃO, DEVERÁ SER EMITIDO PELO CAMPO UM FORMULÁRIO DE ALTERAÇÃO PARA DEVIDA APROVAÇÃO DA PROJETISTA E ENGENHARIA CONTRATANTE. EM CASOS QUE A CAVA TENHA PRESENÇA DE ÁGUA OU ROCHA, A PROJETISTA TAMBÉM DEVERÁ SER CONTACTADA MEDIANTE UM FORMULÁRIO DE ALTERAÇÃO.',
      'UTILIZAR ADITIVO ANTISOL PARA O CONCRETO.',
      'ESTE PROJETO É APLICADO PARA A LINHA: ' + (run.linhaNome || ent.linha || '-') + '.',
      'PARÂMETROS GEOTÉCNICOS PARA SOLO:\n   - TIPO ' + nome + ': ÂNGULO DE ATRITO: ' + fmt(num(so.phi_graus !== undefined ? so.phi_graus : so.phi), 0) + 'º; COESÃO: ' + fmt(num(so.coesao_kgf_m2 !== undefined ? so.coesao_kgf_m2 : so.coesao), 0) + ' kgf/m²; PESO ESPECÍFICO: ' + fmt(num(so.gamma_kgf_m3 !== undefined ? so.gamma_kgf_m3 : so.gamma), 0) + ' kgf/m³.',
    ];
    const linhasNota = []; notas.forEach((n, k) => { quebrar((k + 1) + '. ' + n, 76).forEach(l => linhasNota.push(l)); });
    blocoTexto(P, 659.4, 451.4, 2.5, linhasNota, Math.min(4.9, 345 / linhasNota.length), 3, 'ROMANS');

    // ============ VISTAS EM CORTE (mesma escala): elevação, seção A (corte na diagonal) e armadura ============
    // trecho do meio do fuste omitido (tubulões), com as curvas de ruptura e o retorno ao fundo; z em metros a partir do fundo
    const H = Lenc + Gmax;
    let qb = null;
    if (!S) {
      const topVis = Gmax + 1.0, botVis = comBase ? Lb + La + 0.6 : 1.0, rem = H - topVis - botVis;
      if (rem >= 1.0) qb = { z1: botVis, z2: H - topVis, rem };
    }
    const yb = 383;                                                      // fundo do concreto (como no modelo)
    const n0 = menorEscala(Db * 1000, (H - (qb ? qb.rem : 0) + 0.35 + vis + 0.1) * 1000, 70, 160);
    const escCorte = Math.max(n0, menorEscala(dD * 1000, 1, 135, 1));    // a distância ao marco central também precisa caber
    const kc = 1000 / escCorte;                                          // mm de papel por metro real
    const sag = qb ? Math.min(0.3 * D * kc, 7) : 0;                      // flecha das curvas de ruptura
    const yLowTop = qb ? yb + qb.z1 * kc : 0, yUpBot = qb ? yLowTop + 6 + sag : 0;
    const Y = z => (!qb || z <= qb.z1) ? yb + z * kc : yUpBot + (z - qb.z2) * kc;
    const visZ = z => !qb || z <= qb.z1 || z >= qb.z2;
    const yt = Y(Lenc), ytop = Y(H), slope = Math.max(0.05 * kc, 1.6);
    const arcoSup = (xc, r, yc, s, de, ate) => { const p = [], n = 16; for (let k = 0; k <= n; k++) { const x = de + (ate - de) * k / n; p.push([xc + x, yc - s * (x / r) * (x / r)]); } return p; };
    const arcoInf = (xc, r, yc, s, de, ate) => { const p = [], n = 16; for (let k = 0; k <= n; k++) { const x = de + (ate - de) * k / n; p.push([xc + x, yc + s * (x / r) * (x / r)]); } return p; };
    const marcaQuebra = (x, y) => { const prev = P.cur; P.L('ARX-GR-Cota').ln(x - 2.2, y - 2.2, x + 0.4, y + 1.2).ln(x - 0.4, y - 1.2, x + 2.2, y + 2.2); P.L(prev); };
    const quebraDim = x => { if (qb) marcaQuebra(x, (yLowTop + yUpBot) / 2); };

    // contorno do concreto (com topo inclinado e, nos tubulões, o corte)
    const contorno = (xc, camada) => {
      const r = D * kc / 2, rb = Db * kc / 2, topo = [[xc + r, ytop - slope], [xc, ytop], [xc - r, ytop - slope]];
      P.L(camada);
      if (qb) {
        let baixo;
        if (comBase) baixo = [[xc - rb, yb], [xc + rb, yb], [xc + rb, yb + Lb * kc], [xc + r, yb + (Lb + La) * kc], [xc + r, yLowTop - sag]].concat(arcoSup(xc, r, yLowTop, sag, r, -r).slice(1)).concat([[xc - r, yb + (Lb + La) * kc], [xc - rb, yb + Lb * kc]]);
        else baixo = [[xc - r, yb], [xc + r, yb], [xc + r, yLowTop - sag]].concat(arcoSup(xc, r, yLowTop, sag, r, -r).slice(1));
        P.pl(baixo, true, 0.35);
        P.pl([[xc - r, ytop - slope]].concat(arcoInf(xc, r, yUpBot, sag, -r, r), topo.slice(0, 2)), true, 0.35);
      } else if (comBase) {
        P.pl([[xc - rb, yb], [xc + rb, yb], [xc + rb, yb + Lb * kc], [xc + r, yb + (Lb + La) * kc]].concat(topo, [[xc - r, yb + (Lb + La) * kc], [xc - rb, yb + Lb * kc]]), true, 0.35);
      } else P.pl([[xc - r, yb], [xc + r, yb]].concat(topo), true, 0.35);
    };
    // stub inclinado (para longe do marco central, que fica à direita), com furos de aterramento
    const desenhaStub = (xc, th) => {
      const u = [-Math.sin(th), Math.cos(th)], nn = [Math.cos(th), Math.sin(th)], aw = aba * kc;
      const pIn = [xc - u[0] * enterStub * kc, ytop - u[1] * enterStub * kc], pOut = [xc + u[0] * vis * kc, ytop + u[1] * vis * kc];
      const q = (p, s) => [p[0] + nn[0] * aw / 2 * s, p[1] + nn[1] * aw / 2 * s];
      P.L('ARX-GR-LContínua').pl([q(pIn, -1), q(pIn, 1), q(pOut, 1), q(pOut, -1)], true, 0.3);
      const rh = Math.max(0.35, aw * 0.1);
      for (let k = 0; k < 3; k++) { const t = vis * kc * (0.88 - 0.1 * k), s = (k % 2 ? 1 : -1) * aw * 0.18; P.ci(xc + u[0] * t + nn[0] * s, ytop + u[1] * t + nn[1] * s, rh); }
      P.L('ARX-GR-LCentro').ln(pIn[0] - u[0] * 4, pIn[1] - u[1] * 4, pOut[0] + u[0] * 6, pOut[1] + u[1] * 6);
      return { pIn, pOut, hole: [xc + u[0] * vis * kc * 0.88 - nn[0] * aw * 0.18, ytop + u[1] * vis * kc * 0.88 - nn[1] * aw * 0.18] };
    };
    // armadura do fuste (e malhas da base, na sapata) em corte, com eixo em xc
    const armaduraCorte = xc => {
      const x1 = rN1 * kc, x2 = rN2 * kc, r = D * kc / 2, zFundo = yb + cob * kc, zTopo = ytop - slope - cob * kc;
      P.L('ARX-CV-Armadura');
      const pe = S ? Math.max(0.2, n1Unit - (Lenc + Gmax - 2 * cob)) * kc : 0;
      const barra = xo => {
        const ex = Math.abs(xo) / r;
        if (qb) P.pl([[xc + xo, zFundo], [xc + xo, yLowTop - sag * ex * ex - 0.6]], false, 0.3).pl([[xc + xo, yUpBot + sag * ex * ex + 0.6], [xc + xo, zTopo]], false, 0.3);
        else if (pe) P.pl([[xc + xo + Math.sign(xo) * pe, zFundo], [xc + xo, zFundo], [xc + xo, zTopo]], false, 0.3);
        else P.pl([[xc + xo, zFundo], [xc + xo, zTopo]], false, 0.3);
      };
      barra(-x1); barra(x1);
      for (let z = H - cob; z >= (S ? Lb + La : cob) - 1e-6; z -= esp2) {
        const y = Y(z);
        if (!visZ(z)) continue;
        if (qb && ((z <= qb.z1 && y > yLowTop - sag - 0.6) || (z >= qb.z2 && y < yUpBot + sag + 0.6))) continue;
        if (y > ytop - slope - 0.5) continue;
        P.ln(xc - x2, y, xc + x2, y);
      }
      if (S) {
        const rb = (Db / 2 - cob) * kc, zN4 = yb + cob * kc + 0.2, zN3 = yb + (Lb - cob) * kc - 0.2, rr = Math.max(base.phi / 2000 * kc, 0.35);
        P.ln(xc - rb, zN4 + 0.6, xc + rb, zN4 + 0.6).ln(xc - rb, zN3, xc + rb, zN3);
        for (let j = 0; j < base.n; j++) { const px = xc - rb + j * (2 * rb / Math.max(1, base.n - 1)); P.ci(px, zN4 - 0.2, rr).ci(px, zN3 - 0.7, rr); }
      }
    };

    const corte = (xc, o) => {
      const r = D * kc / 2, rb = Db * kc / 2, xm = xc + o.dist * kc;
      // solo: faixas hachuradas junto ao fuste e no marco central
      const faixa = (xa, xb) => { P.L('ARX-GR-Solo').ln(xa, yt, xb, yt); hachuraSolo(P, Math.min(xa, xb), Math.max(xa, xb), yt - 3.5, yt, 1.3, () => false); };
      faixa(xc - r - 26, xc - r); faixa(xc + r, xc + r + 26); faixa(xm - 12, xm + 12);
      contorno(xc, 'ARX-GR-LContínua');
      const sb = desenhaStub(xc, o.th), xUp = sb.pOut[0], yRef = Math.max(ytop, sb.pOut[1]);
      const proj = Math.abs(xc - xUp) / kc * 100;
      if (o.tube) {                                                        // tubo plástico do fio contrapeso (Seção A)
        const yTub = Math.max(yt - 0.9 * kc, qb ? yUpBot + 8 : yb + 8), x0 = xc - r;
        const p0 = [xc + (sb.pOut[0] - xc) * 0.78 + 1.5, ytop + (sb.pOut[1] - ytop) * 0.78], bez = (a, b, c, e, t) => { const m = 1 - t; return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * e[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * e[1]]; };
        const pts = []; for (let k = 0; k <= 20; k++) pts.push(bez(p0, [p0[0] - 6, p0[1] + 16], [x0 - 10, ytop + 20], [x0 + 1.5, ytop - slope - 3], k / 20));
        for (let k = 1; k <= 12; k++) pts.push(bez([x0 + 1.5, ytop - slope - 3], [x0 - 4, ytop - slope - 12], [x0 + 3, yTub + 10], [x0, yTub + 1.5], k / 12));
        P.L('ARX-GR-LAuxiliar').pl(pts, false, 0.25).pl([[x0, yTub], [x0 - 24, yTub]], false, 0.8);
        cotaV(P, x0 - 30, yt, yTub, x0 - 24, '', 1.8);
        P.L('ARX-GR-Texto').tx(x0 - 32, (yt + yTub) / 2, 1.7, ['ATERRAMENTO'], 'center', 'baseline', 90).tx(x0 - 35, (yt + yTub) / 2, 1.7, '(VER REFERÊNCIA 3)', 'center', 'baseline', 90);
        chamada(P, x0 - 12, yTub - 1, x0 - 14, Math.max(yTub - 18, (qb ? yUpBot : yb) + 2), ['TUBO PLÁSTICO DE Ø3/4"', 'PARA FIO CONTRAPESO'], 1.9);
        chamada(P, xc + (sb.pOut[0] - xc) * 0.35 + 3, ytop + (sb.pOut[1] - ytop) * 0.35, xc + r + 24, ytop + (sb.pOut[1] - ytop) * 0.2 - 4, ['DETALHES DO STUB', '(VER REFERÊNCIA 2)'], 1.9);
      }
      // marco central: eixo, quadradinho no terreno e chamada
      P.L('ARX-GR-LCentro').ln(xm, yb - 6, xm, yRef + 22);
      P.L('ARX-GR-Texto').C(null); P.rect(xm - 1.6, yt, xm + 1.6, yt + 3.2);
      chamada(P, xm + 0.5, yt + 3, xm + 8, yt + 18, ['MARCO', 'CENTRAL'], 1.9);
      // distâncias ao marco central: A (ou D, na diagonal) e, somando a projeção do stub
      cotaH(P, xc, xm, yRef + 9, yRef + 3, o.rot + ' = ' + cm(o.dist * 100), 2.0);
      if (proj > 0.05) {
        cotaH(P, xUp, xm, yRef + 16, sb.pOut[1] + 1, o.rot + ' + ' + cm(proj) + ' = ' + cm(o.dist * 100 + proj), 2.0);
        cotaH(P, xUp, xc, yRef + 9, yRef + 3, cm(proj), 1.8);
      }
      if (!o.tube) {                                                       // Elevação: G, L (valor fixo) e H (variáveis, ver Tabela 2), níveis e chamadas
        const xe = xc - rb;
        cotaV(P, xc - r - 9, yt, ytop, xc - r, 'G = VAR.', 1.8);
        cotaV(P, xe - 9, yb, yt, xe, cm(Lenc * 100), 1.8); quebraDim(xe - 9);
        cotaV(P, xe - 20, yb, ytop, xe, 'H = VAR. (VER TABELA 2)', 1.8); quebraDim(xe - 20);
        cotaV(P, xc - r - 3.5, ytop - slope, ytop, xc - r, '', 1.6);
        chamada(P, xc - r, ytop - slope, xc - r - 24, ytop + 14, ['NÍVEL SUPERIOR DO', 'CONCRETO'], 1.9);
        P.L('ARX-GR-Texto').tx(xc - r - 5.5, ytop - slope / 2, 1.6, '5', 'right', 'middle');
        cotaH(P, xc - rb, xc + rb, yb - 7, yb, comBase ? 'Db = ' + cm(Db * 100) : cm(D * 100), 1.9);
        if (comBase) cotaH(P, xc - r, xc + r, yb + Lb * kc + (La * kc) + 5, yb + (Lb + La) * kc, 'D = ' + cm(D * 100), 1.7);
        chamada(P, sb.hole[0], sb.hole[1], xc + r + 14, yRef + 5, ['FUROS PARA', 'ATERRAMENTO'], 1.9);
        chamada(P, xc + r * 0.6, ytop - slope * 0.4, xc + r + 14, ytop - 4, ['ACABAMENTO INCLINADO', '(NOTA 7)'], 1.9);
        chamada(P, xc + r + 16, yt, xc + r + 24, yt - 14, 'NÍVEL DO TERRENO', 1.9);
      }
      tituloVista(P, o.tit[0], o.tit[1], o.nome, 'ESC. 1:' + escCorte);
      return { yRef, xUp };
    };
    const cA = corte(116, { dist: dxM, th: aTrans, rot: 'A', nome: 'ELEVAÇÃO', tit: [92.5, 344.1], tube: false });
    const cB = corte(381, { dist: dD, th: beta, rot: 'D', nome: 'SEÇÃO A', tit: [364.5, 356.4], tube: true });

    // triângulo com a angulação do stub (inclinação real)
    {
      const tb = Math.tan(beta), Ht = 34, bx = 285, by = 505, Wt = Math.max(Ht * tb, 0.4);
      P.L('ARX-GR-LContínua').C(7).pl([[bx, by], [bx + Wt, by], [bx, by - Ht]], true); P.C(null);
      P.L('ARX-GR-Texto').tx(bx - 3, by - Ht / 2, 1.8, '100', 'center', 'baseline', 90).tx(bx + Wt / 2, by + 1.5, 1.8, fmt(100 * tb, 3), 'center', 'baseline');
      chamada(P, bx + Wt * 0.7, by - Ht * 0.15, bx + 16, by - 8, 'Tan(θ) = ' + fmt(tb, 3), 1.9);
      chamada(P, bx + Wt * 0.3, by - Ht * 0.7, bx + 16, by - Ht * 0.7 - 6, ['INCLINAÇÃO', 'REAL DO STUB'], 1.9);
      P.L('ARX-GR-Texto').tx(bx + 2, by - Ht - 5, 1.7, 'θ = ' + fmt(deg(beta), 2) + '°  (β REAL)', 'left', 'baseline');
    }

    // ---------------- ARMADURA: contorno vermelho, gaiola verde e stub ----------------
    {
      const xc = 557, r = D * kc / 2;
      contorno(xc, 'ARX-CV-Contorno'); armaduraCorte(xc);
      const sb = desenhaStub(xc, aTrans);
      P.L('ARX-GR-LCentro').ln(xc, yb - 6, xc, Math.max(ytop, sb.pOut[1]) + 6);
      const zE1 = ytop - slope - cob * kc, zE2 = zE1 - esp2 * kc;
      cotaV(P, xc - r - 14, zE2, zE1, xc - r, 'N2 c/' + cm(esp2 * 100), 1.7);
      cotaV(P, xc - r - 24, yb + cob * kc, ytop - slope - cob * kc, xc - r, 'C = ' + cm(n1Unit * 100) + ' (VAR.)', 1.8); quebraDim(xc - r - 24);
      P.L('ARX-CV-Armadura').ln(xc + r + 14, yb + cob * kc, xc + r + 14, ytop - slope - cob * kc);
      P.L('ARX-GR-Texto').tx(xc + r + 12, (yb + ytop) / 2 + 10, 1.9, 'N1 - ' + nBar + ' - Ø' + fmt(X.phi1, 1), 'center', 'baseline', 90).tx(xc + r + 18.5, (yb + ytop) / 2 + 10, 1.9, 'VAR.', 'center', 'baseline', 90);
      chamada(P, xc - r * 0.3, ytop - 9 * kc / 25, xc - r - 22, ytop + 16, ['FIO 12 BWG, DE AÇO GALVANIZADO', '(NÃO DEVERÁ ESTAR ESTICADO, A FIM DE', 'FACILITAR A CONCRETAGEM)'], 1.6);
      chamada(P, xc + r * 0.8, ytop - 12 * kc / 25, xc + r + 6, ytop + 8, ['FIXAÇÃO COM ARAME', 'DE FERRO RECOZIDO'], 1.6);
      if (S) {
        chamada(P, xc + (Db / 2 - cob) * kc * 0.6, yb + cob * kc, xc + Db * kc / 2 + 10, yb + 9, 'N4 - ' + rotBase, 1.7);
        chamada(P, xc + (Db / 2 - cob) * kc * 0.75, yb + (Lb - cob) * kc, xc + Db * kc / 2 + 10, Math.max(yb + Lb * kc + 8, yb + 17), 'N3 - ' + rotBase, 1.7);
      }
      const yB = Y(qb ? qb.z1 * 0.45 : Lenc * 0.3);
      marcaCorte(P, xc - Math.max(r, Db * kc / 2) - 14, yB, 'B', 1, 0); marcaCorte(P, xc + Math.max(r, Db * kc / 2) + 14, yB, 'B', -1, 0);
      P.L('ARX-GR-Cota').C(5).ln(xc - Math.max(r, Db * kc / 2) - 14, yB, xc + Math.max(r, Db * kc / 2) + 14, yB).C(null);
      tituloVista(P, 536.7, 375.1, 'ARMADURA', 'ESC. 1:' + escCorte);
    }

    // ---------------- SEÇÃO B (corte com a armadura transversal) e anel do N2 ----------------
    {
      const esc = menorEscala(D * 1000, D * 1000, 56, 56), k = 1000 / esc, cx = 540, cy = 292, hD = D * k / 2;
      const rotB1 = nBar + ' N1 Ø' + fmt(X.phi1, 1) + ' c/' + cm(X.esp1);
      if (S) {
        P.L('ARX-GR-LContínua').rect(cx - hD, cy - hD, cx + hD, cy + hD);
        const h2 = rN2 * k; P.L('ARX-CV-Armadura').rect(cx - h2, cy - h2, cx + h2, cy + h2);
        const h1 = rN1 * k, pas = 8 * h1 / nBar;
        for (let n = 0; n < nBar; n++) {
          const t = n * pas; let px, py;
          if (t < 2 * h1) { px = -h1 + t; py = -h1; } else if (t < 4 * h1) { px = h1; py = -h1 + (t - 2 * h1); } else if (t < 6 * h1) { px = h1 - (t - 4 * h1); py = h1; } else { px = -h1; py = h1 - (t - 6 * h1); }
          P.ci(cx + px, cy + py, Math.max(phi1 * k / 2, 0.45));
        }
        cotaH(P, cx - h1, cx - h1 + pas, cy + hD + 9, cy + h1, cm(X.esp1), 1.6);
      } else {
        P.L('ARX-CV-Contorno').ci(cx, cy, hD);
        P.L('ARX-CV-Armadura').ci(cx, cy, rN2 * k);
        for (let b = 0; b < nBar; b++) { const a = 2 * Math.PI * b / nBar; P.ci(cx + rN1 * k * Math.cos(a), cy + rN1 * k * Math.sin(a), Math.max(phi1 * k / 2, 0.45)); }
        const a1 = rad(62), a2 = a1 + 2 * Math.PI / nBar, am = (a1 + a2) / 2, Ra = hD + 7, arc = [];
        P.L('ARX-GR-Cota').ln(cx + rN1 * k * Math.cos(a1), cy + rN1 * k * Math.sin(a1), cx + (Ra + 2) * Math.cos(a1), cy + (Ra + 2) * Math.sin(a1)).ln(cx + rN1 * k * Math.cos(a2), cy + rN1 * k * Math.sin(a2), cx + (Ra + 2) * Math.cos(a2), cy + (Ra + 2) * Math.sin(a2));
        for (let q = 0; q <= 10; q++) { const a = a1 + (a2 - a1) * q / 10; arc.push([cx + Ra * Math.cos(a), cy + Ra * Math.sin(a)]); }
        P.pl(arc, false);
        P.L('ARX-GR-Texto').tx(cx + (Ra + 3.5) * Math.cos(am), cy + (Ra + 3.5) * Math.sin(am), 1.8, fmt(360 / nBar, 1) + '°', 'left', 'baseline');
      }
      cantoneira(P, cx, cy, aba * k, espStub * k, 180);
      P.L('ARX-GR-LCentro').ln(cx - hD - 8, cy, cx + hD + 8, cy).ln(cx, cy - hD - 8, cx, cy + hD + 8);
      cotaH(P, cx - hD, cx + hD, cy - hD - 9, cy - hD - 2, cm(D * 100), 1.9);
      chamada(P, cx + rN1 * k * Math.cos(rad(150)), cy + rN1 * k * Math.sin(rad(150)), cx - hD - 6, cy + hD + 4, rotB1, 1.9);
      chamada(P, cx + rN2 * k * Math.cos(rad(-30)), cy + rN2 * k * Math.sin(rad(-30)), cx + hD + 5, cy - hD * 0.25, 'N2', 1.9);
      tituloVista(P, 478.9, 241.1, 'SEÇÃO B', 'ESC. 1:' + esc);
      // anel do estribo N2, com o transpasse indicado
      const dN2 = D - 2 * cob - phi2, escN = menorEscala(dN2 * 1000, dN2 * 1000, 50, 50), kN = 1000 / escN, cx2 = 440, cy2 = 290, r2 = dN2 * kN / 2;
      P.L('ARX-CV-Armadura');
      let perim;
      if (S) { P.rect(cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2); perim = 4 * dN2 * 100; }
      else {
        const ov = Math.max(0, n2CompCm - Math.PI * dN2 * 100), rin = r2 - 3.2, span = Math.min(ov * 10 / escN / rin, 2.2), arc = [];
        P.ci(cx2, cy2, r2); perim = Math.PI * dN2 * 100;
        if (ov > 0) { for (let q = 0; q <= 12; q++) { const a = -Math.PI / 2 - span / 2 + span * q / 12; arc.push([cx2 + rin * Math.cos(a), cy2 + rin * Math.sin(a)]); } P.pl(arc, false, 0.2); cotaH(P, arc[0][0], arc[arc.length - 1][0], arc[0][1] + 7, arc[0][1] + 1, cm(ov), 1.7); }
      }
      cotaH(P, cx2 - r2, cx2 + r2, cy2 + r2 + 7, cy2 + r2 + 1, (S ? '' : '') + cm(dN2 * 100), 1.9);
      P.L('ARX-GR-Texto').tx(cx2, cy2 - r2 - 7, 2.1, 'N2 - Ø' + fmt(X.phi2, 1) + ' - ' + cm(n2CompCm), 'center', 'baseline');
      void perim;
    }

    // ---------------- DETALHE 1 (emenda por transpasse, posição N1; sem escala) ----------------
    {
      const wb = 4.4, xA = 350, xB = xA + wb, y0 = 272, lenB = 40, lenA = 40, trP = 22;
      const yA0 = y0 + lenB - trP, yA1 = yA0 + lenA, yB0 = y0, yB1 = y0 + lenB;
      P.L('ARX-CV-Armadura').rect(xB, yB0, xB + wb, yB1).rect(xA, yA0, xA + wb, yA1);
      hachuraSolo(P, xB, xB + wb, yB0, yB1, 1.6, () => false); hachuraSolo(P, xA, xA + wb, yA0, yA1, 1.6, () => false);
      cotaV(P, xB + wb + 10, yA0, yB1, xB + wb, cm(X.transp1), 1.9);
      const phiTxt = 'Ø' + fmt(X.phi1, 1) + 'mm';
      P.L('ARX-GR-Cota').ln(xA - 26, yA1 - 6, xA + wb + 2, yA1 - 6); seta(P, xA, yA1 - 6, -1, 0); seta(P, xA + wb, yA1 - 6, 1, 0);
      P.L('ARX-GR-Texto').tx(xA - 8, yA1 - 4.6, 1.8, phiTxt, 'right', 'baseline');
      P.L('ARX-GR-Cota').ln(xB - 2, yB0 + 6, xB + 2 * wb + 26, yB0 + 6); seta(P, xB, yB0 + 6, -1, 0); seta(P, xB + wb, yB0 + 6, 1, 0);
      P.L('ARX-GR-Texto').tx(xB + 2 * wb + 8, yB0 + 7.4, 1.8, phiTxt, 'left', 'baseline');
      tituloVista(P, 320.2, 259.9, 'DETALHE 1', 'DET. EMENDA POR TRANSPASSE', 'POSIÇÃO N1', 0.9);
    }

    // ---------------- PLANTA (locação de um pé em relação ao marco central; Seção A é o corte na diagonal) ----------------
    {
      const esc = menorEscala(dxM * 1000, dyM * 1000, 125, 118), k = 1000 / esc, xM = 247, yM = 372, Fx = xM - dxM * k, Fy = yM - dyM * k;
      const r = D * k / 2, rb = Db * k / 2, L = Math.hypot(xM - Fx, yM - Fy), ux = (xM - Fx) / L, uy = (yM - Fy) / L;
      P.L('ARX-GR-LCentro');
      P.ln(Fx - rb - 20, Fy, xM + 24, Fy).ln(Fx, Fy - rb - 22, Fx, yM + 26).ln(xM, Fy - rb - 22, xM, yM + 40).ln(Fx - 10, yM, xM + 24, yM);
      P.ln(Fx - ux * 40, Fy - uy * 40, xM + ux * 24, yM + uy * 24);
      marcaCorte(P, Fx - ux * 42, Fy - uy * 42, 'A', -uy, ux); marcaCorte(P, xM + ux * 26, yM + uy * 26, 'A', -uy, ux);
      if (S) { P.L('ARX-GR-LContínua').rect(Fx - rb, Fy - rb, Fx + rb, Fy + rb); P.L('ARX-GR-LTracejada').rect(Fx - r, Fy - r, Fx + r, Fy + r); }
      else { P.L('ARX-GR-LContínua').ci(Fx, Fy, r); if (comBase) P.L('ARX-GR-LTracejada').ci(Fx, Fy, rb); }
      cantoneira(P, Fx, Fy, Math.max(aba * k, 1.6), Math.max(espStub * k, 0.35), 180);
      P.L('ARX-GR-Simbolo').ci(xM, yM, 2.4).ln(xM - 4, yM, xM + 4, yM).ln(xM, yM - 4, xM, yM + 4);
      chamada(P, xM + 1.5, yM + 1.5, xM + 12, yM - 14, ['MARCO', 'CENTRAL'], 1.9);
      // diretriz da LT (amarela) e bissetriz (tracejada), com os ângulos β/2 e β
      const b2 = rad(dl / 2), Lr = 62;
      P.L('ARX-GR-LContínua');
      [b2, -b2].forEach(a => P.C(2).ln(xM - Math.sin(a) * 6, yM - Math.cos(a) * 6, xM + Math.sin(a) * Lr, yM + Math.cos(a) * Lr).C(null));
      P.L('ARX-GR-LTracejada').C(1).ln(xM, yM + 6, xM, yM - Lr).C(null);
      P.L('ARX-GR-Texto').tx(xM - 2.2, yM - Lr + 2, 1.8, 'BISSETRIZ DO ÂNGULO DA LINHA', 'left', 'baseline', 90).tx(xM + 4.5, yM - Lr + 2, 1.8, 'DIRETRIZ DA LT', 'left', 'baseline', 90);
      if (dl > 0) {
        P.L('ARX-GR-Cota').arco(xM, yM, 34, -90 - dl / 2, -90 + dl / 2, 12).arco(xM, yM, 44, -90, -90 + dl / 2, 8);
        P.L('ARX-GR-Texto').tx(xM, yM - 49, 1.8, 'β = ' + fmt(dl, 1) + '°', 'center', 'baseline').tx(xM + 3, yM - 44, 1.6, 'β/2', 'left', 'baseline');
      } else P.L('ARX-GR-Texto').tx(xM + 3, yM - 30, 1.8, 'β = 0° (SEM DEFLEXÃO)', 'left', 'baseline');
      // cotas: A na horizontal e na vertical, D na diagonal, e as projeções do stub
      const ph = vis * Math.sin(aTrans) * 100, pv = vis * Math.sin(aLong) * 100, pd = vis * Math.sin(beta) * 100;
      cotaH(P, Fx, xM, Fy - rb - 12, Fy - rb - 2, 'A = ' + cm(dxM * 100), 1.9);
      if (ph > 0.05) { cotaH(P, Fx - ph, xM, Fy - rb - 22, Fy - rb - 2, 'A + ' + cm(ph) + ' = ' + cm(dxM * 100 + ph), 1.9); cotaH(P, Fx - ph, Fx, Fy - rb - 12, Fy - rb - 2, cm(ph), 1.7); }
      cotaV(P, xM + 14, Fy, yM, xM + 1, 'A = ' + cm(dyM * 100), 1.9);
      if (pv > 0.05) cotaV(P, xM + 24, Fy - pv, yM, xM + 1, 'A + ' + cm(pv) + ' = ' + cm(dyM * 100 + pv), 1.9);
      cotaDiag(P, Fx, Fy, xM, yM, 9, 'D = ' + cm(dD * 100), 1.9);
      if (pd > 0.05) cotaDiag(P, Fx - ux * pd * k / 100, Fy - uy * pd * k / 100, xM, yM, 18, 'D + ' + cm(pd) + ' = ' + cm(dD * 100 + pd), 1.9);
      cotaV(P, Fx - rb - 12, Fy - r, Fy + r, Fx - r, cm(D * 100), 1.9);
      tituloVista(P, 97.5, 192.2, 'PLANTA', 'ESC. 1:' + esc);
    }

    // ---------------- LOCAÇÃO DAS FUNDAÇÕES ----------------
    {
      const esc = menorEscala((bt + Db + 1.5) * 1000, (bl + Db + 1.5) * 1000, 100, 110), k = 1000 / esc, cx = 132, cy = 108;
      const pes = [['A', -1, 1], ['B', 1, 1], ['C', 1, -1], ['D', -1, -1]], rb = Db * k / 2, r = D * k / 2;
      P.L('ARX-GR-LCentro');
      [-1, 1].forEach(s => { P.ln(cx + s * bt / 2 * k, cy - bl / 2 * k - rb - 8, cx + s * bt / 2 * k, cy + bl / 2 * k + rb + 8); P.ln(cx - bt / 2 * k - rb - 8, cy + s * bl / 2 * k, cx + bt / 2 * k + rb + 8, cy + s * bl / 2 * k); });
      P.ln(cx - bt / 2 * k - rb - 8, cy, cx + bt / 2 * k + rb + 8, cy).ln(cx, cy - bl / 2 * k - rb - 8, cx, cy + bl / 2 * k + rb + 8);
      pes.forEach(e => { P.ln(cx, cy, cx + e[1] * bt / 2 * k, cy + e[2] * bl / 2 * k); });
      pes.forEach(e => {
        const px = cx + e[1] * bt / 2 * k, py = cy + e[2] * bl / 2 * k;
        if (S) { P.L('ARX-GR-LContínua').rect(px - rb, py - rb, px + rb, py + rb); P.L('ARX-GR-LTracejada').rect(px - r, py - r, px + r, py + r); }
        else { P.L('ARX-GR-LContínua').ci(px, py, r); if (comBase) P.L('ARX-GR-LTracejada').ci(px, py, rb); }
        cantoneira(P, px, py, Math.max(aba * k, 1.4), Math.max(espStub * k, 0.3), e[1] * e[2] > 0 ? 180 : 0);
        P.L('ARX-GR-Texto').tx(px + (e[1] > 0 ? 1 : -1) * (rb + 2), py + (e[2] > 0 ? 1 : -1) * (rb + 2) - (e[2] > 0 ? 0 : 2), 2.0, 'PÉ "' + e[0] + '"', e[1] > 0 ? 'left' : 'right', 'baseline');
      });
      P.L('ARX-GR-Simbolo').C(1).ci(cx, cy, 1.4).C(null);
      chamada(P, cx + 1.5, cy + 1.5, cx + 14, cy + 9, ['MARCO', 'CENTRAL'], 1.7);
      const b2 = rad(dl / 2), Lr = bl / 2 * k + rb + 14;
      P.L('ARX-GR-LTracejada').C(1).ln(cx, cy - Lr * 0.4, cx, cy + Lr).C(null);
      [b2, -b2].forEach(a => P.L('ARX-GR-LContínua').C(2).ln(cx - Math.sin(a) * Lr * 0.4, cy - Math.cos(a) * Lr * 0.4, cx + Math.sin(a) * Lr, cy + Math.cos(a) * Lr).C(null));
      P.L('ARX-GR-Texto').tx(cx - 2, cy + Lr * 0.45, 1.6, 'BISSETRIZ DO ÂNGULO DA LINHA', 'left', 'baseline', 90).tx(cx + 3.5, cy + Lr * 0.45, 1.6, 'DIRETRIZ DA LT', 'left', 'baseline', 90);
      if (dl > 0) { P.L('ARX-GR-Cota').arco(cx, cy, Lr * 0.9, 90 - dl / 2, 90 + dl / 2, 8); P.L('ARX-GR-Texto').tx(cx, cy + Lr * 0.9 + 1.5, 1.7, 'β', 'center', 'baseline'); }
      cotaV(P, cx - bt / 2 * k - rb - 12, cy, cy + bl / 2 * k, cx - bt / 2 * k, 'A = ' + cm(dyM * 100), 1.7);
      cotaV(P, cx - bt / 2 * k - rb - 12, cy - bl / 2 * k, cy, cx - bt / 2 * k, 'A = ' + cm(dyM * 100), 1.7);
      cotaH(P, cx - bt / 2 * k, cx, cy - bl / 2 * k - rb - 11, cy - bl / 2 * k, 'A = ' + cm(dxM * 100), 1.7);
      cotaH(P, cx, cx + bt / 2 * k, cy - bl / 2 * k - rb - 11, cy - bl / 2 * k, 'A = ' + cm(dxM * 100), 1.7);
      cotaDiag(P, cx, cy, cx - bt / 2 * k, cy + bl / 2 * k, -7, 'D = ' + cm(dD * 100), 1.6);
      cotaDiag(P, cx, cy, cx + bt / 2 * k, cy - bl / 2 * k, -7, 'D = ' + cm(dD * 100), 1.6);
      tituloVista(P, 79.3, 29.4, 'LOCAÇÃO DAS FUNDAÇÕES', 'ESC. 1:' + esc);
    }

    // ---------------- TABELA 2: LISTA DE FERRO POR FUNDAÇÃO (posição do modelo) ----------------
    {
      const lin = X.linhas, x0t = 442, W = 170, topo = 200, fundo = 57;
      const colunas = S ? [
        ['G\n(cm)', 12, l => cm(l.G_cm)], ['H\n(m)', 11, l => fmt(l.H_m, 2)], ['CONCR.\n(m³)', 15, l => fmt(l.concreto_m3, 2)], ['ESCAV.\n(m³)', 15, l => fmt(l.escavacao_m3, 2)],
        ['REATERRO\n(m³)', 17, l => fmt(l.reaterro_m3, 2)],
        ['UNIT.\n(m)', 14, l => fmt(l.N1_unit_m, 2)], ['PESO\n(kgf)', 14, l => fmt(l.N1_kg, 0)],
        ['QUANT.\n"n"', 13, l => l.N2_qtd], ['PESO\n(kgf)', 13, l => fmt(l.N2_kg, 0)],
        ['N3 + N4\n(kgf)', 17, l => fmt(l.base_kg, 0)], ['TOTAL\n(kgf)', 17, l => fmt(l.aco_total_kg, 0)],
      ] : [
        ['G\n(cm)', 12, l => cm(l.G_cm)], ['H\n(m)', 11, l => fmt(l.H_m, 2)], ['CONCR.\n(m³)', 15, l => fmt(l.concreto_m3, 2)], ['ESCAV.\n(m³)', 15, l => fmt(l.escavacao_m3, 2)],
        ['UNIT.', 12, l => fmt(l.n1_comp_unit_m, 2)], ['TOTAL', 12, l => fmt(l.n1_comp_total_m, 0)], ['PESO\n(kgf)', 12, l => fmt(l.n1_peso_kgf, 0)],
        ['QUANT.\n"n"', 13, l => l.n2_quantidade], ['COMPR.\nTOTAL (m)', 17, l => fmt(l.n2_comp_total_m, 0)], ['PESO\n(kgf)', 12, l => fmt(l.n2_peso_kgf, 0)], ['PESO\nTOTAL (kgf)', 17, l => fmt(l.peso_total_kgf, 0)],
      ];
      const f = W / colunas.reduce((a, c) => a + c[1], 0), w = colunas.map(c => c[1] * f);
      const xs = [x0t]; w.forEach(v => xs.push(xs[xs.length - 1] + v));
      const gDim = S ? 5 : 4, gN1 = S ? 2 : 3, gN2 = S ? 2 : 3, gx = [0, gDim, gDim + gN1, gDim + gN1 + gN2, colunas.length].map(j => xs[j]);
      const hT = 7, hG = 11, hC = S ? 9 : 14, yTit = topo - hT, yGrp = yTit - hG, yDat0 = yGrp - hC;
      const hl = Math.min(7.5, (yDat0 - fundo) / lin.length), yy = n => yDat0 - n * hl, yFim = yy(lin.length);
      P.L('FORMATO').rect(x0t, yFim, x0t + W, topo);
      P.ln(x0t, yTit, x0t + W, yTit).ln(x0t, yGrp, x0t + W, yGrp).ln(x0t, yDat0, x0t + W, yDat0);
      xs.slice(1, -1).forEach(x => P.ln(x, yFim, x, yDat0));
      gx.slice(1, -1).forEach(x => P.ln(x, yDat0, x, yTit));
      const nm = (s, a, b) => { P.L('ARX-GR-Texto').tx((a + b) / 2, yTit - 5.5, 1.5, s, 'center', 'baseline'); };
      P.L('ARX-GR-Texto').tx(x0t + W / 2, topo - 5, 2.4, 'TABELA 2 - ' + torre + '-' + tipo + '-' + nome + ' - POR FUNDAÇÃO', 'center', 'baseline');
      nm('DIMENSÕES VARIÁVEIS E VOLUMES', gx[0], gx[1]); nm('LISTA DE FERRO POR FUNDAÇÃO', gx[1], gx[3]); nm('PESO', gx[3], gx[4]);
      P.L('FORMATO'); const n1a = xs[gDim], n1b = xs[gDim + gN1], n2b = xs[gDim + gN1 + gN2];
      P.ln(n1a, yGrp + (yTit - yGrp) / 2 - 1, n2b, yGrp + (yTit - yGrp) / 2 - 1).ln(n1b, yGrp, n1b, yTit);
      P.L('ARX-GR-Texto');
      P.tx((n1a + n1b) / 2, yTit - 9.6, 1.4, 'N1 - ' + nBar + ' Ø' + fmt(X.phi1, 1), 'center', 'baseline');
      P.tx((n1b + n2b) / 2, yTit - 9.6, 1.4, 'N2 - Ø' + fmt(X.phi2, 1) + ' - ' + cm(n2CompCm), 'center', 'baseline');
      colunas.forEach((c, j) => { c[0].split('\n').forEach((t, q) => P.tx((xs[j] + xs[j + 1]) / 2, yGrp - 4.2 - q * 2.4, 1.35, t, 'center', 'baseline')); });
      if (!S) P.tx((xs[4] + xs[6]) / 2 + (xs[5] - xs[4]) / 2, yGrp + 0.5, 1.2, '', 'center', 'baseline');
      lin.forEach((l, n) => {
        const t = Math.min(hl * 0.42, 2.2);
        P.L('ARX-GR-Texto');
        colunas.forEach((c, j) => P.tx((xs[j] + xs[j + 1]) / 2, yy(n) - hl / 2 - t / 2 + 0.2, t, c[2](l), 'center', 'baseline'));
        P.L('FORMATO').ln(x0t, yy(n + 1), x0t + W, yy(n + 1));
      });
      P.L('ARX-GR-Texto').tx(x0t, yFim - 4, 1.6, 'N1 = ' + cm(n1Unit * 100) + ' cm (COMPRIMENTO UNITÁRIO PARA O G MÁXIMO); VOLUMES E PESOS TEÓRICOS.', 'left', 'baseline');
    }

    // rótulo do modelo
    P.L('ARX-GR-Texto').tx(0, A1.h + 10, 6, nomeF.toUpperCase() + ' - TORRE ' + torre + ' - SOLO ' + nome, 'left', 'baseline');
  }

  window.DxfFundacao = function (run, doc, geom) {
    if (!window.DxfWriter) throw new Error('modelo/dxf-writer.js não carregado');
    const ent = run.entrada, res = run.res, TB = run.ft === 'tcb', S = run.ft === 'sap';
    const d = new window.DxfWriter.Drawing();
    d.setUnits('Millimeters');
    d.addLineType('ACAD_ISO04W100', 'ISO long-dash dot', [12, -3, 0, -3]);
    d.addLineType('ACAD_ISO02W100', 'ISO dash', [12, -3]);
    LAYERS.forEach(l => d.addLayer(l[0], l[1], l[2]));
    ESTILOS.forEach(e => { const ts = new window.DxfWriter.TextStyle(e[0]); ts.fontFileName = e[1]; d.tables['STYLE'].add(ts); });
    const solos = res.solos.filter(n => res.resultados[n]);
    if (!solos.length) throw new Error('Nenhum solo calculado para desenhar.');
    const ctx = { run, ent, res, doc: doc || {}, geom: Object.assign({}, GEOM_PADRAO, geom || {}), S, TB, torre: run.torreNome, tipo: ent.tipo_fundacao, nomeF: run.tipo || (S ? 'Sapata' : TB ? 'Tubulão com base' : 'Tubulão sem base'), nSolos: solos.length };
    for (let i = 0; i < solos.length; i++) prancha(d, i, ctx);
    return d.toDxfString();
  };
  window.DxfFundacao.GEOM_PADRAO = GEOM_PADRAO;
})();
