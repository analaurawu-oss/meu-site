# -*- coding: utf-8 -*-
"""Desenho DXF das fundações (tubulão sem base, com base e sapata) com objetos nativos do AutoCAD.

O gerador em JavaScript (modelo/dxf.js) calcula a geometria em escala e descreve o desenho como uma
lista de operações; este motor, que roda no Python do navegador (Pyodide) com a biblioteca ezdxf,
transforma essa lista em DXF:

  * cotas de verdade (DIMENSION linear, alinhada e angular), que medem a geometria e se atualizam quando
    o desenho é editado; uma família de estilos "COTA 1-n" converte o papel (mm) em valor real (cm);
  * blocos com atributos (carimbo A1, título de vista e marca de corte), editáveis por ATTEDIT;
  * chamadas em MULTILEADER, hachuras em HATCH, textos nos estilos Arial / ROMANS / style2.

A interface com o app é rodar(entrada_json) -> texto DXF.
"""
import io
import json
import math

import ezdxf
from ezdxf.enums import TextEntityAlignment
from ezdxf.math import Vec2

try:
    from ezdxf.render.mleader import ConnectionSide, TextAlignment as MLTextAlignment
except Exception:  # versões antigas da ezdxf
    ConnectionSide = None
    MLTextAlignment = None

CAMADAS = [
    ("ARX-CV-Contorno", 1, "CONTINUOUS"), ("ARX-CV-Armadura", 3, "CONTINUOUS"), ("STUB", 1, "CONTINUOUS"),
    ("ARX-GR-Cota", 12, "CONTINUOUS"), ("ARX-GR-Texto", 7, "CONTINUOUS"), ("ARX-GR-Solo", 4, "CONTINUOUS"),
    ("ARX-GR-Hachuras", 7, "CONTINUOUS"), ("ARX-GR-LCentro", 7, "ACAD_ISO04W100"), ("ARX-GR-LTracejada", 7, "ACAD_ISO02W100"),
    ("ARX-GR-LContínua", 2, "CONTINUOUS"), ("ARX-GR-LAuxiliar", 7, "CONTINUOUS"), ("ARX-GR-Simbolo", 7, "CONTINUOUS"),
    ("ARX-GR-Detalhe", 7, "CONTINUOUS"), ("FORMATO", 7, "CONTINUOUS"),
]
ESTILOS = [("Arial", "arial.ttf"), ("ROMANS", "romans.shx"), ("style2", "tahoma.ttf")]
HORIZ = {"left": "LEFT", "center": "CENTER", "right": "RIGHT"}
VERT = {"baseline": "", "bottom": "BOTTOM_", "middle": "MIDDLE_", "top": "TOP_"}


def _alinhamento(h, v):
    nome = VERT.get(v, "") + HORIZ.get(h, "LEFT")
    return TextEntityAlignment[nome]


def _attr(op, **extra):
    d = {"layer": op.get("l", "0")}
    if op.get("c") is not None:
        d["color"] = op["c"]
    d.update(extra)
    return d


class Construtor:
    def __init__(self, dados):
        self.dados = dados
        self.doc = ezdxf.new("R2018", setup=["linetypes"])   # só os tipos de linha ISO; sem estilos de cota/texto extras
        self.doc.units = 4  # milímetros
        self.msp = self.doc.modelspace()
        self.estilos_cota = {}
        self.avisos = []
        self._base()

    # ------------------------------------------------------------------ tabelas
    def _base(self):
        doc = self.doc
        # tipos de linha ISO usados nas layers de eixo e tracejado (padrão: traço, vazio, ponto, vazio)
        for nome, desc, padrao in (("ACAD_ISO04W100", "ISO long-dash dot", [30.0, 24.0, -3.0, 0.0, -3.0]),
                                   ("ACAD_ISO02W100", "ISO dash", [15.0, 12.0, -3.0])):
            if nome not in doc.linetypes:
                doc.linetypes.add(nome, pattern=padrao, description=desc)
        for nome, cor, lt in CAMADAS:
            if nome not in doc.layers:
                doc.layers.add(nome, color=cor, linetype=lt)
        for nome, fonte in ESTILOS:
            if nome not in doc.styles:
                doc.styles.add(nome, font=fonte)
        doc.header["$DIMSCALE"] = 1.0
        doc.header["$LTSCALE"] = 0.5   # traços dos eixos (ISO) mais curtos, como no modelo
        self._blocos()

    def estilo_cota(self, esc):
        """Estilo de cota para um desenho em 1:esc. O papel está em mm e a cota mostra cm reais (lfac = esc / 10)."""
        esc = float(esc) if esc else 10.0
        nome = "COTA 1-%g" % esc
        if nome not in self.estilos_cota:
            ds = self.doc.dimstyles.new(nome, dxfattribs={
                "dimtxt": 2.0, "dimasz": 2.0, "dimexo": 1.0, "dimexe": 1.0, "dimgap": 1.0,
                "dimclrd": 1, "dimclre": 1, "dimclrt": 7, "dimtad": 1, "dimtih": 0, "dimtoh": 0,
                "dimlfac": esc / 10.0, "dimdec": 1, "dimzin": 8, "dimdsep": 44, "dimadec": 1, "dimaunit": 0,
                "dimscale": 1.0,
            })
            ds.dxf.dimtxsty = "Arial"
            self.estilos_cota[nome] = ds
        return nome

    # ------------------------------------------------------------------ blocos com atributos
    def _blocos(self):
        doc = self.doc
        azul = 5

        # título de vista: círculo azul, traços e sublinhado + atributos
        for nome, attrs in (("Subtitulo", [("SUBTIT", (6.05, 1.47), 4.5), ("ESC", (6.26, -3.81), 2.5)]),
                            ("Subtitulo3", [("SUBTIT", (6.05, 1.47), 4.5), ("SUBTIT2", (6.05, -4.33), 3.0), ("ESCB", (6.05, -8.79), 2.3)])):
            b = doc.blocks.new(nome)
            kw = {"layer": "ARX-GR-Simbolo", "color": azul}
            b.add_circle((0, 0), 4.5, dxfattribs=kw)
            b.add_line((4.5, 0), (50.78, 0), dxfattribs=kw)
            b.add_line((0, -4.5), (0, -6.5), dxfattribs=kw)
            b.add_line((0, 6.5), (0, 4.5), dxfattribs=kw)
            b.add_line((-4.5, 0), (-6.5, 0), dxfattribs=kw)
            for tag, pos, h in attrs:
                a = b.add_attdef(tag, pos, tag, height=h, dxfattribs={"layer": "ARX-GR-Simbolo", "style": "Arial", "color": 7})
                a.set_placement(pos, align=TextEntityAlignment.LEFT)

        # marca de corte: triângulo azul apontando para +x, com a letra
        b = doc.blocks.new("Corte")
        kw = {"layer": "ARX-GR-Simbolo", "color": azul}
        b.add_lwpolyline([(0, 0), (-7, 5), (-7, -5)], close=True, dxfattribs=kw)
        b.add_solid([(0, 0), (-7, 5), (-7, -5), (-7, -5)], dxfattribs=kw)
        a = b.add_attdef("LETRA", (-3.6, 0), "A", height=2.6, dxfattribs={"layer": "ARX-GR-Simbolo", "style": "Arial", "color": 7})
        a.set_placement((-3.6, 0), align=TextEntityAlignment.MIDDLE_CENTER)

        # carimbo A1, quadro de revisões e títulos (bloco do modelo Autoportante); os campos viram atributos
        c = self.dados.get("carimbo")
        if c:
            b = doc.blocks.new("A1 ELETROBRAS")
            for pts, cor in c["p"]:
                kw = {"layer": "FORMATO"}
                if cor != 7:
                    kw["color"] = cor
                b.add_lwpolyline([tuple(p) for p in pts], close=True, dxfattribs=kw)
            for x1, y1, x2, y2, cor in c["l"]:
                kw = {"layer": "FORMATO"}
                if cor != 7:
                    kw["color"] = cor
                b.add_line((x1, y1), (x2, y2), dxfattribs=kw)
            for x, y, h, s, al, cor, est, papel in c["t"]:
                kw = {"layer": "FORMATO", "style": est}
                if cor != 7:
                    kw["color"] = cor
                al = (al + "b")[:2]
                alin = _alinhamento({"l": "left", "c": "center", "r": "right"}[al[0]], {"b": "baseline", "m": "middle", "t": "top"}[al[1]])
                if papel and papel != "?" or s == "{folha}":
                    tag = (papel if papel and papel != "?" else "folha").upper()
                    a = b.add_attdef(tag, (x, y), s if s != "{folha}" else "1", height=h, dxfattribs=kw)
                    a.set_placement((x, y), align=alin)
                else:
                    t = b.add_text(s, height=h, dxfattribs=kw)
                    t.set_placement((x, y), align=alin)

    # ------------------------------------------------------------------ operações
    def construir(self):
        for op in self.dados["ops"]:
            try:
                getattr(self, "op_" + op["k"])(op)
            except Exception as e:  # um elemento com problema não derruba o arquivo inteiro
                self.avisos.append("%s: %s" % (op.get("k"), e))
        return self

    def op_ln(self, op):
        x1, y1, x2, y2 = op["p"]
        self.msp.add_line((x1, y1), (x2, y2), dxfattribs=_attr(op))

    def op_pl(self, op):
        pts, (w0, w1) = op["p"], op["w"]
        if w0 or w1:
            self.msp.add_lwpolyline([(x, y, w0, w1, 0) for x, y in pts], format="xyseb", close=op["f"], dxfattribs=_attr(op))
        else:
            self.msp.add_lwpolyline([tuple(p) for p in pts], close=op["f"], dxfattribs=_attr(op))

    def op_ci(self, op):
        x, y, r = op["p"]
        self.msp.add_circle((x, y), r, dxfattribs=_attr(op))

    def op_tx(self, op):
        x, y, h, s, al, v, rot = op["p"]
        t = self.msp.add_text(s, height=h, rotation=rot or 0, dxfattribs=_attr(op, style=op.get("s") or "Arial"))
        t.set_placement((x, y), align=_alinhamento(al, v))

    def op_ht(self, op):
        x1, y1, x2, y2 = op["p"]
        h = self.msp.add_hatch(color=7, dxfattribs={"layer": op.get("l", "ARX-GR-Hachuras")})
        h.set_pattern_fill(op.get("pat", "ANSI31"), scale=op.get("sc", 0.5), angle=0)
        h.paths.add_polyline_path([(x1, y1), (x2, y1), (x2, y2), (x1, y2)], is_closed=True)

    def op_dl(self, op):
        """Cota linear (horizontal: ang = 0; vertical: ang = 90)."""
        ds = self.estilo_cota(op.get("esc"))
        d = self.msp.add_linear_dim(base=tuple(op["base"]), p1=tuple(op["p1"]), p2=tuple(op["p2"]), angle=op["ang"],
                                    text=op["txt"], dimstyle=ds, override={"dimtxt": op["h"]},
                                    dxfattribs={"layer": "ARX-GR-Cota"})
        d.render()
        dim = d.dimension
        if dim.dxf.get("text_midpoint") is None:   # texto vazio: mantém o ponto médio da linha de cota
            (x1, y1), (x2, y2), (bx, by) = op["p1"], op["p2"], op["base"]
            dim.dxf.text_midpoint = ((x1 + x2) / 2, by, 0) if op["ang"] == 0 else (bx, (y1 + y2) / 2, 0)

    def op_dal(self, op):
        """Cota alinhada (paralela à reta p1-p2, deslocada de dist; positivo = lado esquerdo)."""
        ds = self.estilo_cota(op.get("esc"))
        d = self.msp.add_aligned_dim(p1=tuple(op["p1"]), p2=tuple(op["p2"]), distance=op["dist"], text=op["txt"],
                                     dimstyle=ds, override={"dimtxt": op["h"]}, dxfattribs={"layer": "ARX-GR-Cota"})
        d.render()

    def op_dang(self, op):
        """Cota angular entre as semirretas centro-p1 e centro-p2, com a linha de cota passando por base."""
        ds = self.estilo_cota(op.get("esc"))
        d = self.msp.add_angular_dim_3p(base=tuple(op["base"]), center=tuple(op["c"]), p1=tuple(op["p1"]), p2=tuple(op["p2"]),
                                        text=op["txt"], dimstyle=ds, override={"dimtxt": op["h"]}, dxfattribs={"layer": "ARX-GR-Cota"})
        d.render()

    def op_ml(self, op):
        """Chamada (MULTILEADER): linha até o texto, com patamar horizontal."""
        alvo, ins, linhas, h, dire = Vec2(op["alvo"]), Vec2(op["ins"]), op["linhas"], op["h"], op["dir"]
        try:
            ml = self.msp.add_multileader_mtext("Standard")
            ml.set_content("\\P".join(linhas), color=7, char_height=h,
                           alignment=MLTextAlignment.left if dire > 0 else MLTextAlignment.right, style="Arial")
            ml.set_leader_properties(color=256, linetype="BYLAYER", lineweight=-1)
            ml.set_arrow_properties(name="", size=1.4)
            ml.set_connection_properties(landing_gap=0.4, dogleg_length=2.6)
            ml.add_leader_line(ConnectionSide.left if dire > 0 else ConnectionSide.right, [alvo])
            ml.build(insert=ins)
            ml.multileader.dxf.layer = "ARX-GR-Cota"
        except Exception as e:
            # alternativa: linha + texto soltos
            self.avisos.append("chamada simples: %s" % e)
            self.msp.add_line(alvo, ins, dxfattribs={"layer": "ARX-GR-Cota"})
            for k, t in enumerate(linhas):
                tx = self.msp.add_text(t, height=h, dxfattribs={"layer": "ARX-GR-Texto", "style": "Arial"})
                tx.set_placement((ins.x + dire * 0.8, ins.y - k * (h + 0.8)), align=TextEntityAlignment.LEFT if dire > 0 else TextEntityAlignment.RIGHT)

    def op_ins(self, op):
        x, y = op["p"]
        esc = op.get("sc", 1)
        r = self.msp.add_blockref(op["blk"], (x, y), dxfattribs={"layer": op.get("l", "0"), "xscale": esc, "yscale": esc, "zscale": esc, "rotation": op.get("rot", 0)})
        r.add_auto_attribs(op.get("at", {}))


def rodar(entrada_json):
    dados = json.loads(entrada_json)
    c = Construtor(dados).construir()
    doc = c.doc
    buf = io.StringIO()
    doc.write(buf)
    return json.dumps({"dxf": buf.getvalue(), "avisos": c.avisos[:20], "versao": doc.dxfversion})
