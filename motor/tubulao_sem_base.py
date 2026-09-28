# =====================================================================
# TUBULÃO SEM BASE — motor de cálculo
# Gerado a partir de T_SEM_BASE.ipynb (células de preparação e cálculo).
# A interface chama rodar(entrada_json). Para atualizar, substitua as
# funções abaixo pelas novas versões do notebook, mantendo rodar().
# =====================================================================


from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING, ROUND_FLOOR
import math
import numpy as np
try:
    from IPython.display import display, Markdown
except ImportError:
    def display(obj):
        print(obj)

    def Markdown(texto):
        return texto


def _quantidade(casas: int) -> Decimal:
    return Decimal("1").scaleb(-casas)


def arred_excel(valor: float, casas: int = 0) -> float:
    # Equivalente ao ROUND do Excel: metade afastada de zero.
    return float(Decimal(str(valor)).quantize(_quantidade(casas), rounding=ROUND_HALF_UP))


def arred_cima_excel(valor: float, casas: int = 0) -> float:
    # Equivalente ao ROUNDUP do Excel: afasta de zero.
    d = Decimal(str(valor))
    modo = ROUND_CEILING if d >= 0 else ROUND_FLOOR
    return float(d.quantize(_quantidade(casas), rounding=modo))


def arred_baixo_excel(valor: float, casas: int = 0) -> float:
    # Equivalente ao ROUNDDOWN do Excel: aproxima de zero.
    d = Decimal(str(valor))
    modo = ROUND_FLOOR if d >= 0 else ROUND_CEILING
    return float(d.quantize(_quantidade(casas), rounding=modo))


@dataclass(frozen=True)
class Materiais:
    fck_mpa: float
    fyk_mpa: float
    gamma_aco: float
    gamma_concreto: float
    peso_especifico_concreto_kgf_m3: float
    peso_especifico_aco_kgf_m3: float
    cobrimento_cm: float
    coef_geotecnico: float
    coef_estrutural: float

    @property
    def fyd_mpa(self) -> float:
        return arred_excel(self.fyk_mpa / self.gamma_aco, 2)

    @property
    def fcd_mpa(self) -> float:
        return arred_excel(self.fck_mpa / self.gamma_concreto, 3)

    @property
    def fctk_inf_mpa(self) -> float:
        return arred_excel(0.7 * 0.3 * self.fck_mpa ** (2 / 3), 3)

    @property
    def alfa_v2(self) -> float:
        return 1 - self.fck_mpa / 250

    @property
    def fbd_mpa(self) -> float:
        eta1, eta2, eta3 = 2.25, 1.0, 1.0
        fctm = 0.3 * self.fck_mpa ** (2 / 3) if self.fck_mpa <= 500 else 2.12 * math.log(1 + 0.11 * self.fck_mpa)
        return arred_excel(0.7 * fctm / self.gamma_concreto * eta1 * eta2 * eta3, 3)


@dataclass(frozen=True)
class Solo:
    nome: str
    gamma_kgf_m3: float
    phi_graus: float
    coesao_kgf_m2: float
    aderencia_kgf_cm2: float
    submerso: bool = False


@dataclass(frozen=True)
class Geometria:
    diametro_m: float
    comprimento_enterrado_m: float
    afloramento_min_m: float
    afloramento_max_m: float

    @property
    def altura_min_m(self) -> float:
        return self.comprimento_enterrado_m + self.afloramento_min_m

    @property
    def altura_max_m(self) -> float:
        return self.comprimento_enterrado_m + self.afloramento_max_m

    @property
    def area_m2(self) -> float:
        return math.pi * self.diametro_m ** 2 / 4


@dataclass(frozen=True)
class Carga:
    hipotese: str
    vertical_kgf: float
    transversal_kgf: float
    longitudinal_kgf: float

    @property
    def horizontal_kgf(self) -> float:
        return arred_cima_excel(math.hypot(self.transversal_kgf, self.longitudinal_kgf), 1)


@dataclass(frozen=True)
class Armaduras:
    bitolas_longitudinais_disponiveis_mm: list
    bitolas_estribos_disponiveis_mm: list
    espacamento_longitudinal_min_cm: float = 7.0
    espacamento_longitudinal_ideal_min_cm: float = 10.0
    espacamento_longitudinal_ideal_max_cm: float = 12.0
    espacamento_longitudinal_max_cm: float = 15.0
    taxa_minima_longitudinal: float = 0.004
    espacamentos_estribo_permitidos_cm: tuple = (10.0, 15.0)
    alfa_gancho: float = 1.0


ABACO_52 = {"u":[0,0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.09,0.1,0.11,0.12,0.13,0.14,0.15,0.16,0.17,0.18,0.19,0.2,0.21,0.22,0.23,0.24,0.25],"m":[0,0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.09,0.1,0.11,0.12,0.13,0.14,0.15],"omega":[[0,0.04,0.07,0.1,0.12,0.17,0.2,0.25,0.29,0.34,0.39,0.42,0.48,0.51,0.56,0.61],[0.01,0.05,0.08,0.11,0.14,0.18,0.21,0.26,0.3,0.35,0.4,0.43,0.49,0.52,0.57,0.620000000000002],[0.02,0.06,0.09,0.12,0.15,0.19,0.23,0.27,0.31,0.36,0.41,0.44,0.5,0.53,0.58,0.630000000000002],[0.04,0.07,0.1,0.13,0.16,0.2,0.24,0.28,0.33,0.37,0.42,0.45,0.51,0.54,0.59,0.640000000000002],[0.06,0.08,0.11,0.14,0.17,0.22,0.25,0.29,0.34,0.38,0.43,0.46,0.52,0.55,0.6,0.650000000000002],[0.07,0.09,0.12,0.15,0.19,0.23,0.26,0.3,0.35,0.39,0.44,0.47,0.53,0.56,0.61,0.660000000000002],[0.08,0.1,0.13,0.16,0.2,0.24,0.27,0.31,0.36,0.4,0.45,0.48,0.54,0.57,0.62,0.670000000000001],[0.09,0.11,0.14,0.17,0.21,0.25,0.28,0.32,0.37,0.41,0.46,0.49,0.55,0.58,0.63,0.680000000000001],[0.1,0.12,0.16,0.18,0.23,0.26,0.29,0.33,0.38,0.42,0.47,0.5,0.56,0.59,0.64,0.690000000000001],[0.11,0.13,0.18,0.2,0.24,0.27,0.3,0.35,0.39,0.43,0.48,0.51,0.57,0.6,0.65,0.700000000000001],[0.12,0.15,0.19,0.21,0.25,0.28,0.31,0.36,0.4,0.44,0.49,0.52,0.58,0.61,0.66,0.710000000000001],[0.13,0.16,0.2,0.22,0.26,0.29,0.32,0.37,0.41,0.45,0.5,0.53,0.59,0.62,0.67,0.720000000000001],[0.14,0.17,0.21,0.23,0.27,0.31,0.33,0.38,0.42,0.46,0.51,0.54,0.6,0.63,0.68,0.730000000000001],[0.15,0.18,0.22,0.24,0.28,0.32,0.35,0.39,0.43,0.47,0.52,0.55,0.61,0.64,0.69,0.740000000000001],[0.17,0.19,0.23,0.26,0.29,0.33,0.36,0.4,0.44,0.48,0.53,0.56,0.62,0.65,0.7,0.750000000000001],[0.18,0.21,0.24,0.27,0.3,0.34,0.38,0.41,0.45,0.5,0.54,0.57,0.63,0.66,0.71,0.760000000000001],[0.2,0.22,0.25,0.28,0.31,0.35,0.39,0.42,0.46,0.51,0.55,0.58,0.64,0.67,0.72,0.77],[0.21,0.23,0.27,0.29,0.33,0.36,0.4,0.43,0.47,0.52,0.56,0.59,0.65,0.68,0.73,0.78],[0.23,0.25,0.28,0.31,0.35,0.38,0.42,0.44,0.48,0.53,0.57,0.6,0.66,0.69,0.74,0.79],[0.24,0.27,0.29,0.32,0.36,0.39,0.43,0.45,0.49,0.54,0.58,0.61,0.67,0.7,0.75,0.8],[0.26,0.28,0.3,0.33,0.37,0.4,0.44,0.47,0.5,0.55,0.59,0.62,0.68,0.71,0.77,0.81],[0.27,0.29,0.31,0.34,0.38,0.41,0.45,0.48,0.51,0.56,0.6,0.64,0.69,0.72,0.78,0.82],[0.28,0.3,0.32,0.35,0.39,0.42,0.46,0.49,0.52,0.57,0.61,0.65,0.7,0.73,0.79,0.83],[0.29,0.31,0.33,0.36,0.4,0.43,0.47,0.5,0.53,0.58,0.63,0.66,0.71,0.74,0.8,0.84],[0.3,0.32,0.34,0.37,0.41,0.44,0.48,0.51,0.55,0.59,0.64,0.67,0.72,0.76,0.81,0.85],[0.31,0.33,0.35,0.39,0.42,0.45,0.49,0.52,0.56,0.6,0.65,0.68,0.73,0.77,0.82,0.86]]}

ABACO_54 = {"u":[0,0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.09,0.1,0.11,0.12,0.13,0.14,0.15,0.16,0.17,0.18,0.19,0.2,0.21,0.22,0.23,0.24,0.25],"m":[0,0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.09,0.1,0.11,0.12,0.13,0.14,0.15],"omega":[[0,0.04,0.05,0.09,0.12,0.16,0.19,0.23,0.26,0.3,0.34,0.38,0.41,0.45,0.5,0.54],[0.01,0.05,0.06,0.1,0.13,0.17,0.2,0.24,0.27,0.31,0.35,0.39,0.42,0.46,0.51,0.55],[0.02,0.06,0.08,0.11,0.14,0.18,0.21,0.25,0.28,0.32,0.36,0.4,0.43,0.47,0.52,0.56],[0.04,0.07,0.09,0.13,0.16,0.19,0.22,0.26,0.29,0.33,0.37,0.41,0.44,0.48,0.53,0.57],[0.05,0.08,0.11,0.14,0.17,0.2,0.23,0.27,0.3,0.34,0.38,0.42,0.45,0.49,0.54,0.58],[0.06,0.09,0.12,0.15,0.18,0.21,0.24,0.28,0.31,0.35,0.39,0.43,0.46,0.5,0.55,0.59],[0.07,0.1,0.13,0.16,0.19,0.22,0.25,0.29,0.32,0.36,0.4,0.44,0.47,0.51,0.56,0.6],[0.08,0.11,0.14,0.17,0.2,0.23,0.26,0.3,0.33,0.37,0.41,0.45,0.48,0.52,0.57,0.61],[0.09,0.13,0.15,0.18,0.21,0.24,0.27,0.31,0.34,0.38,0.42,0.46,0.49,0.53,0.58,0.62],[0.11,0.15,0.16,0.19,0.22,0.25,0.28,0.32,0.35,0.39,0.43,0.47,0.5,0.54,0.59,0.63],[0.12,0.16,0.17,0.2,0.23,0.26,0.29,0.33,0.36,0.4,0.44,0.48,0.51,0.55,0.6,0.64],[0.14,0.17,0.18,0.21,0.24,0.27,0.3,0.34,0.37,0.41,0.45,0.49,0.52,0.56,0.61,0.65],[0.15,0.18,0.19,0.22,0.25,0.28,0.31,0.35,0.38,0.42,0.46,0.5,0.53,0.57,0.62,0.66],[0.17,0.19,0.2,0.23,0.26,0.3,0.32,0.36,0.39,0.43,0.47,0.51,0.54,0.58,0.63,0.67],[0.19,0.2,0.22,0.24,0.28,0.31,0.33,0.37,0.4,0.44,0.48,0.52,0.55,0.59,0.64,0.68],[0.2,0.21,0.24,0.26,0.29,0.32,0.35,0.38,0.41,0.45,0.49,0.53,0.56,0.6,0.65,0.69],[0.21,0.22,0.25,0.27,0.3,0.33,0.355,0.39,0.42,0.46,0.5,0.54,0.57,0.61,0.66,0.695],[0.22,0.23,0.26,0.28,0.31,0.34,0.36,0.4,0.43,0.47,0.51,0.55,0.58,0.62,0.67,0.7],[0.23,0.25,0.27,0.29,0.32,0.35,0.365,0.41,0.44,0.48,0.52,0.56,0.59,0.63,0.68,0.71],[0.24,0.28,0.29,0.3,0.33,0.36,0.38,0.42,0.45,0.49,0.53,0.57,0.6,0.64,0.69,0.72],[0.25,0.29,0.3,0.31,0.34,0.37,0.39,0.43,0.46,0.5,0.54,0.58,0.61,0.65,0.7,0.73],[0.27,0.3,0.32,0.33,0.35,0.38,0.4,0.44,0.47,0.51,0.55,0.59,0.62,0.66,0.71,0.74],[0.28,0.31,0.33,0.34,0.36,0.39,0.41,0.45,0.48,0.52,0.56,0.6,0.63,0.67,0.715,0.75],[0.29,0.32,0.34,0.36,0.38,0.4,0.42,0.46,0.49,0.53,0.57,0.605,0.64,0.68,0.72,0.76],[0.31,0.33,0.35,0.37,0.39,0.41,0.44,0.47,0.5,0.54,0.58,0.61,0.65,0.685,0.73,0.765],[0.32,0.34,0.36,0.39,0.41,0.43,0.46,0.48,0.52,0.55,0.59,0.62,0.66,0.69,0.74,0.77]]}


def fatores_solo(solo: Solo, indice: int) -> dict:
    # A planilha usa 6 casas para o primeiro solo e 4 para os demais.
    casas_tan = 6 if indice == 0 else 4
    tan_phi = arred_excel(math.tan(math.radians(solo.phi_graus)), casas_tan)
    nq = arred_excel(math.exp(math.pi * tan_phi) * math.tan(math.radians(45 + solo.phi_graus / 2)) ** 2, 6)
    nc = arred_excel((nq - 1) / tan_phi, 6)
    ngamma = arred_excel(2 * (nq + 1) * tan_phi, 6)
    sq = arred_excel(1 + tan_phi, 6)
    sc = arred_excel(1 + nq / nc, 6)
    sgamma = 0.6
    kp = arred_excel(math.tan(math.radians(45 + solo.phi_graus / 2)) ** 2, 3)
    return {"tan_phi": tan_phi, "Nq": nq, "Nc": nc, "Ngamma": ngamma, "Sq": sq, "Sc": sc, "Sgamma": sgamma, "Kp": kp}


def pesos_tubulao(geometria: Geometria, materiais: Materiais) -> dict:
    v_esc = geometria.area_m2 * geometria.comprimento_enterrado_m
    v_min = geometria.area_m2 * geometria.altura_min_m
    v_max = geometria.area_m2 * geometria.altura_max_m
    return {
        "volume_escavacao_m3": v_esc,
        "volume_concreto_min_m3": v_min,
        "volume_concreto_max_m3": v_max,
        "peso_proprio_min_kgf": materiais.peso_especifico_concreto_kgf_m3 * v_min,
        "peso_proprio_max_kgf": materiais.peso_especifico_concreto_kgf_m3 * v_max,
    }


def verificar_compressao(solo, geometria, materiais, fatores, cargas_compressao):
    pesos = pesos_tubulao(geometria, materiais)
    vertical_max = max(c.vertical_kgf for c in cargas_compressao)
    atrito_lateral = solo.aderencia_kgf_cm2 * 100 ** 2 * math.pi * geometria.diametro_m * geometria.comprimento_enterrado_m
    sigma_sol = arred_excel(
        ((materiais.coef_geotecnico * vertical_max + pesos["peso_proprio_max_kgf"]) - atrito_lateral)
        / geometria.area_m2 / 100 ** 2,
        2,
    )
    sigma_adm = arred_excel(
        (
            solo.coesao_kgf_m2 * fatores["Nc"] * fatores["Sc"]
            + solo.gamma_kgf_m3 * geometria.comprimento_enterrado_m * fatores["Nq"] * fatores["Sq"]
            + 0.5 * solo.gamma_kgf_m3 * geometria.diametro_m * fatores["Ngamma"] * fatores["Sgamma"]
        ) / 3 / 100 ** 2,
        2,
    )
    return {"sigma_solicitante_kgf_cm2": sigma_sol, "sigma_admissivel_kgf_cm2": sigma_adm, "compressao": "ATENDE" if sigma_adm >= sigma_sol else "REVER"}


def verificar_tombamento(solo, geometria, materiais, fatores, todas_cargas):
    h_max = max(c.horizontal_kgf for c in todas_cargas)
    md = arred_excel(materiais.coef_geotecnico * h_max * geometria.altura_max_m, 1)
    mr = arred_excel(0.5 * geometria.diametro_m * solo.gamma_kgf_m3 * geometria.comprimento_enterrado_m ** 3 * fatores["Kp"], 1)
    fs = arred_excel(mr / md, 2)
    return {"momento_solicitante_kgfm": md, "momento_resistente_kgfm": mr, "fs_tombamento": fs, "tombamento": "ATENDE" if mr > md else "REVER"}


def verificar_arrancamento_grenoble(solo, geometria, materiais, cargas_tracao, q0_kgf_m2=0.0):
    phi = solo.phi_graus
    d_sobre_r = arred_excel(geometria.comprimento_enterrado_m / (geometria.diametro_m / 2), 3)
    alfa = -phi / 8
    m = arred_excel(-180 / 4 + phi / 2 + alfa, 4)
    seno_aux = math.sin(math.radians(phi)) * math.sin(math.radians(m))
    cos_arcsin = math.cos(math.asin(seno_aux))
    f_sobre_h = arred_excel(
        math.tan(math.radians(45 + phi / 2))
        * ((cos_arcsin - math.sin(math.radians(phi)) * math.cos(math.radians(m)))
           / (cos_arcsin + math.sin(math.radians(phi)) * math.cos(math.radians(m)))),
        4,
    )
    mc = arred_excel(
        (-math.tan(math.radians(alfa)) / math.tan(math.radians(phi))
         + f_sobre_h * math.cos(math.radians(phi)) * (1 + math.tan(math.radians(alfa)) / math.tan(math.radians(phi))))
        * (1 - math.tan(math.radians(alfa)) / 2 * d_sobre_r),
        4,
    )
    mq = arred_excel(mc * math.tan(math.radians(phi)) + (1 - math.tan(math.radians(alfa)) / 2 * d_sobre_r) * math.tan(math.radians(alfa)), 4)
    m_phi_gamma = arred_excel(
        math.sin(math.radians(phi)) * math.cos(math.radians(phi + 2 * alfa))
        / (2 * math.cos(math.radians(alfa)) ** 2)
        * (1 - math.tan(math.radians(alfa)) / 3 * d_sobre_r),
        4,
    )
    td = arred_excel(materiais.coef_geotecnico * max(c.vertical_kgf for c in cargas_tracao), 1)
    peso_especifico_efetivo = materiais.peso_especifico_concreto_kgf_m3 - (1000 if solo.submerso else 0)
    pp_min = peso_especifico_efetivo * geometria.area_m2 * geometria.altura_min_m
    qrt = arred_excel(
        math.pi * geometria.diametro_m * geometria.comprimento_enterrado_m
        * (solo.coesao_kgf_m2 * mc + solo.gamma_kgf_m3 * geometria.comprimento_enterrado_m * m_phi_gamma + q0_kgf_m2 * mq)
        + pp_min,
        2,
    )
    fs = arred_excel(qrt / td, 2)
    return {"tracao_solicitante_kgf": td, "resistencia_arrancamento_kgf": qrt, "fs_arrancamento": fs, "arrancamento": "ATENDE" if qrt >= td else "REVER"}


def interpolar_abaco(nu: float, mu: float, tabela: dict) -> float:
    # Interpolação bilinear usada nas planilhas dos ábacos 5.2 e 5.4.
    us = np.asarray(tabela["u"], dtype=float)
    ms = np.asarray(tabela["m"], dtype=float)
    z = np.asarray(tabela["omega"], dtype=float)
    if not (us.min() <= nu <= us.max() and ms.min() <= mu <= ms.max()):
        raise ValueError(f"Ponto fora do ábaco: ν={nu:.5f}, μ={mu:.5f}")

    iu = np.searchsorted(us, nu, side="right")
    im = np.searchsorted(ms, mu, side="right")
    u0i, u1i = max(0, iu - 1), min(len(us) - 1, iu)
    m0i, m1i = max(0, im - 1), min(len(ms) - 1, im)
    u0, u1, m0, m1 = us[u0i], us[u1i], ms[m0i], ms[m1i]

    if u0 == u1 and m0 == m1:
        return float(z[u0i, m0i])
    if u0 == u1:
        return float(np.interp(mu, [m0, m1], [z[u0i, m0i], z[u0i, m1i]]))
    if m0 == m1:
        return float(np.interp(nu, [u0, u1], [z[u0i, m0i], z[u1i, m0i]]))

    z_u0 = z[u0i, m0i] + (z[u0i, m1i] - z[u0i, m0i]) * (mu - m0) / (m1 - m0)
    z_u1 = z[u1i, m0i] + (z[u1i, m1i] - z[u1i, m0i]) * (mu - m0) / (m1 - m0)
    return float(z_u0 + (z_u1 - z_u0) * (nu - u0) / (u1 - u0))


def momento_no_fuste(carga, solo, geometria, materiais, kp, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    h = carga.horizontal_kgf
    braco = geometria.afloramento_max_m + excentricidade_horizontal_mm / 1000 + 0.545 * math.sqrt(h / (solo.gamma_kgf_m3 * geometria.diametro_m * kp))
    return arred_excel(materiais.coef_estrutural * h * braco - materiais.coef_estrutural * carga.vertical_kgf * excentricidade_vertical_mm / 1000, 0)


def selecionar_bitola_longitudinal(as_requerida_cm2, geometria, materiais, armaduras, bitola_estribo_mm):
    alternativas = []

    for bitola_mm in sorted(armaduras.bitolas_longitudinais_disponiveis_mm):
        phi_cm = bitola_mm / 10
        area_barra_cm2 = math.pi * phi_cm ** 2 / 4
        perimetro_util_cm = math.pi * (
            geometria.diametro_m * 100
            - 2 * materiais.cobrimento_cm
            - phi_cm
            - 2 * bitola_estribo_mm / 10
        )

        n_por_area = int(arred_cima_excel(as_requerida_cm2 / area_barra_cm2, 0))
        # Acrescenta barras, quando necessário, para tentar atingir até 12 cm.
        n_para_faixa_ideal = math.ceil(
            perimetro_util_cm / armaduras.espacamento_longitudinal_ideal_max_cm
        )
        n_barras = max(n_por_area, n_para_faixa_ideal)
        espacamento_cm = arred_excel(perimetro_util_cm / n_barras, 1)
        as_adotada_cm2 = arred_excel(area_barra_cm2 * n_barras, 2)

        if armaduras.espacamento_longitudinal_ideal_min_cm <= espacamento_cm <= armaduras.espacamento_longitudinal_ideal_max_cm:
            faixa = "IDEAL"
            prioridade = 0
            distancia_ideal = abs(espacamento_cm - 11.0)
        elif armaduras.espacamento_longitudinal_min_cm <= espacamento_cm <= armaduras.espacamento_longitudinal_max_cm:
            faixa = "ACEITÁVEL"
            prioridade = 1
            distancia_ideal = min(
                abs(espacamento_cm - armaduras.espacamento_longitudinal_ideal_min_cm),
                abs(espacamento_cm - armaduras.espacamento_longitudinal_ideal_max_cm),
            )
        else:
            faixa = "REVER"
            prioridade = 2
            distancia_ideal = min(
                abs(espacamento_cm - armaduras.espacamento_longitudinal_min_cm),
                abs(espacamento_cm - armaduras.espacamento_longitudinal_max_cm),
            )

        alternativas.append({
            "bitola_mm": bitola_mm,
            "area_barra_cm2": area_barra_cm2,
            "n_por_area": n_por_area,
            "n_barras": n_barras,
            "as_adotada_cm2": as_adotada_cm2,
            "espacamento_cm": espacamento_cm,
            "faixa": faixa,
            "prioridade": prioridade,
            "distancia_ideal": distancia_ideal,
            "excesso_aco_cm2": as_adotada_cm2 - as_requerida_cm2,
        })

    if not alternativas:
        raise ValueError("Informe ao menos uma bitola longitudinal disponível.")

    escolhida = min(
        alternativas,
        key=lambda item: (
            item["prioridade"],
            item["excesso_aco_cm2"],
            item["distancia_ideal"],
            item["bitola_mm"],
        ),
    )
    return escolhida, alternativas


def dimensionar_n1(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, armaduras, bitola_estribo_mm, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    casos_c = []
    for carga in cargas_compressao:
        nd = arred_excel(carga.vertical_kgf * materiais.coef_estrutural, 0)
        md = momento_no_fuste(carga, solo, geometria, materiais, fatores["Kp"], excentricidade_vertical_mm, excentricidade_horizontal_mm)
        casos_c.append((carga.hipotese, nd, md))
    caso_c = max(casos_c, key=lambda x: x[2])
    print(f"Solo {solo.nome} | Hipótese {caso_c[0]} | Momento crítico de compressão = {caso_c[2]} kgf.m")
    casos_t = []
    for carga in cargas_tracao:
        nd = arred_excel(carga.vertical_kgf * materiais.coef_estrutural, 0)
        md = momento_no_fuste(carga, solo, geometria, materiais, fatores["Kp"], excentricidade_vertical_mm, excentricidade_horizontal_mm)
        e = arred_excel(md / nd, 3)
        nu = (1 / (0.85 * materiais.fcd_mpa * 10)) * nd / (geometria.diametro_m * 100) ** 2
        mu = nu * (e / geometria.diametro_m)
        tabela = ABACO_54 if geometria.diametro_m * 0.05 >= materiais.cobrimento_cm / 100 else ABACO_52
        omega = interpolar_abaco(nu, mu, tabela)
        casos_t.append((carga.hipotese, nd, md, e, nu, mu, omega))
    caso_t = max(casos_t, key=lambda x: x[6])
    hipotese, nd, md, e, nu, mu, omega_abaco = caso_t
    omega = omega_abaco

    rho = omega * (0.85 * materiais.fcd_mpa / materiais.fyd_mpa)
    rho_percentual = arred_cima_excel(rho * 100, 3)
    area_secao_cm2 = math.pi * (geometria.diametro_m * 100) ** 2 / 4
    as_calculada = arred_cima_excel(rho_percentual / 100 * area_secao_cm2, 2)
    as_minima = arred_excel(armaduras.taxa_minima_longitudinal * area_secao_cm2, 2)
    as_requerida = max(as_calculada, as_minima)

    escolha, alternativas = selecionar_bitola_longitudinal(
        as_requerida, geometria, materiais, armaduras, bitola_estribo_mm
    )
    bitola_longitudinal_mm = escolha["bitola_mm"]
    n_barras = escolha["n_barras"]
    as_adotada = escolha["as_adotada_cm2"]
    espacamento = escolha["espacamento_cm"]

    phi_cm = bitola_longitudinal_mm / 10
    lb = max(phi_cm / 4 * (materiais.fyd_mpa / materiais.fbd_mpa), phi_cm * 25)
    lb_min = max(0.3 * lb, 10 * phi_cm, 10)
    fator_momento = 1 if md == 0 else 2
    transpasse_calculado = (
        fator_momento * (lb_min if as_calculada == 0 else
        armaduras.alfa_gancho * (as_calculada / as_adotada) * max(lb, lb_min))
    )
    # Adota sempre o próximo múltiplo de 5 cm, sem reduzir o valor calculado.
    transpasse = math.ceil(transpasse_calculado / 5) * 5

    return {
        "hipotese_compressao_n1": caso_c[0], "Nd_compressao_kgf": caso_c[1], "Md_compressao_kgfm": caso_c[2],
        "hipotese_tracao_n1": hipotese, "Nd_tracao_kgf": nd, "Md_tracao_kgfm": md,
        "nu": nu, "mu": mu, "omega": omega, "rho_percentual": rho_percentual,
        "As_calculada_cm2": as_calculada, "As_minima_cm2": as_minima, "As_requerida_cm2": as_requerida,
        "As_adotada_cm2": as_adotada, "bitola_longitudinal_mm": bitola_longitudinal_mm,
        "quantidade_minima_por_area": escolha["n_por_area"], "quantidade_barras": n_barras,
        "espacamento_longitudinal_cm": espacamento, "faixa_espacamento_n1": escolha["faixa"],
        "transpasse_cm": transpasse,
    }


def dimensionar_n2(geometria, materiais, todas_cargas, armaduras):
    vd = arred_excel(materiais.coef_estrutural * max(c.horizontal_kgf for c in todas_cargas), 1)
    d_cm = geometria.diametro_m * 100
    vrd2 = arred_excel(0.27 * materiais.alfa_v2 * (materiais.fcd_mpa * 10) * d_cm * (d_cm - materiais.cobrimento_cm), 0)
    vc = arred_excel(0.6 * (materiais.fctk_inf_mpa * 10 / materiais.gamma_concreto) * d_cm * (d_cm - materiais.cobrimento_cm), 0)

    def calcular_vsw(bitola_mm, espacamento_cm):
        area_ramo = math.pi * (bitola_mm / 10) ** 2 / 4
        return arred_excel(
            (area_ramo * 2 / espacamento_cm)
            * 0.9 * (d_cm - materiais.cobrimento_cm)
            * (materiais.fyd_mpa * 10),
            0,
        )

    # Otimização: menor massa de estribos por metro, incluindo ancoragem.
    # Compara todas as combinações disponíveis com Vsw > Vd.
    bitolas = sorted(armaduras.bitolas_estribos_disponiveis_mm)
    espacamentos = sorted(armaduras.espacamentos_estribo_permitidos_cm, reverse=True)
    alternativas = []
    for bitola in bitolas:
        phi_cm = bitola / 10
        lb = arred_excel(max(phi_cm / 4 * materiais.fyd_mpa / arred_excel(materiais.fbd_mpa, 2), 25 * phi_cm), 2)
        lb_adotado = math.ceil(arred_excel(armaduras.alfa_gancho * lb, 2) / 5) * 5
        comprimento_cm = arred_excel(math.pi * (d_cm - 2 * materiais.cobrimento_cm) + lb_adotado, 0)
        massa_unitaria = comprimento_cm / 100 * math.pi * (bitola / 2000)**2 * materiais.peso_especifico_aco_kgf_m3
        for esp in espacamentos:
            vsw_alternativa = calcular_vsw(bitola, esp)
            alternativas.append({"bitola_mm": bitola, "espacamento_cm": esp,
                                 "Vsw_kgf": vsw_alternativa,
                                 "consumo_kg_m": massa_unitaria * 100 / esp,
                                 "atende": vsw_alternativa > vd})
    viaveis = [item for item in alternativas if item["atende"]]
    if not viaveis:
        raise ValueError("Nenhuma combinação Ø6,3/Ø8 com espaçamento 10/15 cm atende Vsw > Vd. Revise as entradas.")
    escolhida = min(viaveis, key=lambda item: (item["consumo_kg_m"], -item["espacamento_cm"], item["bitola_mm"]))
    bitola_adotada = escolhida["bitola_mm"]
    espacamento_adotado = escolhida["espacamento_cm"]
    vsw = escolhida["Vsw_kgf"]
    atende_vd = vsw > vd
    vrd3 = vc + vsw
    fs = arred_excel(min(vrd2 / vd, vrd3 / vd), 2)

    vsw_por_combinacao = {
        (item["bitola_mm"], item["espacamento_cm"]): item["Vsw_kgf"]
        for item in alternativas
    }
    return {
        "alternativas_n2": alternativas,
        "consumo_n2_kg_m": escolhida["consumo_kg_m"],
        "Vd_kgf": vd,
        "Vrd2_kgf": vrd2,
        "Vc_kgf": vc,
        "Vsw_phi6_3_15cm_kgf": vsw_por_combinacao.get((6.3, 15.0)),
        "Vsw_phi6_3_10cm_kgf": vsw_por_combinacao.get((6.3, 10.0)),
        "Vsw_phi8_15cm_kgf": vsw_por_combinacao.get((8.0, 15.0)),
        "Vsw_phi8_10cm_kgf": vsw_por_combinacao.get((8.0, 10.0)),
        "Vsw_15cm_kgf": vsw_por_combinacao.get((bitola_adotada, 15.0)),
        "Vsw_10cm_kgf": vsw_por_combinacao.get((bitola_adotada, 10.0)),
        "bitola_estribo_adotada_mm": bitola_adotada,
        "espacamento_estribo_adotado_cm": espacamento_adotado,
        "Vsw_kgf": vsw,
        "criterio_Vsw_maior_Vd": "ATENDE" if atende_vd else "REVER",
        "Vrd3_kgf": vrd3,
        "fs_cisalhamento": fs,
        "cisalhamento": "ATENDE" if vrd2 >= vd and vrd3 >= vd and atende_vd else "REVER",
    }


def comprimento_estribo_cm(geometria, materiais, armaduras, bitola_estribo_mm):
    # Fórmula da planilha: perímetro útil + comprimento de ancoragem adotado.
    phi_cm = bitola_estribo_mm / 10
    lb = max(phi_cm / 4 * (materiais.fyd_mpa / arred_excel(materiais.fbd_mpa, 2)), phi_cm * 25)
    lb_necessario = armaduras.alfa_gancho * lb
    lb_adotado = math.ceil(lb_necessario / 5) * 5
    return arred_excel(
        math.pi * (geometria.diametro_m * 100 - 2 * materiais.cobrimento_cm) + lb_adotado,
        0,
    )


def calcular_quantidade_estribos(comprimento_unitario_m, espacamento_cm, tipo_fundacao):
    tipo = tipo_fundacao.upper()
    parcela_fixa = 14
    desconto_extremidades_cm = 120
    comprimento_unitario_cm = arred_excel(comprimento_unitario_m * 100, 6)
    quantidade_calculada = parcela_fixa + (
        comprimento_unitario_cm - desconto_extremidades_cm
    ) / espacamento_cm
    return int(arred_cima_excel(quantidade_calculada, 0))





# =====================================================================
# INTERFACE COM O SOFTWARE — recebe as entradas em JSON e devolve JSON
# =====================================================================
import json

def calcular_stub(stub_dados):
    calc = dict(stub_dados)
    for direcao, chave in [("real", "secante_beta_real"), ("transversal", "secante_alfa_transversal"), ("longitudinal", "secante_alfa_longitudinal")]:
        secante = stub_dados[chave]
        if secante < 1:
            raise ValueError(f"{chave} deve ser maior ou igual a 1.")
        angulo = math.acos(1 / secante)
        calc[f"angulo_{direcao}_graus"] = math.degrees(angulo)
        digitada = stub_dados.get({"real": "e_real_mm", "transversal": "e_trans_mm", "longitudinal": "e_long_mm"}[direcao])
        calc[f"projecao_{direcao}_mm"] = float(digitada) if digitada is not None else stub_dados["altura_vertical_mm"] * math.tan(angulo)
    inc = math.trunc(calc["projecao_real_mm"] / stub_dados["altura_vertical_mm"] * 100000) / 1000
    x = inc / 100 * (stub_dados["altura_enterrada_mm"] - stub_dados["nivel_concreto_mm"]) / 2
    calc["inclinacao_real_percentual"] = inc
    calc["x_real_mm"] = x
    calc["total_real_mm"] = x + calc["projecao_real_mm"]
    return calc


def _quantitativos(nome_solo, r, afloramentos_cm, tipo):
    geometria = GEOMETRIAS[nome_solo]
    area = geometria.area_m2
    n1_q = int(r["quantidade_barras"]); n1_b = float(r["bitola_longitudinal_mm"])
    n2_b = float(r["bitola_estribo_adotada_mm"]); n2_s = float(r["espacamento_estribo_adotado_cm"])
    n2_c = comprimento_estribo_cm(geometria, MATERIAIS, ARMADURAS, n2_b)
    a1 = math.pi * (n1_b / 2000) ** 2
    a2 = math.pi * (n2_b / 2000) ** 2
    linhas = []
    for g in afloramentos_cm:
        h = geometria.comprimento_enterrado_m + g / 100
        n1_u = h - 2 * MATERIAIS.cobrimento_cm / 100
        n1_t = n1_u * n1_q
        n1_p = n1_t * a1 * MATERIAIS.peso_especifico_aco_kgf_m3
        n2_q = calcular_quantidade_estribos(n1_u, n2_s, tipo)
        n2_t = n2_q / 100 * n2_c
        n2_p = n2_t * a2 * MATERIAIS.peso_especifico_aco_kgf_m3
        linhas.append({"G_cm": g, "H_m": h, "concreto_m3": area * h, "escavacao_m3": area * geometria.comprimento_enterrado_m,
                       "n1_comp_unit_m": n1_u, "n1_comp_total_m": n1_t, "n1_peso_kgf": n1_p,
                       "n2_quantidade": n2_q, "n2_comp_total_m": n2_t, "n2_peso_kgf": n2_p, "peso_total_kgf": n1_p + n2_p})
    return {"n1": f"N1 — {n1_q} Ø {n1_b:g} mm",
            "n2": f"N2 — Ø {n2_b:g} mm c/{n2_s:g} cm — comp. {n2_c:g} cm",
            "linhas": linhas}


def _afl(e, nome):
    a = e["afloramentos_cm"]
    return a.get(nome, []) if isinstance(a, dict) else a


def rodar(entrada_json):
    global NOME_TORRE, TIPO_DE_FUNDACAO, STUB_CALCULADO, EXCENTRICIDADE_VERTICAL_MM, EXCENTRICIDADE_HORIZONTAL_MM
    global MATERIAIS, SOLOS, GEOMETRIAS, CARGAS_COMPRESSAO, CARGAS_TRACAO, ARMADURAS
    e = json.loads(entrada_json)
    NOME_TORRE = e["nome_torre"]
    TIPO_DE_FUNDACAO = e.get("tipo_fundacao", "T")
    STUB_CALCULADO = calcular_stub(e["stub"])
    EXCENTRICIDADE_VERTICAL_MM = STUB_CALCULADO["x_real_mm"]
    EXCENTRICIDADE_HORIZONTAL_MM = float(e.get("excentricidade_horizontal_mm", 0.0))
    MATERIAIS = Materiais(**e["materiais"])
    SOLOS = [Solo(**s) for s in e["solos"]]
    GEOMETRIAS = {k: Geometria(**v) for k, v in e["geometrias"].items()}
    CARGAS_COMPRESSAO = [Carga(**c) for c in e["cargas_compressao"]]
    CARGAS_TRACAO = [Carga(**c) for c in e["cargas_tracao"]]
    ARMADURAS = Armaduras(**e["armaduras"])
    todas_cargas = CARGAS_COMPRESSAO + CARGAS_TRACAO
    resultados, quantitativos, erros = {}, {}, {}
    for indice, solo in enumerate(SOLOS):
        try:
            geometria = GEOMETRIAS[solo.nome]
            fatores = fatores_solo(solo, indice)
            linha = {"solo": solo.nome, "D_m": geometria.diametro_m, "L_enterrado_m": geometria.comprimento_enterrado_m}
            linha.update(verificar_compressao(solo, geometria, MATERIAIS, fatores, CARGAS_COMPRESSAO))
            linha.update(verificar_tombamento(solo, geometria, MATERIAIS, fatores, todas_cargas))
            linha.update(verificar_arrancamento_grenoble(solo, geometria, MATERIAIS, CARGAS_TRACAO))
            r2 = dimensionar_n2(geometria, MATERIAIS, todas_cargas, ARMADURAS)
            r1 = dimensionar_n1(solo, geometria, MATERIAIS, fatores, CARGAS_COMPRESSAO, CARGAS_TRACAO, ARMADURAS,
                                r2["bitola_estribo_adotada_mm"], EXCENTRICIDADE_VERTICAL_MM, EXCENTRICIDADE_HORIZONTAL_MM)
            linha.update(r1)
            linha.update(r2)
            linha["fatores"] = fatores
            resultados[solo.nome] = linha
            quantitativos[solo.nome] = _quantitativos(solo.nome, linha, _afl(e, solo.nome), TIPO_DE_FUNDACAO)
        except Exception as ex:
            erros[solo.nome] = f"{type(ex).__name__}: {ex}"
    return json.dumps({"solos": [s.nome for s in SOLOS], "stub": STUB_CALCULADO,
                       "excentricidade_vertical_mm": EXCENTRICIDADE_VERTICAL_MM,
                       "resultados": resultados, "quantitativos": quantitativos, "erros": erros}, default=float)
