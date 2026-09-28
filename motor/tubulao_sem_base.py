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


# Método do N1: "envoltoria" (compatibilidade de deformações) ou "abaco" (planilha).
METODO_N1 = "envoltoria"

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


def dimensionar_n1_abaco(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, armaduras, bitola_estribo_mm, excentricidade_vertical_mm, excentricidade_horizontal_mm):
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



# =====================================================================
# ENVOLTÓRIA RESISTENTE N × M (ELU) — substitui a leitura do ábaco
# Seção de concreto + barras discretas, por compatibilidade de
# deformações (ABNT NBR 6118:2023, itens 8.2.10.1, 8.3.6 e 17.2.2):
#   - concreto: diagrama parábola-retângulo, sem resistência à tração;
#   - aço: elastoplástico perfeito (Es = 210 GPa), εsu = 10 ‰;
#   - estados-limite últimos pelos polos A (ε aço = 10 ‰), B (εcu) e C (εc2).
# Convenção: compressão positiva; tensões em kgf/cm², forças em kgf,
# comprimentos em cm e momentos em kgf·cm dentro deste bloco.
# =====================================================================
ES_KGF_CM2 = 2100000.0
EPS_SU = 0.010


def parametros_concreto(fck_mpa):
    # NBR 6118:2023, 8.2.10.1 — εc2, εcu e expoente n (fck em MPa).
    if fck_mpa <= 50:
        return 0.002, 0.0035, 2.0
    k = (90 - fck_mpa) / 100
    return 0.002 + 0.000085 * (fck_mpa - 50) ** 0.53, 0.0026 + 0.035 * k ** 4, 1.4 + 23.4 * k ** 4


def secao_circular(diametro_cm, n_faixas=240):
    # Faixas horizontais: ordenada do centro (cm) e área (cm²).
    r = diametro_cm / 2
    bordas = np.linspace(-r, r, n_faixas + 1)
    y = (bordas[:-1] + bordas[1:]) / 2
    area = 2 * np.sqrt(np.maximum(r * r - y * y, 0.0)) * np.diff(bordas)
    return y, area


def secao_quadrada(lado_cm, diagonal=False, n_faixas=240):
    # Flexão em torno do eixo principal (diagonal=False) ou da diagonal.
    if not diagonal:
        bordas = np.linspace(-lado_cm / 2, lado_cm / 2, n_faixas + 1)
        y = (bordas[:-1] + bordas[1:]) / 2
        return y, np.full_like(y, lado_cm * lado_cm / n_faixas)
    c = lado_cm / math.sqrt(2)
    bordas = np.linspace(-c, c, n_faixas + 1)
    y = (bordas[:-1] + bordas[1:]) / 2
    return y, 2 * (c - np.abs(y)) * np.diff(bordas)


def barras_circulares(n, raio_cm, giro=0.0):
    # Ordenadas das n barras distribuídas no círculo de raio raio_cm.
    ang = giro + 2 * math.pi * np.arange(n) / n
    return raio_cm * np.sin(ang)


def barras_quadradas(n, lado_util_cm, diagonal=False):
    # n múltiplo de 4, cantos incluídos, espaçamento igual no perímetro.
    c = lado_util_cm
    s = 4 * c * np.arange(n) / n
    lado, t = np.floor(s / c), s % c
    x = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + t, c / 2 + 0 * t, c / 2 - t], -c / 2 + 0 * t)
    y = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + 0 * t, -c / 2 + t, c / 2 + 0 * t], c / 2 - t)
    return (x + y) / math.sqrt(2) if diagonal else y


class Envoltoria:
    # Pré-calcula, ao longo do contorno último (t de 0 a 3), as parcelas
    # do concreto (Nc, Mc) e as do aço por cm² de armadura (ns, ms).
    # Assim, para qualquer As: N(t) = Nc + As·ns e M(t) = Mc + As·ms.
    def __init__(self, y_conc, a_conc, y_barras, sigma_cd, fyd, fck_mpa, n_pontos=900):
        ec2, ecu, nexp = parametros_concreto(fck_mpa)
        passo = float(y_conc[1] - y_conc[0])
        ymax_c, ymin_c = float(np.max(y_conc)) + passo / 2, float(np.min(y_conc)) - passo / 2
        h = ymax_c - ymin_c
        d = ymax_c - float(np.min(y_barras))
        t = np.linspace(0.0, 3.0, n_pontos)
        # deformação no topo (ymax_c) e curvatura para cada t
        e_topo = np.empty_like(t)
        curv = np.empty_like(t)
        a = t <= 1
        e_topo[a] = -EPS_SU + t[a] * (ecu + EPS_SU)
        curv[a] = (e_topo[a] + EPS_SU) / d
        b = (t > 1) & (t <= 2)
        xa = ecu / (ecu + EPS_SU) * d
        x = xa + (t[b] - 1) * (h - xa)
        e_topo[b] = ecu
        curv[b] = ecu / x
        c = t > 2
        e_base = (t[c] - 2) * ec2
        hc = (1 - ec2 / ecu) * h
        curv[c] = (ec2 - e_base) / (h - hc)
        e_topo[c] = ec2 + curv[c] * hc
        self.t, self.e_topo, self.curv, self.ymax = t, e_topo, curv, ymax_c
        eps_c = e_topo[:, None] - curv[:, None] * (ymax_c - y_conc[None, :])
        ec = np.clip(eps_c, 0.0, ec2)
        sig_c = np.where(eps_c > 0, sigma_cd * (1 - (1 - ec / ec2) ** nexp), 0.0)
        self.Nc = sig_c @ a_conc
        self.Mc = sig_c @ (a_conc * y_conc)
        eps_s = e_topo[:, None] - curv[:, None] * (ymax_c - y_barras[None, :])
        sig_s = np.clip(ES_KGF_CM2 * eps_s, -fyd, fyd)
        nb = len(y_barras)
        self.ns = sig_s.sum(axis=1) / nb
        self.ms = (sig_s @ y_barras) / nb

    def curva(self, As):
        return self.Nc + As * self.ns, self.Mc + As * self.ms

    def momento_resistente(self, Nd, As):
        # MRd (kgf·cm) para o esforço normal Nd (kgf); -inf se Nd fora da envoltória.
        N, M = self.curva(As)
        if not (N[0] <= Nd <= N[-1]):
            return -math.inf
        i = int(np.searchsorted(N, Nd))
        i = min(max(i, 1), len(N) - 1)
        n0, n1 = N[i - 1], N[i]
        f = 0.0 if n1 == n0 else (Nd - n0) / (n1 - n0)
        return float(M[i - 1] + f * (M[i] - M[i - 1]))

    def as_necessaria(self, Nd, Md, as_max):
        # Menor As (cm²) com (Nd, |Md|) dentro da envoltória; None se > as_max.
        Md = abs(Md)
        if self.momento_resistente(Nd, 0.0) >= Md:
            return 0.0
        if self.momento_resistente(Nd, as_max) < Md:
            return None
        lo, hi = 0.0, as_max
        for _ in range(60):
            m = (lo + hi) / 2
            if self.momento_resistente(Nd, m) >= Md:
                hi = m
            else:
                lo = m
        return hi


def envoltoria_pontos(env, As, n=60):
    # Pontos (Nd kgf, Md kgf·m) do ramo positivo da envoltória, para gráfico/relatório.
    N, M = env.curva(As)
    idx = np.unique(np.linspace(0, len(N) - 1, n).astype(int))
    return [[float(N[i]), float(M[i]) / 100] for i in idx]


def alfa_c(fck_mpa):
    # NBR 6118:2023, 17.2.2 — fator do bloco de tensões (0,85 até C50).
    return 0.85 if fck_mpa <= 50 else 0.85 * (1 - (fck_mpa - 50) / 200)


def _casos_n1(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    # Esforços de cálculo de todas as hipóteses: Nd > 0 compressão, Nd < 0 tração.
    casos = []
    for tipo, sinal, cargas in (("compressão", 1, cargas_compressao), ("tração", -1, cargas_tracao)):
        for carga in cargas:
            nd = arred_excel(carga.vertical_kgf * materiais.coef_estrutural, 0)
            md = momento_no_fuste(carga, solo, geometria, materiais, fatores["Kp"], excentricidade_vertical_mm, excentricidade_horizontal_mm)
            casos.append({"tipo": tipo, "hipotese": carga.hipotese, "nd": nd, "Nd": sinal * nd, "md": md})
    return casos


def _raio_barras_cm(geometria, materiais, bitola_mm, bitola_estribo_mm):
    return geometria.diametro_m * 100 / 2 - materiais.cobrimento_cm - bitola_estribo_mm / 10 - bitola_mm / 20


def _classificar_espacamento(espacamento_cm, armaduras):
    if armaduras.espacamento_longitudinal_ideal_min_cm <= espacamento_cm <= armaduras.espacamento_longitudinal_ideal_max_cm:
        return "IDEAL", 0, abs(espacamento_cm - 11.0)
    if armaduras.espacamento_longitudinal_min_cm <= espacamento_cm <= armaduras.espacamento_longitudinal_max_cm:
        return "ACEITÁVEL", 1, min(abs(espacamento_cm - armaduras.espacamento_longitudinal_ideal_min_cm),
                                   abs(espacamento_cm - armaduras.espacamento_longitudinal_ideal_max_cm))
    return "REVER", 2, min(abs(espacamento_cm - armaduras.espacamento_longitudinal_min_cm),
                           abs(espacamento_cm - armaduras.espacamento_longitudinal_max_cm))


def _verificar_barras(casos, y_conc, a_conc, n_barras, raio_cm, area_barra_cm2, sigma_cd, fyd, fck_mpa):
    # Verifica as barras reais (n, Ø) nas duas posições extremas do arranjo
    # (barra no eixo de flexão ou entre barras) e devolve o pior caso.
    envs = [Envoltoria(y_conc, a_conc, barras_circulares(n_barras, raio_cm, g), sigma_cd, fyd, fck_mpa)
            for g in (0.0, math.pi / n_barras)]
    As = n_barras * area_barra_cm2
    pior = None
    for c in casos:
        mrd = min(env.momento_resistente(c["Nd"], As) for env in envs) / 100
        util = math.inf if mrd <= 0 else abs(c["md"]) / mrd
        if pior is None or util > pior["utilizacao"]:
            pior = {"caso": c, "MRd_kgfm": mrd, "utilizacao": util}
    env_pior = min(envs, key=lambda e: e.momento_resistente(pior["caso"]["Nd"], As))
    return pior, env_pior


def selecionar_bitola_envoltoria(casos, geometria, materiais, armaduras, bitola_estribo_mm):
    # Para cada bitola: As pela envoltória (anel denso de barras), número de
    # barras pela área e pela faixa de espaçamento, e verificação final com as
    # barras discretas — acrescenta barras até que todas as hipóteses atendam.
    d_cm = geometria.diametro_m * 100
    area_secao_cm2 = math.pi * d_cm ** 2 / 4
    as_max = 0.08 * area_secao_cm2  # NBR 6118, 17.3.5.3.2
    fyd = materiais.fyd_mpa * 10
    sigma_cd = alfa_c(materiais.fck_mpa) * materiais.fcd_mpa * 10
    y_conc, a_conc = secao_circular(d_cm)
    as_minima = arred_excel(armaduras.taxa_minima_longitudinal * area_secao_cm2, 2)
    alternativas = []

    for bitola_mm in sorted(armaduras.bitolas_longitudinais_disponiveis_mm):
        phi_cm = bitola_mm / 10
        area_barra_cm2 = math.pi * phi_cm ** 2 / 4
        raio = _raio_barras_cm(geometria, materiais, bitola_mm, bitola_estribo_mm)
        anel = Envoltoria(y_conc, a_conc, barras_circulares(48, raio), sigma_cd, fyd, materiais.fck_mpa)
        as_casos = []
        for c in casos:
            As = anel.as_necessaria(c["Nd"], c["md"] * 100, as_max)
            if As is None:
                raise ValueError(f"Hipótese {c['hipotese']} ({c['tipo']}): As > 8% da seção com Ø {bitola_mm:g} — aumentar o diâmetro.")
            as_casos.append(As)
        i_gov = int(np.argmax(as_casos))
        as_calculada = arred_cima_excel(as_casos[i_gov], 2)
        as_requerida = max(as_calculada, as_minima)

        perimetro_util_cm = math.pi * (d_cm - 2 * materiais.cobrimento_cm - phi_cm - 2 * bitola_estribo_mm / 10)
        n_por_area = int(arred_cima_excel(as_requerida / area_barra_cm2, 0))
        n_para_faixa_ideal = math.ceil(perimetro_util_cm / armaduras.espacamento_longitudinal_ideal_max_cm)
        n_barras = max(n_por_area, n_para_faixa_ideal, 6)
        while True:
            pior, env = _verificar_barras(casos, y_conc, a_conc, n_barras, raio, area_barra_cm2, sigma_cd, fyd, materiais.fck_mpa)
            if pior["utilizacao"] <= 1 or n_barras * area_barra_cm2 > as_max:
                break
            n_barras += 1
        espacamento_cm = arred_excel(perimetro_util_cm / n_barras, 1)
        faixa, prioridade, distancia_ideal = _classificar_espacamento(espacamento_cm, armaduras)
        as_adotada_cm2 = arred_excel(area_barra_cm2 * n_barras, 2)
        alternativas.append({
            "bitola_mm": bitola_mm, "area_barra_cm2": area_barra_cm2, "raio_barras_cm": raio,
            "as_casos_cm2": as_casos, "caso_governante": casos[i_gov], "as_calculada_cm2": as_calculada,
            "as_requerida_cm2": as_requerida, "n_por_area": n_por_area, "n_barras": n_barras,
            "as_adotada_cm2": as_adotada_cm2, "espacamento_cm": espacamento_cm, "faixa": faixa,
            "prioridade": prioridade if pior["utilizacao"] <= 1 else 3, "distancia_ideal": distancia_ideal,
            "excesso_aco_cm2": as_adotada_cm2 - as_requerida, "verificacao": pior, "envoltoria": env,
        })

    if not alternativas:
        raise ValueError("Informe ao menos uma bitola longitudinal disponível.")
    escolhida = min(alternativas, key=lambda item: (item["prioridade"], item["excesso_aco_cm2"], item["distancia_ideal"], item["bitola_mm"]))
    return escolhida, alternativas


def dimensionar_n1_envoltoria(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, armaduras, bitola_estribo_mm, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    casos = _casos_n1(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, excentricidade_vertical_mm, excentricidade_horizontal_mm)
    escolha, alternativas = selecionar_bitola_envoltoria(casos, geometria, materiais, armaduras, bitola_estribo_mm)
    d_cm = geometria.diametro_m * 100
    area_secao_cm2 = math.pi * d_cm ** 2 / 4
    sigma_cd = alfa_c(materiais.fck_mpa) * materiais.fcd_mpa * 10
    fyd = materiais.fyd_mpa * 10

    compressao = [c for c in casos if c["tipo"] == "compressão"]
    tracao = [(c, a) for c, a in zip(casos, escolha["as_casos_cm2"]) if c["tipo"] == "tração"]
    caso_c = max(compressao, key=lambda c: c["md"]) if compressao else {"hipotese": "", "nd": 0, "md": 0}
    caso_t = max(tracao, key=lambda x: x[1])[0] if tracao else {"hipotese": "", "nd": 0, "md": 0}
    gov = escolha["caso_governante"]

    # ν e μ no padrão da planilha (referência para comparar com o ábaco)
    nd, md = caso_t["nd"], caso_t["md"]
    nu = (1 / (0.85 * materiais.fcd_mpa * 10)) * nd / d_cm ** 2
    mu = nu * (abs(md) / nd / geometria.diametro_m) if nd else 0.0
    tabela = ABACO_54 if geometria.diametro_m * 0.05 >= materiais.cobrimento_cm / 100 else ABACO_52
    try:
        omega_abaco = interpolar_abaco(nu, mu, tabela)
    except ValueError:
        omega_abaco = None

    as_calculada = escolha["as_calculada_cm2"]
    omega = as_calculada * fyd / (area_secao_cm2 * sigma_cd)
    rho_percentual = arred_cima_excel(as_calculada / area_secao_cm2 * 100, 3)
    as_minima = arred_excel(armaduras.taxa_minima_longitudinal * area_secao_cm2, 2)
    as_requerida = max(as_calculada, as_minima)

    bitola_longitudinal_mm = escolha["bitola_mm"]
    n_barras = escolha["n_barras"]
    as_adotada = escolha["as_adotada_cm2"]
    verif = escolha["verificacao"]

    phi_cm = bitola_longitudinal_mm / 10
    lb = max(phi_cm / 4 * (materiais.fyd_mpa / materiais.fbd_mpa), phi_cm * 25)
    lb_min = max(0.3 * lb, 10 * phi_cm, 10)
    fator_momento = 1 if gov["md"] == 0 else 2
    transpasse_calculado = (
        fator_momento * (lb_min if as_calculada == 0 else
        armaduras.alfa_gancho * (as_calculada / as_adotada) * max(lb, lb_min))
    )
    transpasse = _arredondar_transpasse(transpasse_calculado, fator_momento)

    print(f"Solo {solo.nome} | N1 pela envoltória N×M (NBR 6118) | Ø {bitola_longitudinal_mm:g} mm, barras no raio {escolha['raio_barras_cm']:.1f} cm")
    for c, a in zip(casos, escolha["as_casos_cm2"]):
        print(f"   {c['tipo']:<11} {c['hipotese']:<12} Nd = {c['nd']:>9.0f} kgf  Md = {c['md']:>9.0f} kgf·m  ->  As = {a:6.2f} cm²")
    print(f"   Governa: {gov['tipo']} {gov['hipotese']} | As,calc = {as_calculada:.2f} cm² (ω = {omega:.3f}"
          + (f"; ábaco ω = {omega_abaco:.3f}" if omega_abaco is not None else "; fora do ábaco") + f") | As,mín = {as_minima:.2f} cm²")
    print(f"   Adotado: {n_barras} Ø {bitola_longitudinal_mm:g} mm = {as_adotada:.2f} cm² | pior hipótese {verif['caso']['hipotese']}: "
          f"Md = {abs(verif['caso']['md']):.0f} kgf·m ≤ MRd = {verif['MRd_kgfm']:.0f} kgf·m (utilização {verif['utilizacao']:.2f})")

    return {
        "hipotese_compressao_n1": caso_c["hipotese"], "Nd_compressao_kgf": caso_c["nd"], "Md_compressao_kgfm": caso_c["md"],
        "hipotese_tracao_n1": caso_t["hipotese"], "Nd_tracao_kgf": nd, "Md_tracao_kgfm": md,
        "nu": nu, "mu": mu, "omega": omega, "omega_abaco": omega_abaco, "rho_percentual": rho_percentual,
        "As_calculada_cm2": as_calculada, "As_minima_cm2": as_minima, "As_requerida_cm2": as_requerida,
        "As_adotada_cm2": as_adotada, "bitola_longitudinal_mm": bitola_longitudinal_mm,
        "quantidade_minima_por_area": escolha["n_por_area"], "quantidade_barras": n_barras,
        "espacamento_longitudinal_cm": escolha["espacamento_cm"], "faixa_espacamento_n1": escolha["faixa"],
        "transpasse_cm": transpasse,
        "metodo_n1": "Envoltória N×M — NBR 6118",
        "caso_governante_n1": f"{gov['tipo']} {gov['hipotese']}",
        "MRd_n1_kgfm": verif["MRd_kgfm"], "utilizacao_n1": verif["utilizacao"],
        "hipotese_verificacao_n1": verif["caso"]["hipotese"],
        "casos_n1": [{"tipo": c["tipo"], "hipotese": c["hipotese"], "Nd_kgf": c["Nd"], "Md_kgfm": c["md"], "As_cm2": a}
                     for c, a in zip(casos, escolha["as_casos_cm2"])],
        "envoltoria_n1": envoltoria_pontos(escolha["envoltoria"], n_barras * escolha["area_barra_cm2"]),
        "alternativas_n1": [{"bitola_mm": a["bitola_mm"], "n_barras": a["n_barras"], "As_calculada_cm2": a["as_calculada_cm2"],
                             "As_adotada_cm2": a["as_adotada_cm2"], "espacamento_cm": a["espacamento_cm"], "faixa": a["faixa"],
                             "utilizacao": a["verificacao"]["utilizacao"]} for a in alternativas],
    }


def dimensionar_n1(*args, **kwargs):
    # METODO_N1 = "envoltoria" (padrão) ou "abaco" (planilha original).
    if METODO_N1 == "abaco":
        return dimensionar_n1_abaco(*args, **kwargs)
    return dimensionar_n1_envoltoria(*args, **kwargs)


def _arredondar_transpasse(transpasse_calculado, fator_momento):
    # Adota sempre o próximo múltiplo de 5 cm, sem reduzir o valor calculado.
    return math.ceil(transpasse_calculado / 5) * 5


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
    global MATERIAIS, SOLOS, GEOMETRIAS, CARGAS_COMPRESSAO, CARGAS_TRACAO, ARMADURAS, METODO_N1
    e = json.loads(entrada_json)
    METODO_N1 = e.get("metodo_n1", "envoltoria")
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
