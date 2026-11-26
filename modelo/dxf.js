// Desenhos de fundação em DXF — tubulão sem base / com base, uma prancha A1 (841 × 594 mm) por solo.
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
      ox, oy,
      L(nome) { d.setActiveLayer(nome); return P; },
      ln(x1, y1, x2, y2) { d.drawLine(ox + x1, oy + y1, ox + x2, oy + y2); return P; },
      pl(pts, fechada, larg) { d.drawPolyline(pts.map(p => [ox + p[0], oy + p[1]]), !!fechada, larg || 0, larg || 0); return P; },
      ci(x, y, r) { d.drawCircle(ox + x, oy + y, r); return P; },
      ar(x, y, r, a0, a1) { d.drawArc(ox + x, oy + y, r, a0, a1); return P; },
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

  // ============================================================== prancha ==============================================================
  function prancha(d, i, ctx) {
    const { run, ent, res, doc, geom, TB, torre, tipo, nomeF } = ctx;
    const nome = res.solos.filter(n => res.resultados[n])[i];
    const R = res.resultados[nome], Q = res.quantitativos[nome], g = ent.geometrias[nome], M = ent.materiais;
    const P = caneta(d, i * (A1.w + GAP), 0);

    // dados da fundação
    const D = g.diametro_m, Db = TB ? g.diametro_base_m : D, Lenc = g.comprimento_enterrado_m;
    const La = TB ? R.La_m : 0, Lb = TB ? R.Lb_m : 0;
    const Gmin = g.afloramento_min_m, Gmax = g.afloramento_max_m;
    const cob = M.cobrimento_cm / 100, phi1 = R.bitola_longitudinal_mm / 1000, phi2 = R.bitola_estribo_adotada_mm / 1000;
    const nBar = R.quantidade_barras, esp2 = R.espacamento_estribo_adotado_cm / 100;
    const stub = ent.stub, aba = num(geom.largura_aba_mm) / 1000, espStub = num(stub.espessura_mm) / 1000;
    const hStub = num(stub.altura_real_mm) / 1000, enterStub = num(stub.altura_enterrada_mm) / 1000;
    const thetaStub = Math.acos(1 / Math.max(1, num(stub.secante_alfa_longitudinal, 1)));
    const n2Comp = (/comp\.\s*([\d.,]+)\s*cm/i.exec(Q.n2 || '') || [])[1];
    const n2CompCm = n2Comp ? Number(String(n2Comp).replace(',', '.')) : (Math.PI * (D - 2 * cob) * 100 + 40);
    const n1Unit = Q.linhas.length ? Q.linhas[Q.linhas.length - 1].n1_comp_unit_m : (Lenc + Gmax - 2 * cob);

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
    const fyk = M.fyk_mpa, aco = fyk === 500 ? 'CA-50' : fyk === 600 ? 'CA-60' : 'fyk = ' + fyk + ' MPa';
    const soloTxt = (ent.solos.find(s => s.nome === nome) || {});
    const notas = [
      'DIMENSÕES EM CENTÍMETRO, BITOLAS EM MILÍMETROS, EXCETO ONDE INDICADO.',
      'AS FUNDAÇÕES DEVERÃO SER EXECUTADAS DE ACORDO COM A NBR-6118 E NBR-6122.',
      'CONCRETO ESTRUTURAL:\n   FCK ≥ ' + M.fck_mpa + ' MPa; A/C ≤ 0,6, AÇO: ' + aco + ';\n   COBRIMENTO = ' + M.cobrimento_cm + ' cm;\n   CONSUMO MÍNIMO DE CIMENTO ≥ 280 kg/m³.',
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
      'PARÂMETROS GEOTÉCNICOS PARA SOLO:\n   TIPO ' + nome + ': ÂNGULO DE ATRITO: ' + fmt(num(soloTxt.phi_graus), 0) + 'º; COESÃO: ' + fmt(num(soloTxt.coesao_kgf_m2), 0) + ' kgf/m²; PESO ESPECÍFICO: ' + fmt(num(soloTxt.gamma_kgf_m3), 0) + ' kgf/m³.',
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
        if (!TB) return D * k / 2;
        if (y < yb + Lb * k) return Db * k / 2;
        if (y < yb + (Lb + La) * k) return (Db / 2 - (Db - D) / 2 * (y - yb - Lb * k) / (La * k)) * k;
        return D * k / 2;
      };
      // terreno e hachura
      const wLado = 38, xe = xc - Db * k / 2 - wLado, xd = xc + Db * k / 2 + wLado;
      P.L('ARX-GR-Solo').ln(xe - 6, yt, xd + 6, yt);
      hachuraSolo(P, xe, xd, yb - 4, yt, 3.2, (x, yy) => yy >= yb && Math.abs(x - xc) < rCon(yy));
      P.L('ARX-GR-Solo').ln(xe, yb - 4, xe, yt).ln(xd, yb - 4, xd, yt);
      // concreto
      const perfil = [];
      if (TB) {
        const rb = Db * k / 2, rf = D * k / 2;
        perfil.push([xc - rb, yb], [xc + rb, yb], [xc + rb, yb + Lb * k], [xc + rf, yb + (Lb + La) * k], [xc + rf, ytop], [xc - rf, ytop], [xc - rf, yb + (Lb + La) * k], [xc - rb, yb + Lb * k]);
      } else {
        const r = D * k / 2; perfil.push([xc - r, yb], [xc + r, yb], [xc + r, ytop], [xc - r, ytop]);
      }
      P.L('ARX-CV-Contorno').pl(perfil, true, 0.35);
      P.L('ARX-GR-LTracejada').ln(xc - D * k / 2 - 6, yt + Gmin * k, xc + D * k / 2 + 6, yt + Gmin * k);
      P.L('ARX-GR-LCentro').ln(xc, yb - 10, xc, ytop + hStub * k + 8);
      // armadura: barras N1 (laterais) e estribos N2
      const rN1 = (D / 2 - cob - phi2 - phi1 / 2) * k, rN2 = (D / 2 - cob - phi2 / 2) * k;
      P.L('ARX-CV-Armadura').pl([[xc - rN1, yb + cob * k], [xc - rN1, ytop - cob * k]], false, 0.3).pl([[xc + rN1, yb + cob * k], [xc + rN1, ytop - cob * k]], false, 0.3);
      for (let z = ytop - cob * k; z >= yb + cob * k - 1e-6; z -= esp2 * k) P.ln(xc - rN2, z, xc + rN2, z);
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
      cotaH(P, xc - D * k / 2, xc + D * k / 2, ytop + hStub * k * Math.cos(thetaStub) + 7, ytop, 'D = ' + cm(D * 100));
      if (TB) {
        cotaH(P, xc - Db * k / 2, xc + Db * k / 2, yb - 8, yb, 'Db = ' + cm(Db * 100));
        cotaV(P, xc - Db * k / 2 - 16, yb, yb + Lb * k, xc - Db * k / 2, cm(Lb * 100));
        cotaV(P, xc - Db * k / 2 - 16, yb + Lb * k, yb + (Lb + La) * k, xc - Db * k / 2, cm(La * 100));
      }
      // legendas
      const ref = (z) => [xc + rN1, z];
      chamada(P, xc + rN1, yt + Gmax * k * 0.55, xc + D * k / 2 + 24, yt + Gmax * k * 0.55 + 6, 'N1 – ' + nBar + ' Ø' + fmt(R.bitola_longitudinal_mm, 1) + ' – C = ' + cm(n1Unit * 100), 2.1);
      chamada(P, xc + rN2, yb + Lenc * k * 0.4, xc + D * k / 2 + 24, yb + Lenc * k * 0.4 + 6, 'N2 – Ø' + fmt(R.bitola_estribo_adotada_mm, 1) + ' c/' + cm(esp2 * 100) + ' – C = ' + cm(n2CompCm), 2.1);
      chamada(P, ...q(hh * 0.7, aw / 2), xc + D * k / 2 + 24, ytop + hh * 0.7 * Math.cos(thetaStub) + 3, 'STUB L ' + fmt(aba * 1000, 0) + 'x' + fmt(aba * 1000, 0) + 'x' + fmt(espStub * 1000, 1).replace(/,0$/, '') + ' mm', 2.1);
      P.L('ARX-GR-Simbolo').pl([[xe - 6, yt + 0.1], [xe - 11, yt + 4.5], [xe - 1, yt + 4.5]], true);
      P.L('ARX-GR-Texto').tx(xe - 12, yt + 6, 1.8, 'NÍVEL DO TERRENO', 'left', 'baseline');
      tituloVista(P, 62, 22, 'ELEVAÇÃO', esc);
    }

    // ---------------- PLANTA ----------------
    {
      const esc = menorEscala(Db * 1000 + 600, Db * 1000 + 600, 118, 118);
      const k = 1000 / esc, cx = 330, cy = 483;
      P.L('ARX-CV-Contorno').ci(cx, cy, D * k / 2);
      if (TB) { P.L('ARX-GR-LTracejada').ci(cx, cy, Db * k / 2); }
      const rN2 = (D / 2 - cob - phi2 / 2) * k, rN1 = (D / 2 - cob - phi2 - phi1 / 2) * k;
      P.L('ARX-CV-Armadura').ci(cx, cy, rN2);
      for (let b = 0; b < nBar; b++) { const a = 2 * Math.PI * b / nBar; P.ci(cx + rN1 * Math.cos(a), cy + rN1 * Math.sin(a), Math.max(phi1 * k / 2, 0.4)); }
      cantoneira(P, cx, cy, aba * k, espStub * k, 45);
      P.L('ARX-GR-LCentro').ln(cx - Db * k / 2 - 8, cy, cx + Db * k / 2 + 8, cy).ln(cx, cy - Db * k / 2 - 8, cx, cy + Db * k / 2 + 8);
      cotaH(P, cx - D * k / 2, cx + D * k / 2, cy - Db * k / 2 - 9, cy - Db * k / 2 - 2, 'D = ' + cm(D * 100));
      if (TB) cotaH(P, cx - Db * k / 2, cx + Db * k / 2, cy - Db * k / 2 - 18, cy - Db * k / 2 - 2, 'Db = ' + cm(Db * 100));
      cotaH(P, cx - D * k / 2, cx - D * k / 2 + cob * k, cy + Db * k / 2 + 10, cy + D * k / 2, cm(cob * 100), 1.8);
      const ang = rad(40);
      chamada(P, cx + rN1 * Math.cos(ang), cy + rN1 * Math.sin(ang), cx + Db * k / 2 + 14, cy + Db * k / 2 + 3, 'N1 – ' + nBar + ' Ø' + fmt(R.bitola_longitudinal_mm, 1), 2.1);
      chamada(P, cx + rN2 * Math.cos(rad(-25)), cy + rN2 * Math.sin(rad(-25)), cx + Db * k / 2 + 14, cy - Db * k / 2 + 2, 'N2 – Ø' + fmt(R.bitola_estribo_adotada_mm, 1) + ' c/' + cm(esp2 * 100), 2.1);
      tituloVista(P, 262, 408, 'PLANTA', esc);
    }

    // ---------------- ARMADURA (N1 e N2 em escala) ----------------
    {
      const escN1 = menorEscala(n1Unit * 1000, 1, 185, 1), kN1 = 1000 / escN1;
      const x1 = 455, y1 = 520, L1 = n1Unit * kN1;
      P.L('ARX-CV-Armadura').pl([[x1, y1], [x1 + L1, y1]], false, 0.5);
      P.L('ARX-GR-LTracejada').ln(x1 + L1 - R.transpasse_cm / 100 * kN1, y1 - 3, x1 + L1, y1 - 3);
      P.L('ARX-GR-Texto').tx(x1 + L1 - R.transpasse_cm / 200 * kN1, y1 - 7, 1.8, 'TRANSPASSE = ' + cm(R.transpasse_cm), 'center', 'baseline');
      cotaH(P, x1, x1 + L1, y1 + 8, y1, 'C = ' + cm(n1Unit * 100));
      P.L('ARX-GR-Texto').tx(x1, y1 + 15, 2.3, 'N1 – ' + nBar + ' Ø' + fmt(R.bitola_longitudinal_mm, 1) + ' – ' + (TB ? 'BARRAS LONGITUDINAIS' : 'BARRAS LONGITUDINAIS'), 'left', 'baseline');
      tituloVista(P, 469, 497, 'ARMADURA N1', escN1);
      const dN2 = D - 2 * cob - phi2, escN2 = menorEscala(dN2 * 1000, dN2 * 1000, 62, 62), kN2 = 1000 / escN2;
      const cx = 505, cy = 448;
      P.L('ARX-CV-Armadura').ci(cx, cy, dN2 * kN2 / 2);
      cotaH(P, cx - dN2 * kN2 / 2, cx + dN2 * kN2 / 2, cy - dN2 * kN2 / 2 - 8, cy - dN2 * kN2 / 2 - 1, 'Ø ' + cm(dN2 * 100));
      P.L('ARX-GR-Texto').tx(cx + dN2 * kN2 / 2 + 8, cy + 3, 2.3, 'N2 – Ø' + fmt(R.bitola_estribo_adotada_mm, 1) + ' c/' + cm(esp2 * 100), 'left', 'baseline');
      P.tx(cx + dN2 * kN2 / 2 + 8, cy - 1.5, 2.1, 'C = ' + cm(n2CompCm) + ' (COM TRANSPASSE)', 'left', 'baseline');
      tituloVista(P, 469 + 0, 408, 'ARMADURA N2', escN2);
      P.L('ARX-GR-Texto');
      [['COBRIMENTO', cm(cob * 100) + ' cm'], ['CONCRETO', 'fck ≥ ' + M.fck_mpa + ' MPa'], ['AÇO', aco]].forEach((r, ii) => { P.tx(580, 462 - ii * 4.2, 2, r[0] + ': ' + r[1], 'left', 'baseline'); });
    }

    // ---------------- LOCAÇÃO DAS FUNDAÇÕES ----------------
    {
      const bt = num(geom.base_transversal_m, 6), bl = num(geom.base_longitudinal_m, 6), dl = num(geom.deflexao_graus, 0);
      const esc = menorEscala((bt + Db + 1.2) * 1000, (bl + Db + 1.2) * 1000, 160, 150), k = 1000 / esc;
      const cx = 332, cy = 300;
      const pes = [['A', -1, 1], ['B', 1, 1], ['C', 1, -1], ['D', -1, -1]];
      P.L('ARX-GR-LAuxiliar');
      pes.forEach((e, ii) => {
        const nx = pes[(ii + 1) % 4];
        P.L('ARX-GR-LAuxiliar').ln(cx + e[1] * bt / 2 * k, cy + e[2] * bl / 2 * k, cx + nx[1] * bt / 2 * k, cy + nx[2] * bl / 2 * k);
        P.ln(cx + e[1] * bt / 2 * k, cy + e[2] * bl / 2 * k, cx, cy);
      });
      pes.forEach(e => {
        const px = cx + e[1] * bt / 2 * k, py = cy + e[2] * bl / 2 * k;
        P.L('ARX-CV-Contorno').ci(px, py, D * k / 2);
        if (TB) P.L('ARX-GR-LTracejada').ci(px, py, Db * k / 2);
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
      const lin = Q.linhas, x0t = 440, w = [17, 15, 20, 20, 22, 16, 22, 16, 24, 22, 26], W = w.reduce((a, b) => a + b, 0);
      const topo = 208, hl = Math.min(5.4, (topo - 20 - 25) / (lin.length + 0.01));
      const yy = (n) => topo - 16 - n * hl;          // linha n de dados
      const xs = [x0t]; w.forEach(v => xs.push(xs[xs.length - 1] + v));
      P.L('FORMATO').tx(x0t + W / 2, topo + 3, 2.6, 'TABELA 2 – ' + torre + '-' + tipo + '-' + nome + ' – POR FUNDAÇÃO', 'center', 'baseline');
      P.rect(x0t, yy(lin.length), x0t + W, topo);
      P.ln(x0t, topo - 5, x0t + W, topo - 5).ln(x0t, topo - 16, x0t + W, topo - 16);
      xs.slice(1, -1).forEach((x, j) => { P.ln(x, yy(lin.length), x, j < 3 || j === 9 ? topo - 5 + (j < 3 ? 0 : 0) : topo - 5); });
      xs.slice(1, -1).forEach((x, j) => P.ln(x, yy(lin.length), x, topo - 16));
      // grupos
      P.L('ARX-GR-Texto');
      P.tx((xs[0] + xs[4]) / 2, topo - 3.4, 1.7, 'DIMENSÕES VARIÁVEIS E VOLUMES', 'center', 'baseline');
      P.tx((xs[4] + xs[10]) / 2, topo - 3.4, 1.7, 'LISTA DE FERRO POR FUNDAÇÃO', 'center', 'baseline');
      P.tx((xs[10] + xs[11]) / 2, topo - 3.4, 1.5, 'PESO', 'center', 'baseline');
      P.L('FORMATO').ln(xs[4], topo - 5, xs[4], topo).ln(xs[10], topo - 5, xs[10], topo);
      P.ln(xs[4], topo - 10.5, xs[7], topo - 10.5).ln(xs[7], topo - 10.5, xs[10], topo - 10.5);
      P.L('ARX-GR-Texto');
      P.tx((xs[4] + xs[7]) / 2, topo - 8.6, 1.6, 'N1 – ' + nBar + ' Ø' + fmt(R.bitola_longitudinal_mm, 1), 'center', 'baseline');
      P.tx((xs[7] + xs[10]) / 2, topo - 8.6, 1.6, 'N2 – Ø' + fmt(R.bitola_estribo_adotada_mm, 1) + ' – ' + cm(n2CompCm), 'center', 'baseline');
      const cab = ['G (cm)', 'H (m)', 'CONCR. (m³)', 'ESCAV. (m³)', 'COMPR. (m)', 'PESO (kgf)', 'COMPR. TOT. (m)', 'QUANT. n', 'COMPR. TOT. (m)', 'PESO (kgf)', 'TOTAL (kgf)'];
      cab.forEach((c, j) => P.tx((xs[j] + xs[j + 1]) / 2, topo - 14.2, 1.45, c, 'center', 'baseline'));
      lin.forEach((l, n) => {
        const v = [cm(l.G_cm), fmt(l.H_m, 2), fmt(l.concreto_m3, 2), fmt(l.escavacao_m3, 2), fmt(l.n1_comp_unit_m, 2), fmt(l.n1_peso_kgf, 0), fmt(l.n1_comp_total_m, 1), l.n2_quantidade, fmt(l.n2_comp_total_m, 1), fmt(l.n2_peso_kgf, 0), fmt(l.peso_total_kgf, 0)];
        const t = hl * 0.62;
        P.L('ARX-GR-Texto');
        v.forEach((s, j) => P.tx((xs[j] + xs[j + 1]) / 2, yy(n) - hl + (hl - t) / 2 + 0.2, Math.min(t, 2), s, 'center', 'baseline'));
        P.L('FORMATO').ln(x0t, yy(n + 1), x0t + W, yy(n + 1));
      });
      P.L('ARX-GR-Texto').tx(x0t, yy(lin.length) - 4, 1.7, 'N1 = ' + cm(n1Unit * 100) + ' cm (COMPRIMENTO UNITÁRIO PARA O G MÁXIMO); VOLUMES E PESOS TEÓRICOS.', 'left', 'baseline');
    }

    // rótulo do modelo
    P.L('ARX-GR-Texto').tx(0, A1.h + 10, 6, nomeF.toUpperCase() + ' – TORRE ' + torre + ' – SOLO ' + nome, 'left', 'baseline');
  }

  window.DxfFundacao = function (run, doc, geom) {
    if (!window.DxfWriter) throw new Error('modelo/dxf-writer.js não carregado');
    const ent = run.entrada, res = run.res, TB = run.ft === 'tcb';
    const d = new window.DxfWriter.Drawing();
    d.setUnits('Millimeters');
    d.addLineType('ACAD_ISO04W100', 'ISO long-dash dot', [12, -3, 0, -3]);
    d.addLineType('ACAD_ISO02W100', 'ISO dash', [12, -3]);
    LAYERS.forEach(l => d.addLayer(l[0], l[1], l[2]));
    const solos = res.solos.filter(n => res.resultados[n]);
    if (!solos.length) throw new Error('Nenhum solo calculado para desenhar.');
    const ctx = { run, ent, res, doc: doc || {}, geom: Object.assign({}, GEOM_PADRAO, geom || {}), TB, torre: run.torreNome, tipo: ent.tipo_fundacao, nomeF: run.tipo || (TB ? 'Tubulão com base' : 'Tubulão sem base'), nSolos: solos.length };
    for (let i = 0; i < solos.length; i++) prancha(d, i, ctx);
    return d.toDxfString();
  };
  window.DxfFundacao.GEOM_PADRAO = GEOM_PADRAO;
})();
