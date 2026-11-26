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

    // ============ VISTAS (arranjo do modelo Autoportante: elevação, seção A, armadura, seção B, detalhe, planta, locação, tabela) ============
    const thetaLong = thetaStub, thetaTrans = Math.acos(1 / Math.max(1, num(stub.secante_alfa_transversal, 1)));
    const bt = num(geom.base_transversal_m, 6), bl = num(geom.base_longitudinal_m, 6), dl = num(geom.deflexao_graus, 0);
    const dxM = bt / 2, dyM = bl / 2;                      // distâncias do eixo do pé ao marco central (transversal / longitudinal)
    const escCorte = menorEscala(Db * 1000, (Lenc + Gmax + Math.max(0, hStub - enterStub) + 0.1) * 1000, 95, 262);
    const kc = 1000 / escCorte;                            // mm de papel por metro real, nas vistas em corte
    const yb = 290, yt = yb + Lenc * kc, ytop = yt + Gmax * kc;
    const rCon = y => {                                    // meia largura do concreto na cota y (papel)
      if (!comBase) return D * kc / 2;
      if (y < yb + Lb * kc) return Db * kc / 2;
      if (y < yb + (Lb + La) * kc) return (Db / 2 - (Db - D) / 2 * (y - yb - Lb * kc) / (La * kc)) * kc;
      return D * kc / 2;
    };
    const base = X.base;
    const rotBase = base ? { n: base.n, txt: base.n + ' Ø' + fmt(base.phi, 1) + ' c/' + cm(base.esp) } : null;

    // armadura do fuste (e malhas da base, na sapata) desenhada em corte, com eixo em xc
    const armaduraCorte = xc => {
      const x1 = rN1 * kc, x2 = rN2 * kc;
      const zFundo = yb + cob * kc, zTopo = ytop - cob * kc, zEstrFim = S ? yb + (Lb + La) * kc : zFundo;
      P.L('ARX-CV-Armadura');
      if (S) {                                              // N1 com pé apoiado na malha inferior (N4)
        const pe = Math.max(0.2, n1Unit - (Lenc + Gmax - 2 * cob)) * kc;
        P.pl([[xc - x1 - pe, zFundo], [xc - x1, zFundo], [xc - x1, zTopo]], false, 0.3).pl([[xc + x1 + pe, zFundo], [xc + x1, zFundo], [xc + x1, zTopo]], false, 0.3);
      } else {
        P.pl([[xc - x1, zFundo], [xc - x1, zTopo]], false, 0.3).pl([[xc + x1, zFundo], [xc + x1, zTopo]], false, 0.3);
      }
      for (let z = zTopo; z >= zEstrFim - 1e-6; z -= esp2 * kc) P.ln(xc - x2, z, xc + x2, z);
      if (S) {                                              // malhas: N4 embaixo e N3 no topo da laje de borda
        const rb = (Db / 2 - cob) * kc, zN4 = yb + cob * kc + 0.2, zN3 = yb + (Lb - cob) * kc - 0.2, rr = Math.max(base.phi / 2000 * kc, 0.35);
        P.ln(xc - rb, zN4 + 0.6, xc + rb, zN4 + 0.6).ln(xc - rb, zN3, xc + rb, zN3);
        for (let j = 0; j < base.n; j++) { const px = xc - rb + j * (2 * rb / Math.max(1, base.n - 1)); P.ci(px, zN4 - 0.2, rr).ci(px, zN3 - 0.7, rr); }
      }
    };

    // corte da fundação: terreno, concreto, stub, cotas, distância ao marco central
    const corte = (xc, opt) => {
      const wLado = 14, xe = xc - Db * kc / 2 - wLado, xd = xc + Db * kc / 2 + wLado, xm = xc - 88, caixas = [];
      const rotS = [];
      if (opt.arm && S) {                                   // legendas das malhas, à esquerda, sobre o solo (abre espaço na hachura)
        const xt = xc - Db * kc / 2 - 6, tN = 'N4 – ' + rotBase.txt, tN3 = 'N3 – ' + rotBase.txt;
        rotS.push([xc - (Db / 2 - cob) * kc * 0.6, yb + cob * kc, xt, yb + 9, tN], [xc - (Db / 2 - cob) * kc * 0.75, yb + (Lb - cob) * kc, xt, yb + Lb * kc + 7, tN3]);
        rotS.forEach(r => caixas.push([r[2] - 6 - 1.5 * r[4].length, r[3] - 3, r[2] + 1, r[3] + 3]));
      }
      P.L('ARX-GR-Solo').ln(xm - 6, yt, xe, yt).ln(xd, yt, xd + 6, yt);
      P.L('ARX-GR-Solo').ln(xe, yt, xd, yt);
      P.L('ARX-GR-Simbolo').ln((xm + xe) / 2 - 1.5, yt - 2.5, (xm + xe) / 2 + 0.5, yt + 2.5).ln((xm + xe) / 2 + 0.5, yt - 2.5, (xm + xe) / 2 + 2.5, yt + 2.5);   // interrupção do terreno
      hachuraSolo(P, xe, xd, yb - 4, yt, 3.2, (x, yy) => (yy >= yb && Math.abs(x - xc) < rCon(yy)) || caixas.some(c => x >= c[0] && x <= c[2] && yy >= c[1] && yy <= c[3]));
      P.L('ARX-GR-Solo').ln(xe, yb - 4, xe, yt).ln(xd, yb - 4, xd, yt);
      const perfil = [];
      if (comBase) {
        const rb = Db * kc / 2, rf = D * kc / 2;
        perfil.push([xc - rb, yb], [xc + rb, yb], [xc + rb, yb + Lb * kc], [xc + rf, yb + (Lb + La) * kc], [xc + rf, ytop], [xc - rf, ytop], [xc - rf, yb + (Lb + La) * kc], [xc - rb, yb + Lb * kc]);
      } else { const r = D * kc / 2; perfil.push([xc - r, yb], [xc + r, yb], [xc + r, ytop], [xc - r, ytop]); }
      P.L('ARX-CV-Contorno').pl(perfil, true, 0.35);
      P.L('ARX-GR-LTracejada').ln(xc - D * kc / 2 - 6, yt + Gmin * kc, xc + D * kc / 2 + 6, yt + Gmin * kc);
      if (opt.arm) armaduraCorte(xc);
      // stub (inclinado para fora, isto é, para longe do marco central)
      const th = opt.theta, aw = aba * kc, hh = hStub * kc, ex = enterStub * kc;
      const b0 = [xc, ytop - ex], u = [Math.sin(th), Math.cos(th)], pp = [Math.cos(th), -Math.sin(th)];
      const q = (a, b) => [b0[0] + u[0] * a + pp[0] * b, b0[1] + u[1] * a + pp[1] * b];
      P.L('STUB').pl([q(0, -aw / 2), q(0, aw / 2), q(hh, aw / 2), q(hh, -aw / 2)], true, 0.3);
      const yTopStub = q(hh, 0)[1];
      // eixos: da fundação e do marco central
      P.L('ARX-GR-LCentro').ln(xc, yb - 10, xc, yTopStub + 8).ln(xm, yb - 10, xm, yTopStub + 22);
      P.L('ARX-GR-Texto').tx(xm - 2, yTopStub - 30, 1.8, 'MARCO CENTRAL', 'center', 'baseline', 90);
      // distância ao marco central (com interrupção, pois o desenho está em escala só na fundação)
      const yd = yTopStub + 16, xmid = (xm + xc) / 2;
      cotaH(P, xm, xc, yd, yd - 7, opt.rotuloDist + ' = ' + cm(opt.dist * 100), 2.0);
      P.L('ARX-GR-Cota').ln(xmid - 3, yd - 1.8, xmid - 0.6, yd + 1.8).ln(xmid + 0.6, yd - 1.8, xmid + 3, yd + 1.8);
      // cotas verticais e de largura, à direita
      const bd = xc + Db * kc / 2;
      if (comBase) {
        cotaV(P, bd + 9, yb, yb + Lb * kc, bd, cm(Lb * 100), 1.8);
        cotaV(P, bd + 9, yb + Lb * kc, yb + (Lb + La) * kc, bd, cm(La * 100), 1.8);
        cotaV(P, bd + 9, yb + (Lb + La) * kc, yt, xc + D * kc / 2, cm((Lenc - Lb - La) * 100), 1.8);
        cotaH(P, xc - Db * kc / 2, xc + Db * kc / 2, yb - 8, yb, Dbn + ' = ' + cm(Db * 100));
      }
      cotaV(P, bd + 19, yt, yt + Gmin * kc, xc + D * kc / 2 + 4, 'G mín = ' + cm(Gmin * 100), 1.9);
      cotaV(P, bd + 28, yt, ytop, xc + D * kc / 2 + 4, 'G máx = ' + cm(Gmax * 100), 1.9);
      cotaV(P, bd + 37, yb, yt, bd + 37, 'L = ' + cm(Lenc * 100), 1.9);
      cotaV(P, bd + 46, yb, ytop, bd + 46, 'H máx = ' + cm((Lenc + Gmax) * 100), 1.9);
      cotaH(P, xc - D * kc / 2, xc + D * kc / 2, ytop - 14, ytop - 8, Dn + ' = ' + cm(D * 100), 1.8);
      // legendas (à esquerda, entre o marco central e a fundação)
      const xt = xc - D * kc / 2 - 6;
      const yS = Math.min(ytop - 24, q(hh * 0.5, 0)[1]);
      if (opt.arm) {
        const yN2 = yt + Math.max(4, Gmax * kc * 0.3), yN1 = yN2 + 9;
        chamada(P, xc - rN1 * kc, yN1 - 3, xt - 14, yN1, rotuloN1 + ' – C = ' + cm(n1Unit * 100), 2.0);
        chamada(P, xc - rN2 * kc, yN2 - 3, xt - 14, yN2, rotuloN2 + ' – C = ' + cm(n2CompCm), 2.0);
        rotS.forEach(r => chamada(P, r[0], r[1], r[2], r[3], r[4], 2.0));
      }
      chamada(P, ...q(hh * 0.5, -aw / 2), xt - 14, ytop + 4, 'STUB L ' + fmt(aba * 1000, 0) + 'x' + fmt(aba * 1000, 0) + 'x' + fmt(espStub * 1000, 1).replace(/,0$/, '') + ' mm', 2.0);
      void yS;
      P.L('ARX-GR-Simbolo').pl([[xe - 4, yt + 0.1], [xe - 9, yt + 4.5], [xe + 1, yt + 4.5]], true);
      P.L('ARX-GR-Texto').tx(xe - 10, yt + 6, 1.7, 'NÍVEL DO TERRENO', 'right', 'baseline');
      tituloVista(P, xc - 40, 262, opt.titulo, escCorte);
    };
    corte(130, { titulo: 'ELEVAÇÃO', theta: thetaLong, dist: dyM, rotuloDist: 'DIST. AO MARCO CENTRAL (LONG.)', arm: false });
    corte(335, { titulo: 'SEÇÃO A', theta: thetaTrans, dist: dxM, rotuloDist: 'DIST. AO MARCO CENTRAL (TRANSV.)', arm: true });

    // ---------------- ARMADURA (gaiola, na mesma escala dos cortes) ----------------
    {
      const xc = 468;
      armaduraCorte(xc);
      const zFundo = yb + cob * kc, zTopo = ytop - cob * kc;
      P.L('ARX-GR-LCentro').ln(xc, yb - 10, xc, ytop + 6);
      cotaV(P, xc - rN1 * kc - 12, zFundo, zTopo, xc - rN1 * kc - 4, 'N1 – C = ' + cm(n1Unit * 100), 1.9);
      const zE1 = ytop - cob * kc, zE2 = zE1 - esp2 * kc;
      cotaV(P, xc + rN2 * kc + 9, zE2, zE1, xc + rN2 * kc + 1, 'c/' + cm(esp2 * 100), 1.7);
      const xt = xc + rN2 * kc + 22;
      chamada(P, xc + rN1 * kc, ytop - 30 * kc / 20 - 10, xt, ytop - 20, rotuloN1, 2.0);
      chamada(P, xc + rN2 * kc, yt + Math.max(6, Gmax * kc * 0.3), xt, yt + Math.max(6, Gmax * kc * 0.3) + 4, rotuloN2 + ' (C = ' + cm(n2CompCm) + ')', 2.0);
      P.L('ARX-GR-Texto').tx(xt, ytop - 28, 1.8, 'TRANSPASSE N1 = ' + cm(X.transp1), 'left', 'baseline');
      if (S) {
        chamada(P, xc + (Db / 2 - cob) * kc * 0.6, yb + cob * kc, xt, yb + 10, 'N4 – ' + rotBase.txt, 2.0);
        chamada(P, xc + (Db / 2 - cob) * kc * 0.75, yb + (Lb - cob) * kc, xt, yb + Lb * kc + 8, 'N3 – ' + rotBase.txt, 2.0);
        P.L('ARX-GR-Texto').tx(xt, yb + 2, 1.7, 'TRANSP. N3 = ' + cm(base.t3) + ' / N4 = ' + cm(base.t4), 'left', 'baseline');
      }
      tituloVista(P, xc - 38, 262, 'ARMADURA', escCorte);
    }

    // ---------------- SEÇÃO B (corte com a armadura transversal) ----------------
    {
      const esc = menorEscala(D * 1000, D * 1000, 72, 72), k = 1000 / esc, cx = 584, cy = 522;
      const hD = D * k / 2;
      if (S) {
        P.L('ARX-CV-Contorno').rect(cx - hD, cy - hD, cx + hD, cy + hD);
        const h2 = rN2 * k; P.L('ARX-CV-Armadura').rect(cx - h2, cy - h2, cx + h2, cy + h2);
        const h1 = rN1 * k, pas = 8 * h1 / nBar;
        for (let n = 0; n < nBar; n++) {
          const t = n * pas; let px, py;
          if (t < 2 * h1) { px = -h1 + t; py = -h1; } else if (t < 4 * h1) { px = h1; py = -h1 + (t - 2 * h1); } else if (t < 6 * h1) { px = h1 - (t - 4 * h1); py = h1; } else { px = -h1; py = h1 - (t - 6 * h1); }
          P.ci(cx + px, cy + py, Math.max(phi1 * k / 2, 0.45));
        }
      } else {
        P.L('ARX-CV-Contorno').ci(cx, cy, hD);
        P.L('ARX-CV-Armadura').ci(cx, cy, rN2 * k);
        for (let b = 0; b < nBar; b++) { const a = 2 * Math.PI * b / nBar; P.ci(cx + rN1 * k * Math.cos(a), cy + rN1 * k * Math.sin(a), Math.max(phi1 * k / 2, 0.45)); }
      }
      cantoneira(P, cx, cy, aba * k, espStub * k, 45);
      P.L('ARX-GR-LCentro').ln(cx - hD - 7, cy, cx + hD + 7, cy).ln(cx, cy - hD - 7, cx, cy + hD + 7);
      cotaH(P, cx - hD, cx + hD, cy - hD - 9, cy - hD - 2, Dn + ' = ' + cm(D * 100));
      cotaH(P, cx - hD, cx - hD + cob * k, cy + hD + 9, cy + hD, cm(cob * 100), 1.7);
      chamada(P, cx + rN1 * k * Math.cos(rad(40)), cy + rN1 * k * Math.sin(rad(40)), cx + hD + 4, cy + hD + 4, rotuloN1, 1.9);
      chamada(P, cx + rN2 * k * Math.cos(rad(-30)), cy + rN2 * k * Math.sin(rad(-30)), cx + hD + 4, cy - hD * 0.2, rotuloN2, 1.9);
      tituloVista(P, 566, 470, 'SEÇÃO B', esc);
    }

    // ---------------- DETALHE 1 (stub: perfil em L) ----------------
    {
      const esc = menorEscala(aba * 1000, aba * 1000, 46, 46), k = 1000 / esc, cx = 592, cy = 405;
      cantoneira(P, cx, cy, aba * k, espStub * k, 0);
      cotaH(P, cx - aba * k / 2, cx + aba * k / 2, cy - aba * k / 2 - 8, cy - aba * k / 2, fmt(aba * 1000, 0) + ' mm', 1.8);
      cotaV(P, cx + aba * k / 2 + 8, cy - aba * k / 2, cy + aba * k / 2, cx + aba * k / 2, fmt(aba * 1000, 0), 1.8);
      cotaH(P, cx - aba * k / 2, cx - aba * k / 2 + espStub * k, cy + aba * k / 2 + 6, cy + aba * k / 2, fmt(espStub * 1000, 1).replace(/,0$/, ''), 1.6);
      P.L('ARX-GR-Texto').tx(cx, cy + aba * k / 2 + 11, 1.8, 'STUB – ALTURA REAL ' + fmt(hStub * 1000, 0) + ' mm', 'center', 'baseline').tx(cx, cy + aba * k / 2 + 14.5, 1.8, 'ENTERRADO ' + fmt(enterStub * 1000, 0) + ' mm', 'center', 'baseline');
      tituloVista(P, 566, 358, 'DETALHE 1', esc);
    }

    // ---------------- MALHA DA BASE (só sapata) ----------------
    if (S) {
      const esc = menorEscala(Db * 1000, Db * 1000, 70, 70), k = 1000 / esc, cx = 590, cy = 322, hDb = Db * k / 2, rb = (Db / 2 - cob) * k;
      P.L('ARX-CV-Contorno').rect(cx - hDb, cy - hDb, cx + hDb, cy + hDb);
      P.L('ARX-CV-Armadura');
      for (let j = 0; j < base.n; j++) { const t = -rb + j * (2 * rb / Math.max(1, base.n - 1)); P.ln(cx + t, cy - rb, cx + t, cy + rb).ln(cx - rb, cy + t, cx + rb, cy + t); }
      P.L('ARX-CV-Contorno').rect(cx - D * k / 2, cy - D * k / 2, cx + D * k / 2, cy + D * k / 2);
      cotaH(P, cx - hDb, cx + hDb, cy - hDb - 8, cy - hDb - 1, 'A = ' + cm(Db * 100), 1.8);
      chamada(P, cx + rb * 0.6, cy + rb, cx + hDb + 3, cy + hDb + 3, 'N3/N4 – ' + rotBase.txt, 1.8);
      tituloVista(P, 566, 282, 'MALHA DA BASE', esc);
    }

    // ---------------- PLANTA (locação de um pé em relação ao marco central) ----------------
    {
      const esc = menorEscala(dxM * 1000 + 700, dyM * 1000 + 700, 118, 150), k = 1000 / esc;
      const xM = 52, yM = 225, xF = xM + dxM * k, yF = yM - dyM * k;
      const hD = D * k / 2, hDb = Db * k / 2;
      P.L('ARX-GR-LCentro').ln(xM - 18, yM, xF + hDb + 24, yM);
      (dl > 0 ? [90 - dl / 2, 90 + dl / 2] : [90]).forEach(a => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)), L2 = (yM - yF) + hDb + 12; P.ln(xM + 14 * c, yM + 14 * s, xM - L2 * c, yM - L2 * s); });
      P.L('ARX-GR-Simbolo').ci(xM, yM, 2.2).ln(xM - 3.5, yM, xM + 3.5, yM).ln(xM, yM - 3.5, xM, yM + 3.5);
      P.L('ARX-GR-Texto').tx(xM + 4, yM + 3, 1.8, 'MARCO CENTRAL', 'left', 'baseline');
      P.L('ARX-GR-LAuxiliar').ln(xM, yM, xF, yF);
      if (S) {
        P.L('ARX-CV-Contorno').rect(xF - hDb, yF - hDb, xF + hDb, yF + hDb);
        P.L('ARX-GR-LTracejada').rect(xF - hD, yF - hD, xF + hD, yF + hD);
      } else {
        P.L('ARX-CV-Contorno').ci(xF, yF, hD);
        if (comBase) P.L('ARX-GR-LTracejada').ci(xF, yF, hDb);
      }
      cantoneira(P, xF, yF, Math.max(aba * k, 1.4), Math.max(espStub * k, 0.3), -45);
      P.L('ARX-GR-Texto').tx(xF + hDb + 3, yF + hDb + 2, 2.2, 'PÉ "A"', 'left', 'baseline');
      cotaH(P, xM, xF, yF - hDb - 9, yF - hDb - 1, cm(dxM * 100), 1.9);
      cotaV(P, xF + hDb + 12, yF, yM, xF + hDb + 1, cm(dyM * 100), 1.9);
      const dd = Math.hypot(dxM, dyM), ang = Math.atan2(yF - yM, xF - xM) * 180 / Math.PI;
      P.L('ARX-GR-Texto').tx((xM + xF) / 2 - 2.5 * Math.sin(rad(-ang)), (yM + yF) / 2 + 2.5 * Math.cos(rad(-ang)), 1.9, cm(dd * 100) + ' (DIAGONAL)', 'center', 'baseline', ang);
      tituloVista(P, 54, 25, 'PLANTA – LOCAÇÃO DO PÉ', esc);
    }

    // ---------------- LOCAÇÃO GERAL DAS FUNDAÇÕES ----------------
    {
      const esc = menorEscala((bt + Db + 1.2) * 1000, (bl + Db + 1.2) * 1000, 160, 170), k = 1000 / esc;
      const cx = 272, cy = 138;
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
      const ext = Math.max(bt, bl) / 2 * k + Db * k / 2 + 14;
      P.L('ARX-GR-LCentro').ln(cx - ext, cy, cx + ext, cy);
      (dl > 0 ? [90 - dl / 2, 90 + dl / 2] : [90]).forEach(a => P.ln(cx - ext * Math.cos(rad(a)), cy - ext * Math.sin(rad(a)), cx + ext * Math.cos(rad(a)), cy + ext * Math.sin(rad(a))));
      P.L('ARX-GR-Simbolo').ci(cx, cy, 2.2).ln(cx - 3.5, cy, cx + 3.5, cy).ln(cx, cy - 3.5, cx, cy + 3.5);
      P.L('ARX-GR-Texto').tx(cx + 3, cy - 8, 1.8, 'MARCO CENTRAL', 'left', 'baseline');
      P.tx(cx + ext, cy + 1.5, 1.8, 'BISSETRIZ DO ÂNGULO DA LINHA', 'right', 'baseline', 0);
      P.tx(cx - 1, cy + ext - 1, 1.8, 'DIRETRIZ DA LT', 'right', 'baseline', 90);
      cotaH(P, cx - bt / 2 * k, cx + bt / 2 * k, cy - bl / 2 * k - Db * k / 2 - 9, cy - bl / 2 * k, cm(bt * 100));
      cotaV(P, cx + bt / 2 * k + Db * k / 2 + 11, cy - bl / 2 * k, cy + bl / 2 * k, cx + bt / 2 * k, cm(bl * 100));
      tituloVista(P, 200, 25, 'LOCAÇÃO DAS FUNDAÇÕES', esc);
    }

    // ---------------- TABELA 2: LISTA DE FERRO POR FUNDAÇÃO ----------------
    {
      const lin = X.linhas, x0t = 380;
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
      const gDim = S ? 5 : 4, gN1 = S ? 2 : 3, gN2 = S ? 2 : 3;
      const w = colunas.map(c => c[1]), W = w.reduce((a, b) => a + b, 0);
      const topo = 232, hl = Math.min(5.4, (topo - 22 - 25) / (lin.length + 0.01));
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
