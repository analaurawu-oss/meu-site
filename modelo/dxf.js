// Desenhos de fundação em DXF — tubulão sem base, tubulão com base e sapata; uma prancha A1 (841 × 594 mm) por solo.
// window.DxfFundacao(run, doc, geom) -> texto DXF (AutoCAD 2007, UTF-8). Requer modelo/dxf-writer.js.
// Unidades do desenho: milímetros de papel. Cada vista é desenhada em escala real (1:n escolhida para caber
// na prancha); as cotas mostram o valor real, em centímetros, como nas notas do padrão Eletrobras / Araxá.
// Layers, cores e tipos de linha seguem o modelo Autoportante_T / Autoportante_TB.
(function () {
  const A1 = { w: 841, h: 594 };
  const GAP = 80;                     // distância entre pranchas no modelo
  const ESCALAS = [2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500];
  const GEOM_PADRAO = { largura_aba_mm: 150, base_transversal_m: 6, base_longitudinal_m: 6, deflexao_graus: 0 };

  const LAYERS = [
    ['ARX-CV-Contorno', 1, 'CONTINUOUS'], ['ARX-CV-Armadura', 3, 'CONTINUOUS'], ['STUB', 1, 'CONTINUOUS'],
    ['ARX-GR-Cota', 12, 'CONTINUOUS'], ['ARX-GR-Texto', 7, 'CONTINUOUS'], ['ARX-GR-Solo', 4, 'CONTINUOUS'],
    ['ARX-GR-Hachuras', 7, 'CONTINUOUS'], ['ARX-GR-LCentro', 7, 'ACAD_ISO04W100'], ['ARX-GR-LTracejada', 7, 'ACAD_ISO02W100'],
    ['ARX-GR-LContínua', 2, 'CONTINUOUS'], ['ARX-GR-LAuxiliar', 7, 'CONTINUOUS'], ['ARX-GR-Simbolo', 7, 'CONTINUOUS'],
    ['FORMATO', 7, 'CONTINUOUS'],
  ];

  const num = (v, d) => (v === null || v === undefined || v === '' || isNaN(v)) ? (d === undefined ? 0 : d) : Number(v);
  const fmt = (v, d) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const cm = v => { const x = Math.round(v * 10) / 10; return fmt(x, Number.isInteger(x) ? 0 : 1); };   // valor em cm, sem zeros à toa
  const rad = g => g * Math.PI / 180;

  function menorEscala(larg, alt, maxW, maxH) {      // larg/alt em mm reais; devolve n de 1:n
    for (const n of ESCALAS) if (larg / n <= maxW && alt / n <= maxH) return n;
    return ESCALAS[ESCALAS.length - 1];
  }

  // ---------- caneta com deslocamento (cada prancha tem a sua origem) ----------
  function caneta(d, ox, oy) {
    const P = {
      L(nome) { d.setActiveLayer(nome); return P; },
      ln(x1, y1, x2, y2) { d.drawLine(ox + x1, oy + y1, ox + x2, oy + y2); return P; },
      pl(pts, fechada, larg) { d.drawPolyline(pts.map(p => [ox + p[0], oy + p[1]]), !!fechada, larg || 0, larg || 0); return P; },
      ci(x, y, r) { d.drawCircle(ox + x, oy + y, r); return P; },
      tx(x, y, h, s, al, v, rot) { d.drawText(ox + x, oy + y, h, rot || 0, String(s), al || 'left', v || 'baseline'); return P; },
      rect(x1, y1, x2, y2) { return P.pl([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], true); },
    };
    return P;
  }

  // ---------- cotas: linha, extensões, marcas oblíquas e texto ----------
  function cotaH(P, x1, x2, y, ye, txt, h) {         // cota horizontal em y; extensões vão até ye
    h = h || 2.2; const s = Math.sign(y - ye) || 1;
    P.L('ARX-GR-Cota').ln(x1, ye, x1, y + s * 1.5).ln(x2, ye, x2, y + s * 1.5).ln(x1, y, x2, y);
    P.ln(x1 - 1, y - 1, x1 + 1, y + 1).ln(x2 - 1, y - 1, x2 + 1, y + 1);
    P.tx((x1 + x2) / 2, y + 0.8, h, txt, 'center', 'baseline');
  }
  function cotaV(P, x, y1, y2, xe, txt, h) {         // cota vertical em x; extensões vão até xe
    h = h || 2.2; const s = Math.sign(x - xe) || 1;
    P.L('ARX-GR-Cota').ln(xe, y1, x + s * 1.5, y1).ln(xe, y2, x + s * 1.5, y2).ln(x, y1, x, y2);
    P.ln(x - 1, y1 - 1, x + 1, y1 + 1).ln(x - 1, y2 - 1, x + 1, y2 + 1);
    P.tx(x - 0.8, (y1 + y2) / 2, h, txt, 'center', 'baseline', 90);
  }
  function chamada(P, x1, y1, x2, y2, txt, h) {      // linha de chamada com texto (à direita ou à esquerda)
    h = h || 2.2;
    P.L('ARX-GR-Simbolo').ln(x1, y1, x2, y2).ln(x2, y2, x2 + (x2 >= x1 ? 4 : -4), y2);
    P.L('ARX-GR-Texto').tx(x2 + (x2 >= x1 ? 4.6 : -4.6), y2 - h / 2, h, txt, x2 >= x1 ? 'left' : 'right', 'baseline');
  }
  function tituloVista(P, x, y, nome, esc) {
    P.L('ARX-GR-Simbolo').ci(x - 14, y + 1, 3.2);
    P.L('ARX-GR-Texto').tx(x - 9, y, 3.6, nome, 'left', 'baseline');
    P.tx(x - 9, y - 4.2, 2.2, 'ESC. 1:' + esc, 'left', 'baseline');
  }

  // ---------- hachura de solo (linhas a 45°) recortada pelo concreto ----------
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
    P.L('STUB').pl(pts.map(p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]), true);
  }

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

  // ============================================================== prancha ==============================================================
  function prancha(d, i, ctx) {
    const { run, ent, res, doc, geom, S, TB, torre, tipo, nomeF } = ctx;
    const nome = res.solos.filter(n => res.resultados[n])[i];
    const X = dados(ctx, nome), R = X.R, M = X.M;
    const P = caneta(d, i * (A1.w + GAP), 0);

    // dados da fundação
    const D = X.D, Db = X.Db, Lenc = X.Lenc, La = X.La, Lb = X.Lb, Gmin = X.Gmin, Gmax = X.Gmax, comBase = X.comBase;
    const cobCm = M.cobrimento_cm !== undefined ? M.cobrimento_cm : M.cob_cm, fykMpa = M.fyk_mpa !== undefined ? M.fyk_mpa : M.fyk_kgf_cm2 / 10;
    const cob = cobCm / 100, phi1 = X.phi1 / 1000, phi2 = X.phi2 / 1000;
    const nBar = X.nBar, esp2 = X.esp2 / 100, n1Unit = X.n1Unit, n2CompCm = X.comp2cm;
    const stub = ent.stub, aba = num(geom.largura_aba_mm) / 1000, espStub = num(stub.espessura_mm) / 1000;
    const hStub = num(stub.altura_real_mm) / 1000, enterStub = num(stub.altura_enterrada_mm) / 1000;
    const thetaStub = Math.acos(1 / Math.max(1, num(stub.secante_alfa_longitudinal, 1)));
    const Dn = S ? 'a' : 'D', Dbn = S ? 'A' : 'Db';
    const rN1 = D / 2 - cob - phi2 - phi1 / 2;        // distância do eixo às barras N1 (m)
    const rN2 = D / 2 - cob - phi2 / 2;               // idem, ao eixo do estribo
    const rotuloN1 = 'N1 – ' + nBar + ' Ø' + fmt(X.phi1, 1);
    const rotuloN2 = 'N2 – Ø' + fmt(X.phi2, 1) + ' c/' + cm(X.esp2);

    // ---------------- formato A1 ----------------
    P.L('FORMATO').rect(0, 0, A1.w, A1.h).rect(25, 10, 831, 584);
    P.ln(656, 10, 656, 584);
    P.tx(A1.w / 2, -20, 8, 'SOLO ' + nome, 'center', 'baseline');

    // revisões (topo da coluna direita)
    const cols = [[656, 'REV.'], [670, 'ALTERAÇÃO'], [736, 'DATA'], [760, 'DES.'], [784, 'VERIF.'], [808, 'APROV.']];
    P.L('FORMATO').ln(656, 577, 831, 577).ln(656, 521, 831, 521);
    for (let r = 1; r <= 7; r++) P.ln(656, 577 - r * 8, 831, 577 - r * 8);
    cols.slice(1).forEach(c => P.ln(c[0], 521, c[0], 584));
    cols.forEach(c => P.tx(c[0] + 1.2, 579.3, 2, c[1], 'left', 'baseline'));
    const rowv = [doc.rev || '0', (doc.revDesc || '').toUpperCase(), doc.data || '', doc.execucao || '', doc.verificacao || '', doc.aprovacao || ''];
    cols.forEach((c, k) => P.tx(c[0] + 1.2, 571.6, 2.2, rowv[k], 'left', 'baseline'));

    // referências e notas
    const sub = s => String(s || '').replace(/\{torre\}/gi, torre).replace(/\{tipo\}/gi, tipo).replace(/\{fundacao\}/gi, nomeF.toUpperCase());
    const refs = ['MEMÓRIA DE CÁLCULO – ' + nomeF.toUpperCase() + ' – TORRE ' + torre + (doc.numDoc ? ' (' + doc.numDoc + ')' : '') + '.',
      'CADERNO DE DESENHO – TORRE TIPO ' + torre + (stub.codigo ? ' (' + stub.codigo + ')' : '') + '.'];
    if (doc.ref11) refs.push(String(doc.ref11));
    let y = 515;
    P.L('FORMATO').tx(658, y, 2.6, 'REFERÊNCIAS:', 'left', 'baseline'); y -= 5;
    P.L('ARX-GR-Texto');
    refs.forEach((r, k) => quebrar((k + 1) + '. ' + r, 100).forEach(l => { P.tx(658, y, 1.9, l, 'left', 'baseline'); y -= 3; }));
    y -= 4;
    P.L('FORMATO').tx(658, y, 2.6, 'NOTAS:', 'left', 'baseline'); y -= 5;
    const fyk = fykMpa, aco = fyk === 500 ? 'CA-50' : fyk === 600 ? 'CA-60' : 'fyk = ' + fyk + ' MPa';
    const so = X.so;
    const notas = [
      'DIMENSÕES EM CENTÍMETRO, BITOLAS EM MILÍMETROS, EXCETO ONDE INDICADO.',
      'AS FUNDAÇÕES DEVERÃO SER EXECUTADAS DE ACORDO COM A NBR-6118 E NBR-6122.',
      'CONCRETO ESTRUTURAL:\n   FCK ≥ ' + M.fck_mpa + ' MPa; A/C ≤ 0,6, AÇO: ' + aco + ';\n   COBRIMENTO = ' + cobCm + ' cm;\n   CONSUMO MÍNIMO DE CIMENTO ≥ 280 kg/m³.',
      'AS CAVAS DEVERÃO SER ABERTAS COM PAREDES VERTICAIS UTILIZANDO ESCAVAÇÃO MECANIZADA, SEGUINDO AS ESPECIFICAÇÕES PRESENTES NO PROJETO. CASO HAJA RISCO DE DESMORONAMENTO DEVERÃO SER PROTEGIDAS. DEVERÃO SER RIGOROSAMENTE CUMPRIDOS TODOS OS PREDISPOSTOS DA NR-18, NR-15, NBR 6122/2019 E MTE 644/2013. NÃO SERÁ PERMITIDA A EXECUÇÃO DESTE TIPO DE FUNDAÇÃO SEM A SUPERVISÃO DO PROFISSIONAL LEGALMENTE HABILITADO.',
      'AS ARMADURAS DEVERÃO SER PREPARADAS E MONTADAS DE ACORDO COM ESTE DESENHO, SENDO PERMITIDO O USO DE EMENDAS DESDE QUE ESTEJAM DE ACORDO COM A NBR 6118.',
      'TODOS OS VOLUMES, COMPRIMENTOS E PESO DOS FERROS SÃO TEÓRICOS, NÃO HAVENDO NENHUM ACRÉSCIMO NOS MESMOS.',
      'O ACABAMENTO NO TOPO DA FUNDAÇÃO DEVERÁ SER FEITO DE MODO A EVITAR O ACÚMULO DE ÁGUA AO REDOR DO STUB, ASSEGURANDO UMA BOA DRENAGEM.',
      'A FIM DE EVITAR O ALÍVIO DAS TENSÕES LATERAIS DO SOLO, A CONCRETAGEM DEVERÁ SER EXECUTADA NO PRAZO MÁXIMO DE 3 DIAS APÓS O TÉRMINO DA ESCAVAÇÃO.',
      'DEVERÁ SER FEITA A VERIFICAÇÃO EM CAMPO DE POSSÍVEIS CAMINHOS DE ESCOAMENTO DE ÁGUAS PLUVIAIS QUE POSSAM OCASIONAR EROSÃO DO SOLO DE FUNDAÇÃO OU ALAGAMENTO DO LOCAL. CASO TAL PROCESSO SEJA OBSERVADO DEVERÃO SER EXECUTADOS SISTEMAS DE DRENAGEM SUPERFICIAL PARA DESVIO E CORRETA DESTINAÇÃO DAS ÁGUAS.',
      'O CONCRETO DEVERÁ SER LANÇADO ATRAVÉS DE TROMBA (FUNIL) DE COMPRIMENTO ADEQUADO PARA EVITAR A SEGREGAÇÃO DOS MATERIAIS E MANTER A HOMOGENEIDADE DO CONCRETO. A ALTURA DE QUEDA LIVRE NÃO DEVE ULTRAPASSAR 2 m (ITEM 9.5 DA NBR-14931).',
      'O CONCRETO LANÇADO DEVERÁ SOFRER VIBRAÇÃO CUIDADOSA, COM PREENCHIMENTO TOTAL DA CAVA. COMO CONTROLE DE EXECUÇÃO, DEVE-SE COMPARAR O CONSUMO DE MATERIAL DURANTE A CONCRETAGEM COM OS VOLUMES PREVISTOS NESTE DESENHO.',
      'NA IMPOSSIBILIDADE DE EXECUÇÃO DESTA FUNDAÇÃO, DEVERÁ SER EMITIDO PELO CAMPO UM FORMULÁRIO DE ALTERAÇÃO PARA DEVIDA APROVAÇÃO DA PROJETISTA E ENGENHARIA CONTRATANTE. EM CASOS QUE A CAVA TENHA PRESENÇA DE ÁGUA OU ROCHA, A PROJETISTA TAMBÉM DEVERÁ SER CONTACTADA MEDIANTE UM FORMULÁRIO DE ALTERAÇÃO.',
      'UTILIZAR ADITIVO ANTISOL PARA O CONCRETO.',
      'ESTE PROJETO É APLICADO PARA A LINHA: ' + (run.linhaNome || ent.linha || '—') + '.',
      'PARÂMETROS GEOTÉCNICOS PARA SOLO:\n   TIPO ' + nome + ': ÂNGULO DE ATRITO: ' + fmt(num(so.phi_graus !== undefined ? so.phi_graus : so.phi), 0) + 'º; COESÃO: ' + fmt(num(so.coesao_kgf_m2 !== undefined ? so.coesao_kgf_m2 : so.coesao), 0) + ' kgf/m²; PESO ESPECÍFICO: ' + fmt(num(so.gamma_kgf_m3 !== undefined ? so.gamma_kgf_m3 : so.gamma), 0) + ' kgf/m³.',
    ];
    P.L('ARX-GR-Texto');
    notas.forEach((n, k) => { quebrar((k + 1) + '. ' + n, 100).forEach(l => { P.tx(658, y, 1.9, l, 'left', 'baseline'); y -= 3; }); y -= 0.8; });

    // carimbo (canto inferior direito)
    const cel = (x, y1, w, h, rot, val, hv) => { P.L('FORMATO').rect(x, y1, x + w, y1 + h); P.tx(x + 1, y1 + h - 2.3, 1.5, rot, 'left', 'baseline'); P.L('ARX-GR-Texto').tx(x + 1.5, y1 + 1.6, hv || 2.4, val || '', 'left', 'baseline'); };
    const titulo = sub(doc.titulo || 'FUNDAÇÕES DAS TORRES – TORRE {torre}'), subtitulo = sub(doc.subtitulo || '{fundacao} – {torre}-{tipo}');
    const x0 = 656;
    cel(x0, 10, 88, 10, 'Nº FORNECEDOR:', doc.numForn);
    cel(x0 + 88, 10, 40, 10, 'ESCALA:', 'INDICADA');
    cel(x0 + 128, 10, 47, 10, 'REVISÃO:', doc.rev || '0');
    cel(x0, 20, 175, 10, 'SUBTÍTULO:', subtitulo + ' – SOLO ' + nome);
    cel(x0, 30, 175, 10, 'TÍTULO:', titulo);
    cel(x0, 40, 88, 10, 'INSTALAÇÃO:', doc.codInst);
    cel(x0 + 88, 40, 87, 10, 'TAG:', doc.tag);
    cel(x0, 50, 88, 10, 'LOCAL:', doc.local);
    cel(x0 + 88, 50, 87, 10, 'FOLHA:', (i + 1) + ' DE ' + ctx.nSolos);
    cel(x0, 60, 88, 10, 'UNIDADE:', doc.unidade);
    cel(x0 + 88, 60, 87, 10, 'FASE:', doc.projeto);
    cel(x0, 70, 88, 10, 'Nº EMPREENDIMENTO:', doc.numEmp);
    cel(x0 + 88, 70, 87, 10, 'FINALIDADE:', doc.status);
    cel(x0, 80, 175, 9, 'DESENHO Nº DOCUMENTO:', doc.numDoc, 3);

    // ---------------- ELEVAÇÃO ----------------
    {
      const topoReal = Lenc + Gmax + Math.max(0, hStub - enterStub) * Math.cos(thetaStub) + 0.1;
      const esc = menorEscala(Math.max(Db, 1) * 1000 + 800, topoReal * 1000, 150, 478);
      const k = 1000 / esc;                             // mm de papel por metro real
      const xc = 118, yb = 62;                          // eixo e base do concreto
      const yt = yb + Lenc * k;                         // nível do terreno
      const ytop = yt + Gmax * k;
      const rCon = y => {                               // meia largura do concreto na cota y (papel)
        if (!comBase) return D * k / 2;
        if (y < yb + Lb * k) return Db * k / 2;
        if (y < yb + (Lb + La) * k) return (Db / 2 - (Db - D) / 2 * (y - yb - Lb * k) / (La * k)) * k;
        return D * k / 2;
      };
      // terreno e hachura
      const wLado = S ? 30 : 38, xe = xc - Db * k / 2 - wLado, xd = xc + Db * k / 2 + wLado, caixas = [];
      P.L('ARX-GR-Solo').ln(xe - 6, yt, xd + 6, yt);
      const rotS = [];   // legendas dentro do solo: guardadas para abrir espaço na hachura
      if (S) {
        const b = X.base, tN4 = 'N4 – ' + b.n + ' Ø' + fmt(b.phi, 1) + ' c/' + cm(b.esp), tN3 = 'N3 – ' + b.n + ' Ø' + fmt(b.phi, 1) + ' c/' + cm(b.esp);
        const xt = xc + Db * k / 2 + 6;
        rotS.push([xc + (Db / 2 - cob) * k * 0.6, yb + cob * k, xt, yb + 9, tN4], [xc + (Db / 2 - cob) * k * 0.75, yb + (Lb - cob) * k, xt, yb + Lb * k + 6, tN3]);
        rotS.forEach(r => caixas.push([r[2] - 1, r[3] - 3, r[2] + 6 + 1.5 * r[4].length, r[3] + 3]));
      }
      hachuraSolo(P, xe, xd, yb - 4, yt, 3.2, (x, yy) => (yy >= yb && Math.abs(x - xc) < rCon(yy)) || caixas.some(c => x >= c[0] && x <= c[2] && yy >= c[1] && yy <= c[3]));
      P.L('ARX-GR-Solo').ln(xe, yb - 4, xe, yt).ln(xd, yb - 4, xd, yt);
      // concreto
      const perfil = [];
      if (comBase) {
        const rb = Db * k / 2, rf = D * k / 2;
        perfil.push([xc - rb, yb], [xc + rb, yb], [xc + rb, yb + Lb * k], [xc + rf, yb + (Lb + La) * k], [xc + rf, ytop], [xc - rf, ytop], [xc - rf, yb + (Lb + La) * k], [xc - rb, yb + Lb * k]);
      } else {
        const r = D * k / 2; perfil.push([xc - r, yb], [xc + r, yb], [xc + r, ytop], [xc - r, ytop]);
      }
      P.L('ARX-CV-Contorno').pl(perfil, true, 0.35);
      P.L('ARX-GR-LTracejada').ln(xc - D * k / 2 - 6, yt + Gmin * k, xc + D * k / 2 + 6, yt + Gmin * k);
      P.L('ARX-GR-LCentro').ln(xc, yb - 10, xc, ytop + hStub * k + 8);
      // armadura do fuste: barras N1 (laterais) e estribos N2
      const x1 = rN1 * k, x2 = rN2 * k;
      const zFundo = yb + cob * k, zTopo = ytop - cob * k, zEstrFim = S ? yb + (Lb + La) * k : zFundo;
      P.L('ARX-CV-Armadura');
      if (S) {                                           // N1 com pé de 20 cm apoiado na malha inferior (N4)
        const pe = Math.max(0.2, n1Unit - (Lenc + Gmax - 2 * cob)) * k;
        P.pl([[xc - x1 - pe, zFundo], [xc - x1, zFundo], [xc - x1, zTopo]], false, 0.3).pl([[xc + x1 + pe, zFundo], [xc + x1, zFundo], [xc + x1, zTopo]], false, 0.3);
      } else {
        P.pl([[xc - x1, zFundo], [xc - x1, zTopo]], false, 0.3).pl([[xc + x1, zFundo], [xc + x1, zTopo]], false, 0.3);
      }
      for (let z = zTopo; z >= zEstrFim - 1e-6; z -= esp2 * k) P.ln(xc - x2, z, xc + x2, z);
      if (S) {                                           // malhas da base: N4 embaixo (apoio do pé de N1) e N3 no topo da laje de borda
        const b = X.base, rb = (Db / 2 - cob) * k, passo = b.esp / 100 * k;
        const zN4 = yb + cob * k + 0.2, zN3 = yb + (Lb - cob) * k - 0.2;
        P.ln(xc - rb, zN4 + 0.6, xc + rb, zN4 + 0.6).ln(xc - rb, zN3, xc + rb, zN3);
        for (let j = 0; j < b.n; j++) {
          const px = xc - rb + j * ((2 * rb) / Math.max(1, b.n - 1));
          P.ci(px, zN4 - 0.2, Math.max(b.phi / 2000 * k, 0.35)).ci(px, zN3 - 0.7, Math.max(b.phi / 2000 * k, 0.35));
        }
        void passo;
      }
      // stub
      const aw = aba * k, hh = hStub * k, ex = enterStub * k;
      const b0 = [xc, ytop - ex], u = [Math.sin(thetaStub), Math.cos(thetaStub)], p = [Math.cos(thetaStub), -Math.sin(thetaStub)];
      const q = (a, b) => [b0[0] + u[0] * a + p[0] * b, b0[1] + u[1] * a + p[1] * b];
      P.L('STUB').pl([q(0, -aw / 2), q(0, aw / 2), q(hh, aw / 2), q(hh, -aw / 2)], true, 0.3);
      P.L('ARX-GR-LCentro').ln(...q(-6, 0), ...q(hh + 6, 0));
      // cotas
      const xr = xc + Db * k / 2 + wLado + 14;
      cotaV(P, xr, yt, ytop, xc + D * k / 2 + 8, 'G máx = ' + cm(Gmax * 100));
      cotaV(P, xr - 9, yt, yt + Gmin * k, xc + D * k / 2 + 8, 'G mín = ' + cm(Gmin * 100));
      cotaV(P, xr + 9, yb, yt, xr + 9, 'L = ' + cm(Lenc * 100));
      cotaV(P, xr + 18, yb, ytop, xr + 18, 'H máx = ' + cm((Lenc + Gmax) * 100));
      cotaH(P, xc - D * k / 2, xc + D * k / 2, ytop + hStub * k * Math.cos(thetaStub) + 7, ytop, Dn + ' = ' + cm(D * 100));
      if (comBase) {
        cotaH(P, xc - Db * k / 2, xc + Db * k / 2, yb - 8, yb, Dbn + ' = ' + cm(Db * 100));
        cotaV(P, xc - Db * k / 2 - 16, yb, yb + Lb * k, xc - Db * k / 2, cm(Lb * 100));
        cotaV(P, xc - Db * k / 2 - 16, yb + Lb * k, yb + (Lb + La) * k, xc - Db * k / 2, cm(La * 100));
        if (S) cotaV(P, xc - Db * k / 2 - 16, yb + (Lb + La) * k, yt, xc - D * k / 2, cm((Lenc - Lb - La) * 100));
      }
      // legendas
      const yN2 = yt + Math.max(4, Gmax * k * 0.3), yN1 = yN2 + 9;   // legendas acima do terreno, ao lado do fuste
      chamada(P, xc + x1, yN1 - 3, xc + D * k / 2 + 24, yN1, rotuloN1 + ' – C = ' + cm(n1Unit * 100), 2.1);
      chamada(P, xc + x2, yN2 - 3, xc + D * k / 2 + 24, yN2, rotuloN2 + ' – C = ' + cm(n2CompCm), 2.1);
      chamada(P, ...q(hh * 0.7, aw / 2), xc + D * k / 2 + 24, ytop + hh * 0.7 * Math.cos(thetaStub) + 3, 'STUB L ' + fmt(aba * 1000, 0) + 'x' + fmt(aba * 1000, 0) + 'x' + fmt(espStub * 1000, 1).replace(/,0$/, '') + ' mm', 2.1);
      rotS.forEach(r => chamada(P, r[0], r[1], r[2], r[3], r[4], 2.1));
      P.L('ARX-GR-Simbolo').pl([[xe - 6, yt + 0.1], [xe - 11, yt + 4.5], [xe - 1, yt + 4.5]], true);
      P.L('ARX-GR-Texto').tx(xe - 12, yt + 6, 1.8, 'NÍVEL DO TERRENO', 'left', 'baseline');
      tituloVista(P, 62, 22, 'ELEVAÇÃO', esc);
    }

    // ---------------- PLANTA ----------------
    {
      const esc = menorEscala(Db * 1000 + 600, Db * 1000 + 600, 118, 118);
      const k = 1000 / esc, cx = 330, cy = 483;
      const hD = D * k / 2, hDb = Db * k / 2;
      if (S) {
        const b = X.base, rb = (Db / 2 - cob) * k;
        P.L('ARX-CV-Contorno').rect(cx - hDb, cy - hDb, cx + hDb, cy + hDb);
        P.rect(cx - hD, cy - hD, cx + hD, cy + hD);
        P.L('ARX-CV-Armadura');                           // malha N4 (N3 é igual e fica sobreposta)
        for (let j = 0; j < b.n; j++) { const t = -rb + j * (2 * rb / Math.max(1, b.n - 1)); P.ln(cx + t, cy - rb, cx + t, cy + rb).ln(cx - rb, cy + t, cx + rb, cy + t); }
        P.L('ARX-CV-Contorno').rect(cx - hD, cy - hD, cx + hD, cy + hD);
        const h2 = rN2 * k; P.L('ARX-CV-Armadura').rect(cx - h2, cy - h2, cx + h2, cy + h2);
        const h1 = rN1 * k, per = 8 * h1, pas = per / nBar;   // N1 distribuídas pelo perímetro
        for (let n = 0; n < nBar; n++) {
          let t = n * pas, px, py;
          if (t < 2 * h1) { px = -h1 + t; py = -h1; } else if (t < 4 * h1) { px = h1; py = -h1 + (t - 2 * h1); } else if (t < 6 * h1) { px = h1 - (t - 4 * h1); py = h1; } else { px = -h1; py = h1 - (t - 6 * h1); }
          P.ci(cx + px, cy + py, Math.max(phi1 * k / 2, 0.45));
        }
        cantoneira(P, cx, cy, aba * k, espStub * k, 45);
        P.L('ARX-GR-LCentro').ln(cx - hDb - 8, cy, cx + hDb + 8, cy).ln(cx, cy - hDb - 8, cx, cy + hDb + 8);
        cotaH(P, cx - hDb, cx + hDb, cy - hDb - 9, cy - hDb - 2, 'A = ' + cm(Db * 100));
        cotaH(P, cx - hD, cx + hD, cy + hDb + 10, cy + hD, 'a = ' + cm(D * 100));
        cotaV(P, cx + hDb + 10, cy - hDb, cy + hDb, cx + hDb, 'A = ' + cm(Db * 100));
        chamada(P, cx + h1, cy + h1, cx + hDb + 16, cy + hDb + 3, rotuloN1, 2.1);
        chamada(P, cx + h2, cy - h2 * 0.2, cx + hDb + 16, cy - hDb * 0.3, rotuloN2, 2.1);
        chamada(P, cx + rb * 0.6, cy - rb, cx + hDb + 16, cy - hDb + 2, 'N3/N4 – ' + b.n + ' Ø' + fmt(b.phi, 1) + ' c/' + cm(b.esp), 2.1);
      } else {
        P.L('ARX-CV-Contorno').ci(cx, cy, hD);
        if (comBase) P.L('ARX-GR-LTracejada').ci(cx, cy, hDb);
        P.L('ARX-CV-Armadura').ci(cx, cy, rN2 * k);
        for (let b = 0; b < nBar; b++) { const a = 2 * Math.PI * b / nBar; P.ci(cx + rN1 * k * Math.cos(a), cy + rN1 * k * Math.sin(a), Math.max(phi1 * k / 2, 0.4)); }
        cantoneira(P, cx, cy, aba * k, espStub * k, 45);
        P.L('ARX-GR-LCentro').ln(cx - hDb - 8, cy, cx + hDb + 8, cy).ln(cx, cy - hDb - 8, cx, cy + hDb + 8);
        cotaH(P, cx - hD, cx + hD, cy - hDb - 9, cy - hDb - 2, 'D = ' + cm(D * 100));
        if (comBase) cotaH(P, cx - hDb, cx + hDb, cy - hDb - 18, cy - hDb - 2, 'Db = ' + cm(Db * 100));
        cotaH(P, cx - hD, cx - hD + cob * k, cy + hDb + 10, cy + hD, cm(cob * 100), 1.8);
        chamada(P, cx + rN1 * k * Math.cos(rad(40)), cy + rN1 * k * Math.sin(rad(40)), cx + hDb + 14, cy + hDb + 3, rotuloN1, 2.1);
        chamada(P, cx + rN2 * k * Math.cos(rad(-25)), cy + rN2 * k * Math.sin(rad(-25)), cx + hDb + 14, cy - hDb + 2, rotuloN2, 2.1);
      }
      tituloVista(P, 262, 408, 'PLANTA', esc);
    }

    // ---------------- ARMADURA (em escala) ----------------
    {
      if (S) {
        // N1: barra com pé, desenhada de pé
        const altN1 = Lenc + Gmax - 2 * cob, escN1 = menorEscala(altN1 * 1000, altN1 * 1000, 95, 95), kN1 = 1000 / escN1;
        const bx = 462, by = 470, pe = Math.max(0.2, n1Unit - altN1) * kN1;
        P.L('ARX-CV-Armadura').pl([[bx + pe, by], [bx, by], [bx, by + altN1 * kN1]], false, 0.5);
        cotaV(P, bx - 8, by, by + altN1 * kN1, bx, cm(altN1 * 100));
        cotaH(P, bx, bx + pe, by - 7, by, cm(pe / kN1 * 100), 1.8);
        P.L('ARX-GR-Texto').tx(bx + 6, by + altN1 * kN1 - 3, 2.2, 'N1 – ' + nBar + ' Ø' + fmt(X.phi1, 1), 'left', 'baseline').tx(bx + 6, by + altN1 * kN1 - 7, 2.0, 'C = ' + cm(n1Unit * 100) + ' (PÉ DE ' + cm(pe / kN1 * 100) + ')', 'left', 'baseline').tx(bx + 6, by + altN1 * kN1 - 11, 2.0, 'TRANSPASSE = ' + cm(X.transp1), 'left', 'baseline');
        tituloVista(P, 482, 452, 'ARMADURA N1', escN1);
        // N2: estribo quadrado
        const lado = D - 2 * cob - phi2, escN2 = menorEscala(lado * 1000, lado * 1000, 62, 62), kN2 = 1000 / escN2, cx = 565, cy = 512;
        P.L('ARX-CV-Armadura').rect(cx - lado * kN2 / 2, cy - lado * kN2 / 2, cx + lado * kN2 / 2, cy + lado * kN2 / 2);
        cotaH(P, cx - lado * kN2 / 2, cx + lado * kN2 / 2, cy - lado * kN2 / 2 - 8, cy - lado * kN2 / 2 - 1, cm(lado * 100));
        P.L('ARX-GR-Texto').tx(cx + lado * kN2 / 2 + 6, cy + 3, 2.2, rotuloN2, 'left', 'baseline').tx(cx + lado * kN2 / 2 + 6, cy - 1.5, 2.0, 'C = ' + cm(n2CompCm), 'left', 'baseline');
        tituloVista(P, 579, 452, 'ARMADURA N2', escN2);
        // N3/N4: barra reta da malha
        const b = X.base, cbar = Db - 2 * cob, escB = menorEscala(cbar * 1000, 1, 150, 1), kB = 1000 / escB, bx2 = 470, by2 = 425;
        P.L('ARX-CV-Armadura').pl([[bx2, by2], [bx2 + cbar * kB, by2]], false, 0.5);
        cotaH(P, bx2, bx2 + cbar * kB, by2 + 7, by2, 'C = ' + cm(cbar * 100));
        P.L('ARX-GR-Texto').tx(bx2, by2 + 14, 2.2, 'N3/N4 – ' + b.n + ' Ø' + fmt(b.phi, 1) + ' c/' + cm(b.esp) + ' POR DIREÇÃO', 'left', 'baseline').tx(bx2, by2 - 6, 1.9, 'TRANSPASSE N3 = ' + cm(b.t3) + ' / N4 = ' + cm(b.t4), 'left', 'baseline');
        tituloVista(P, 484, 400, 'ARMADURA N3 / N4', escB);
      } else {
        const escN1 = menorEscala(n1Unit * 1000, 1, 185, 1), kN1 = 1000 / escN1;
        const x1 = 455, y1 = 520, L1 = n1Unit * kN1;
        P.L('ARX-CV-Armadura').pl([[x1, y1], [x1 + L1, y1]], false, 0.5);
        P.L('ARX-GR-LTracejada').ln(x1 + L1 - X.transp1 / 100 * kN1, y1 - 3, x1 + L1, y1 - 3);
        P.L('ARX-GR-Texto').tx(x1 + L1 - X.transp1 / 200 * kN1, y1 - 7, 1.8, 'TRANSPASSE = ' + cm(X.transp1), 'center', 'baseline');
        cotaH(P, x1, x1 + L1, y1 + 8, y1, 'C = ' + cm(n1Unit * 100));
        P.L('ARX-GR-Texto').tx(x1, y1 + 15, 2.3, 'N1 – ' + nBar + ' Ø' + fmt(X.phi1, 1) + ' – BARRAS LONGITUDINAIS', 'left', 'baseline');
        tituloVista(P, 469, 497, 'ARMADURA N1', escN1);
        const dN2 = D - 2 * cob - phi2, escN2 = menorEscala(dN2 * 1000, dN2 * 1000, 62, 62), kN2 = 1000 / escN2;
        const cx = 505, cy = 448;
        P.L('ARX-CV-Armadura').ci(cx, cy, dN2 * kN2 / 2);
        cotaH(P, cx - dN2 * kN2 / 2, cx + dN2 * kN2 / 2, cy - dN2 * kN2 / 2 - 8, cy - dN2 * kN2 / 2 - 1, 'Ø ' + cm(dN2 * 100));
        P.L('ARX-GR-Texto').tx(cx + dN2 * kN2 / 2 + 8, cy + 3, 2.3, rotuloN2, 'left', 'baseline');
        P.tx(cx + dN2 * kN2 / 2 + 8, cy - 1.5, 2.1, 'C = ' + cm(n2CompCm) + ' (COM TRANSPASSE)', 'left', 'baseline');
        tituloVista(P, 469, 408, 'ARMADURA N2', escN2);
      }
      P.L('ARX-GR-Texto');
      [['COBRIMENTO', cm(cob * 100) + ' cm'], ['CONCRETO', 'fck ≥ ' + M.fck_mpa + ' MPa'], ['AÇO', aco]].forEach((r, ii) => { P.tx(580, S ? 560 - ii * 4.2 : 462 - ii * 4.2, 2, r[0] + ': ' + r[1], 'left', 'baseline'); });
    }

    // ---------------- LOCAÇÃO DAS FUNDAÇÕES ----------------
    {
      const bt = num(geom.base_transversal_m, 6), bl = num(geom.base_longitudinal_m, 6), dl = num(geom.deflexao_graus, 0);
      const esc = menorEscala((bt + Db + 1.2) * 1000, (bl + Db + 1.2) * 1000, 160, 150), k = 1000 / esc;
      const cx = 332, cy = 300;
      const pes = [['A', -1, 1], ['B', 1, 1], ['C', 1, -1], ['D', -1, -1]];
      pes.forEach((e, ii) => {
        const nx = pes[(ii + 1) % 4];
        P.L('ARX-GR-LAuxiliar').ln(cx + e[1] * bt / 2 * k, cy + e[2] * bl / 2 * k, cx + nx[1] * bt / 2 * k, cy + nx[2] * bl / 2 * k);
        P.ln(cx + e[1] * bt / 2 * k, cy + e[2] * bl / 2 * k, cx, cy);
      });
      pes.forEach(e => {
        const px = cx + e[1] * bt / 2 * k, py = cy + e[2] * bl / 2 * k;
        if (S) {
          P.L('ARX-CV-Contorno').rect(px - Db * k / 2, py - Db * k / 2, px + Db * k / 2, py + Db * k / 2);
          P.L('ARX-GR-LTracejada').rect(px - D * k / 2, py - D * k / 2, px + D * k / 2, py + D * k / 2);
        } else {
          P.L('ARX-CV-Contorno').ci(px, py, D * k / 2);
          if (comBase) P.L('ARX-GR-LTracejada').ci(px, py, Db * k / 2);
        }
        cantoneira(P, px, py, Math.max(aba * k, 1.2), Math.max(espStub * k, 0.25), e[1] * e[2] > 0 ? -45 : 45);
        P.L('ARX-GR-Texto').tx(px + (e[1] > 0 ? 1 : -1) * (Db * k / 2 + 2), py + (e[2] > 0 ? 1 : -1) * (Db * k / 2 + 2) - (e[2] > 0 ? 0 : 2), 2.4, 'PÉ "' + e[0] + '"', e[1] > 0 ? 'left' : 'right', 'baseline');
      });
      // eixos: bissetriz (horizontal) e diretriz(es) da LT
      const ext = Math.max(bt, bl) / 2 * k + Db * k / 2 + 14;
      P.L('ARX-GR-LCentro').ln(cx - ext, cy, cx + ext, cy);
      const dirs = dl > 0 ? [90 - dl / 2, 90 + dl / 2] : [90];
      dirs.forEach(a => P.ln(cx - ext * Math.cos(rad(a)), cy - ext * Math.sin(rad(a)), cx + ext * Math.cos(rad(a)), cy + ext * Math.sin(rad(a))));
      P.L('ARX-GR-Simbolo').ci(cx, cy, 2.2).ln(cx - 3.5, cy, cx + 3.5, cy).ln(cx, cy - 3.5, cx, cy + 3.5);
      P.L('ARX-GR-Texto').tx(cx + 3, cy - 8, 1.8, 'MARCO CENTRAL', 'left', 'baseline');
      P.tx(cx + ext, cy + 1.5, 1.8, 'BISSETRIZ DO ÂNGULO DA LINHA', 'right', 'baseline', 0);
      P.tx(cx - 1, cy + ext - 1, 1.8, 'DIRETRIZ DA LT', 'right', 'baseline', 90);
      cotaH(P, cx - bt / 2 * k, cx + bt / 2 * k, cy - bl / 2 * k - Db * k / 2 - 9, cy - bl / 2 * k, cm(bt * 100));
      cotaV(P, cx + bt / 2 * k + Db * k / 2 + 11, cy - bl / 2 * k, cy + bl / 2 * k, cx + bt / 2 * k, cm(bl * 100));
      tituloVista(P, 262, 218, 'LOCAÇÃO DAS FUNDAÇÕES', esc);
    }

    // ---------------- TABELA 2: LISTA DE FERRO POR FUNDAÇÃO ----------------
    {
      const lin = X.linhas, x0t = 440;
      // colunas: [cabeçalho, largura, valor(l)]; grupos: [título, nº de colunas]
      const colunas = S ? [
        ['G (cm)', 15, l => cm(l.G_cm)], ['H (m)', 14, l => fmt(l.H_m, 2)], ['CONCR. (m³)', 19, l => fmt(l.concreto_m3, 2)], ['ESCAV. (m³)', 19, l => fmt(l.escavacao_m3, 2)],
        ['REATERRO (m³)', 22, l => fmt(l.reaterro_m3, 2)],
        ['UNIT. (m)', 18, l => fmt(l.N1_unit_m, 2)], ['PESO (kgf)', 19, l => fmt(l.N1_kg, 0)],
        ['QUANT. n', 17, l => l.N2_qtd], ['PESO (kgf)', 19, l => fmt(l.N2_kg, 0)],
        ['N3 + N4 (kgf)', 24, l => fmt(l.base_kg, 0)], ['TOTAL (kgf)', 24, l => fmt(l.aco_total_kg, 0)],
      ] : [
        ['G (cm)', 17, l => cm(l.G_cm)], ['H (m)', 15, l => fmt(l.H_m, 2)], ['CONCR. (m³)', 20, l => fmt(l.concreto_m3, 2)], ['ESCAV. (m³)', 20, l => fmt(l.escavacao_m3, 2)],
        ['COMPR. (m)', 22, l => fmt(l.n1_comp_unit_m, 2)], ['PESO (kgf)', 16, l => fmt(l.n1_peso_kgf, 0)], ['COMPR. TOT. (m)', 22, l => fmt(l.n1_comp_total_m, 1)],
        ['QUANT. n', 16, l => l.n2_quantidade], ['COMPR. TOT. (m)', 24, l => fmt(l.n2_comp_total_m, 1)], ['PESO (kgf)', 22, l => fmt(l.n2_peso_kgf, 0)], ['TOTAL (kgf)', 26, l => fmt(l.peso_total_kgf, 0)],
      ];
      const gDim = S ? 5 : 4, gN1 = S ? 2 : 3, gN2 = S ? 2 : 3;     // colunas por grupo (dimensões, N1, N2); o resto é peso
      const w = colunas.map(c => c[1]), W = w.reduce((a, b) => a + b, 0);
      const topo = 208, hl = Math.min(5.4, (topo - 20 - 25) / (lin.length + 0.01));
      const yy = n => topo - 16 - n * hl;
      const xs = [x0t]; w.forEach(v => xs.push(xs[xs.length - 1] + v));
      const gx = [0, gDim, gDim + gN1, gDim + gN1 + gN2, colunas.length].map(j => xs[j]);
      P.L('FORMATO').tx(x0t + W / 2, topo + 3, 2.6, 'TABELA 2 – ' + torre + '-' + tipo + '-' + nome + ' – POR FUNDAÇÃO', 'center', 'baseline');
      P.rect(x0t, yy(lin.length), x0t + W, topo);
      P.ln(x0t, topo - 5, x0t + W, topo - 5).ln(x0t, topo - 16, x0t + W, topo - 16);
      xs.slice(1, -1).forEach(x => P.ln(x, yy(lin.length), x, topo - 16));
      gx.slice(1, -1).forEach(x => P.ln(x, topo - 16, x, topo));
      const gt = [[gx[0], gx[1], 'DIMENSÕES VARIÁVEIS E VOLUMES'], [gx[1], gx[3], 'LISTA DE FERRO POR FUNDAÇÃO'], [gx[3], gx[4], 'PESO']];
      P.L('ARX-GR-Texto');
      gt.forEach(g => P.tx((g[0] + g[1]) / 2, topo - 3.4, 1.6, g[2], 'center', 'baseline'));
      // subgrupos N1 / N2 (linha intermediária)
      P.L('FORMATO');
      const n1a = xs[gDim], n1b = xs[gDim + gN1], n2b = xs[gDim + gN1 + gN2];
      P.ln(n1a, topo - 10.5, n2b, topo - 10.5).ln(n1b, topo - 10.5, n1b, topo - 5);
      P.L('ARX-GR-Texto');
      P.tx((n1a + n1b) / 2, topo - 8.6, 1.6, 'N1 – ' + nBar + ' Ø' + fmt(X.phi1, 1), 'center', 'baseline');
      P.tx((n1b + n2b) / 2, topo - 8.6, 1.6, 'N2 – Ø' + fmt(X.phi2, 1) + ' – ' + cm(n2CompCm), 'center', 'baseline');
      colunas.forEach((c, j) => P.tx((xs[j] + xs[j + 1]) / 2, topo - 14.2, 1.4, c[0], 'center', 'baseline'));
      lin.forEach((l, n) => {
        const t = hl * 0.62;
        P.L('ARX-GR-Texto');
        colunas.forEach((c, j) => P.tx((xs[j] + xs[j + 1]) / 2, yy(n) - hl + (hl - t) / 2 + 0.2, Math.min(t, 2), c[2](l), 'center', 'baseline'));
        P.L('FORMATO').ln(x0t, yy(n + 1), x0t + W, yy(n + 1));
      });
      P.L('ARX-GR-Texto').tx(x0t, yy(lin.length) - 4, 1.7, 'N1 = ' + cm(n1Unit * 100) + ' cm (COMPRIMENTO UNITÁRIO PARA O G MÁXIMO); VOLUMES E PESOS TEÓRICOS.', 'left', 'baseline');
    }

    // rótulo do modelo
    P.L('ARX-GR-Texto').tx(0, A1.h + 10, 6, nomeF.toUpperCase() + ' – TORRE ' + torre + ' – SOLO ' + nome, 'left', 'baseline');
  }

  window.DxfFundacao = function (run, doc, geom) {
    if (!window.DxfWriter) throw new Error('modelo/dxf-writer.js não carregado');
    const ent = run.entrada, res = run.res, TB = run.ft === 'tcb', S = run.ft === 'sap';
    const d = new window.DxfWriter.Drawing();
    d.setUnits('Millimeters');
    d.addLineType('ACAD_ISO04W100', 'ISO long-dash dot', [12, -3, 0, -3]);
    d.addLineType('ACAD_ISO02W100', 'ISO dash', [12, -3]);
    LAYERS.forEach(l => d.addLayer(l[0], l[1], l[2]));
    const solos = res.solos.filter(n => res.resultados[n]);
    if (!solos.length) throw new Error('Nenhum solo calculado para desenhar.');
    const ctx = { run, ent, res, doc: doc || {}, geom: Object.assign({}, GEOM_PADRAO, geom || {}), S, TB, torre: run.torreNome, tipo: ent.tipo_fundacao, nomeF: run.tipo || (S ? 'Sapata' : TB ? 'Tubulão com base' : 'Tubulão sem base'), nSolos: solos.length };
    for (let i = 0; i < solos.length; i++) prancha(d, i, ctx);
    return d.toDxfString();
  };
  window.DxfFundacao.GEOM_PADRAO = GEOM_PADRAO;
})();
