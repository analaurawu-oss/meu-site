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
    k = 4 * np.arange(n)
    lado, t = k // n, (k % n) / n * c  # inteiros: evita barra de canto no lado errado
    x = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + t, c / 2 + 0 * t, c / 2 - t], -c / 2 + 0 * t)
    y = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + 0 * t, -c / 2 + t, c / 2 + 0 * t], c / 2 - t)
    return (x + y) / math.sqrt(2) if diagonal else y


def caminho_ultimo(t, h, d, ec2, ecu):
    # Deformação na fibra mais comprimida e curvatura ao longo do contorno
    # último: t 0→1 polo A (aço a 10 ‰), 1→2 polo B (εcu), 2→3 polo C (εc2).
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
    return e_topo, curv


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
        e_topo, curv = caminho_ultimo(t, h, d, ec2, ecu)
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

# ---------------------------------------------------------------------
# Flexão oblíqua: contorno resistente Mx × My para um Nd fixo.
# A linha neutra gira em torno da seção; para cada inclinação acha-se, no
# contorno último, o estado com N = Nd e calculam-se Mx = Σσ·y·A e
# My = Σσ·x·A (kgf·m). Seção discretizada em fibras (x, y, área).
# ---------------------------------------------------------------------
def fibras_circulo(diametro_cm, n=44):
    r = diametro_cm / 2
    passo = diametro_cm / n
    g = -r + passo * (np.arange(n) + 0.5)
    x, y = np.meshgrid(g, g)
    dentro = x ** 2 + y ** 2 <= r * r
    x, y = x[dentro], y[dentro]
    a = np.full(x.shape, math.pi * r * r / len(x))  # área total exata
    ang = np.linspace(0, 2 * math.pi, 181)
    return (x, y, a), (r * np.cos(ang), r * np.sin(ang))


def fibras_quadrado(lado_cm, n=40):
    passo = lado_cm / n
    g = -lado_cm / 2 + passo * (np.arange(n) + 0.5)
    x, y = np.meshgrid(g, g)
    c = lado_cm / 2
    return (x.ravel(), y.ravel(), np.full(n * n, passo * passo)), (np.array([-c, c, c, -c]), np.array([-c, -c, c, c]))


def barras_circulares_xy(n, raio_cm):
    ang = 2 * math.pi * np.arange(n) / n
    return raio_cm * np.cos(ang), raio_cm * np.sin(ang)


def barras_quadradas_xy(n, lado_util_cm):
    c = lado_util_cm
    k = 4 * np.arange(n)
    lado, t = k // n, (k % n) / n * c
    x = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + t, c / 2 + 0 * t, c / 2 - t], -c / 2 + 0 * t)
    y = np.select([lado == 0, lado == 1, lado == 2], [-c / 2 + 0 * t, -c / 2 + t, c / 2 + 0 * t], c / 2 - t)
    return x, y


def contorno_mxmy(fibras, borda, barras, area_barra_cm2, lista_nd, sigma_cd, fyd, fck_mpa, n_ang=40, n_t=260):
    # Devolve, para cada Nd (kgf) da lista, os pontos [Mx, My] (kgf·m) do
    # contorno resistente; None se o Nd estiver fora da capacidade da seção.
    xc, yc, ac = fibras
    bx, by = borda
    xs, ys = barras
    ec2, ecu, nexp = parametros_concreto(fck_mpa)
    t = np.linspace(0.0, 3.0, n_t)
    saida = [[] for _ in lista_nd]
    for alfa in np.linspace(0, 2 * math.pi, n_ang, endpoint=False):
        s, c = math.sin(alfa), math.cos(alfa)
        v_c, v_b, v_s = xc * s + yc * c, bx * s + by * c, xs * s + ys * c
        vmax = float(v_b.max())
        h = vmax - float(v_b.min())
        d = vmax - float(v_s.min())
        e_topo, curv = caminho_ultimo(t, h, d, ec2, ecu)
        eps_c = e_topo[:, None] - curv[:, None] * (vmax - v_c[None, :])
        ec = np.clip(eps_c, 0.0, ec2)
        sig_c = np.where(eps_c > 0, sigma_cd * (1 - (1 - ec / ec2) ** nexp), 0.0) * ac[None, :]
        sig_s = np.clip(ES_KGF_CM2 * (e_topo[:, None] - curv[:, None] * (vmax - v_s[None, :])), -fyd, fyd) * area_barra_cm2
        N = sig_c.sum(axis=1) + sig_s.sum(axis=1)
        Mx = (sig_c @ yc + sig_s @ ys) / 100
        My = (sig_c @ xc + sig_s @ xs) / 100
        for k, nd in enumerate(lista_nd):
            if saida[k] is None or not (N[0] <= nd <= N[-1]):
                saida[k] = None
                continue
            i = min(max(int(np.searchsorted(N, nd)), 1), len(N) - 1)
            f = 0.0 if N[i] == N[i - 1] else (nd - N[i - 1]) / (N[i] - N[i - 1])
            saida[k].append([float(Mx[i - 1] + f * (Mx[i] - Mx[i - 1])), float(My[i - 1] + f * (My[i] - My[i - 1]))])
    return saida



def alfa_c(fck_mpa):
    # NBR 6118:2023, 17.2.2 — fator do bloco de tensões (0,85 até C50).
    return 0.85 if fck_mpa <= 50 else 0.85 * (1 - (fck_mpa - 50) / 200)


def _casos_n1(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    # Esforços de cálculo de todas as hipóteses: Nd > 0 compressão, Nd < 0 tração.
    # Na compressão aplica M1d,mín (NBR 6118, 11.3.3.4.3) e o efeito local de
    # 2ª ordem pelo pilar-padrão com curvatura aproximada (15.8.3.3.2), com o
    # fuste tratado como balanço engastado na profundidade do momento máximo.
    d_m = geometria.diametro_m
    area_cm2 = math.pi * (d_m * 100) ** 2 / 4
    casos = []
    for tipo, sinal, cargas in (("compressão", 1, cargas_compressao), ("tração", -1, cargas_tracao)):
        for carga in cargas:
            nd = arred_excel(carga.vertical_kgf * materiais.coef_estrutural, 0)
            md = momento_no_fuste(carga, solo, geometria, materiais, fatores["Kp"], excentricidade_vertical_mm, excentricidade_horizontal_mm)
            c = {"tipo": tipo, "hipotese": carga.hipotese, "nd": nd, "Nd": sinal * nd, "md": md, "md1": md,
                 "ht": abs(carga.transversal_kgf), "hl": abs(carga.longitudinal_kgf),
                 "m1d_min": 0.0, "lambda": 0.0, "lambda_lim": 0.0, "m2d": 0.0, "m1d_min_2a": 0.0,
                 # momento no topo do fuste (sem o braço da carga horizontal)
                 "m_topo": materiais.coef_estrutural * (carga.horizontal_kgf * excentricidade_horizontal_mm - carga.vertical_kgf * excentricidade_vertical_mm) / 1000}
            if tipo == "compressão" and nd > 0:
                m1 = max(abs(md), nd * (0.015 + 0.03 * d_m))
                h = carga.horizontal_kgf
                ell = geometria.afloramento_max_m + (0.545 * math.sqrt(h / (solo.gamma_kgf_m3 * d_m * fatores["Kp"])) if h > 0 else 0.0)
                le = 2 * ell
                lam = le / (d_m / 4)
                lam_lim = min(90.0, max(35.0, (25 + 12.5 * (m1 / nd) / d_m) / 0.9))  # αb = 0,90 (balanço)
                if lam > 90:
                    raise ValueError(f"Hipótese {carga.hipotese}: esbeltez do fuste λ = {lam:.1f} > 90 — método de 2ª ordem não habilitado.")
                m2 = 0.0
                md_tot = m1
                nu_nbr = nd / (area_cm2 * materiais.fcd_mpa * 10)
                curvatura = min(0.005 / (d_m * (nu_nbr + 0.5)), 0.005 / d_m)
                m2_curv = nd * le ** 2 / 10 * curvatura
                if lam > lam_lim:
                    m2 = m2_curv
                    md_tot = max(m1, 0.9 * m1 + m2)
                # Envoltória mínima com 2ª ordem (15.3.2): M1d,mín + M2d, com αb = 1,0
                # e λ1 calculado com a excentricidade mínima de 1ª ordem.
                m1d_min = nd * (0.015 + 0.03 * d_m)
                lam_lim_min = min(90.0, max(35.0, 25 + 12.5 * (0.015 + 0.03 * d_m) / d_m))
                c.update(md=md_tot, m1d_min=m1d_min, m1d_min_2a=m1d_min + (m2_curv if lam > lam_lim_min else 0.0),
                         **{"lambda": lam, "lambda_lim": lam_lim, "m2d": m2, "lambda_lim_min": lam_lim_min})
            casos.append(c)
    return casos


def _raio_barras_cm(geometria, materiais, bitola_mm, bitola_estribo_mm):
    return geometria.diametro_m * 100 / 2 - materiais.cobrimento_cm - bitola_estribo_mm / 10 - bitola_mm / 20


def _mrd_barras(env_args, n_barras, raio_cm, area_barra_cm2, Nd):
    # MRd (kgf·m) das barras reais, na pior posição do arranjo (barra no
    # eixo de flexão ou entre barras). Só para informar a utilização.
    y_conc, a_conc, sigma_cd, fyd, fck_mpa = env_args
    As = n_barras * area_barra_cm2
    envs = [Envoltoria(y_conc, a_conc, barras_circulares(n_barras, raio_cm, g), sigma_cd, fyd, fck_mpa)
            for g in (0.0, math.pi / n_barras)]
    env = min(envs, key=lambda e: e.momento_resistente(Nd, As))
    return env.momento_resistente(Nd, As) / 100, env


# Lançamento dos momentos no plano Mx × My:
#   "eixo"       → momento resultante no eixo Mx (My = 0), como no P-Calc;
#   "componentes" → decomposto pelas cargas transversal (Mx) e longitudinal (My).
# Na seção circular a direção não altera o MRd; só muda a posição do ponto.
LANCAMENTO_MXMY = "eixo"


def _componentes_mxmy(md, ht, hl, tipo="compressão"):
    if LANCAMENTO_MXMY == "eixo":
        # compressão em +Mx e tração em −Mx, para os pontos não se sobreporem
        return (abs(md) if tipo == "compressão" else -abs(md)), 0.0
    h = math.hypot(ht, hl)
    return (abs(md), 0.0) if h == 0 else (abs(md) * ht / h, abs(md) * hl / h)


def _mxmy_tubulao(casos, as_casos, geometria, n_barras, raio, area_barra_cm2, sigma_cd, fyd, fck_mpa):
    # Plano Mx × My: contornos resistentes das barras adotadas no Nd da hipótese
    # crítica de compressão e de tração, elipse de M1d,mín e pontos solicitantes.
    d_m = geometria.diametro_m
    grupos = {}
    for c, a in zip(casos, as_casos):
        if c["tipo"] not in grupos or a > grupos[c["tipo"]][1]:
            grupos[c["tipo"]] = (c, a)
    tipos = list(grupos)
    fib, borda = fibras_circulo(d_m * 100)
    contornos = contorno_mxmy(fib, borda, barras_circulares_xy(n_barras, raio), area_barra_cm2,
                              [grupos[t][0]["Nd"] for t in tipos], sigma_cd, fyd, fck_mpa)
    saida = {"casos": [], "contornos": []}
    for t, pts in zip(tipos, contornos):
        c = grupos[t][0]
        item = {"tipo": t, "hipotese": c["hipotese"], "Nd_kgf": c["Nd"], "pontos": pts, "secoes": []}
        # Seções do fuste: topo, intermediária (média linear) e base = seção crítica
        # (profundidade do momento máximo), esta já com a 2ª ordem quando houver.
        # diagrama linear de 1ª ordem entre topo (−V·e_v + H·e_h) e base: média com sinal
        for nome, m in (("topo", abs(c["m_topo"])), ("intermediária", abs(c["m_topo"] + c["md1"]) / 2), ("base", abs(c["md"]))):
            mx, my = _componentes_mxmy(m, c["ht"], c["hl"], t)
            item["secoes"].append({"secao": nome, "M_kgfm": m, "Mx_kgfm": mx, "My_kgfm": my})
        if t == "compressão":
            item["m1d_min_xx"] = item["m1d_min_yy"] = c["m1d_min"]
            item["m1d_min_2a_xx"] = item["m1d_min_2a_yy"] = c["m1d_min_2a"]
        saida["contornos"].append(item)
    for c in casos:
        mx, my = _componentes_mxmy(c["md"], c["ht"], c["hl"], c["tipo"])
        saida["casos"].append({"tipo": c["tipo"], "hipotese": c["hipotese"], "Nd_kgf": c["Nd"], "Mx_kgfm": mx, "My_kgfm": my})
    return saida


def dimensionar_n1_envoltoria(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, armaduras, bitola_estribo_mm, excentricidade_vertical_mm, excentricidade_horizontal_mm):
    # Uma única análise pela envoltória N×M define a As; as bitolas saem
    # dessa área pelo mesmo critério da planilha (selecionar_bitola_longitudinal).
    casos = _casos_n1(solo, geometria, materiais, fatores, cargas_compressao, cargas_tracao, excentricidade_vertical_mm, excentricidade_horizontal_mm)
    d_cm = geometria.diametro_m * 100
    area_secao_cm2 = math.pi * d_cm ** 2 / 4
    sigma_cd = alfa_c(materiais.fck_mpa) * materiais.fcd_mpa * 10
    fyd = materiais.fyd_mpa * 10
    y_conc, a_conc = secao_circular(d_cm)
    env_args = (y_conc, a_conc, sigma_cd, fyd, materiais.fck_mpa)

    # Barras de referência: maior bitola disponível (menor braço, a favor da segurança).
    bitola_ref_mm = max(armaduras.bitolas_longitudinais_disponiveis_mm)
    raio_ref = _raio_barras_cm(geometria, materiais, bitola_ref_mm, bitola_estribo_mm)
    anel = Envoltoria(y_conc, a_conc, barras_circulares(48, raio_ref), sigma_cd, fyd, materiais.fck_mpa)
    as_max = 0.08 * area_secao_cm2  # NBR 6118, 17.3.5.3.2
    as_casos = []
    for c in casos:
        As = anel.as_necessaria(c["Nd"], c["md"] * 100, as_max)
        if As is None:
            raise ValueError(f"Hipótese {c['hipotese']} ({c['tipo']}): As > 8% da seção — aumentar o diâmetro.")
        as_casos.append(As)
    i_gov = int(np.argmax(as_casos))
    gov = casos[i_gov]

    compressao = [c for c in casos if c["tipo"] == "compressão"]
    tracao = [(c, a) for c, a in zip(casos, as_casos) if c["tipo"] == "tração"]
    caso_c = max(compressao, key=lambda c: c["md"]) if compressao else {"hipotese": "", "nd": 0, "md": 0}
    caso_t = max(tracao, key=lambda x: x[1])[0] if tracao else {"hipotese": "", "nd": 0, "md": 0}

    # ν e μ no padrão da planilha (referência para comparar com o ábaco)
    nd, md = caso_t["nd"], caso_t["md"]
    nu = (1 / (0.85 * materiais.fcd_mpa * 10)) * nd / d_cm ** 2
    mu = nu * (abs(md) / nd / geometria.diametro_m) if nd else 0.0
    tabela = ABACO_54 if geometria.diametro_m * 0.05 >= materiais.cobrimento_cm / 100 else ABACO_52
    try:
        omega_abaco = interpolar_abaco(nu, mu, tabela)
    except ValueError:
        omega_abaco = None

    as_calculada = arred_cima_excel(as_casos[i_gov], 2)
    omega = as_calculada * fyd / (area_secao_cm2 * sigma_cd)
    rho_percentual = arred_cima_excel(as_calculada / area_secao_cm2 * 100, 3)
    as_minima = arred_excel(armaduras.taxa_minima_longitudinal * area_secao_cm2, 2)
    as_requerida = max(as_calculada, as_minima)

    escolha, alternativas = selecionar_bitola_longitudinal(
        as_requerida, geometria, materiais, armaduras, bitola_estribo_mm
    )
    bitola_longitudinal_mm = escolha["bitola_mm"]
    n_barras = escolha["n_barras"]
    as_adotada = escolha["as_adotada_cm2"]
    espacamento = escolha["espacamento_cm"]

    raio = _raio_barras_cm(geometria, materiais, bitola_longitudinal_mm, bitola_estribo_mm)
    mrd, env_adotada = _mrd_barras(env_args, n_barras, raio, escolha["area_barra_cm2"], gov["Nd"])
    utilizacao = math.inf if mrd <= 0 else abs(gov["md"]) / mrd

    phi_cm = bitola_longitudinal_mm / 10
    lb = max(phi_cm / 4 * (materiais.fyd_mpa / materiais.fbd_mpa), phi_cm * 25)
    lb_min = max(0.3 * lb, 10 * phi_cm, 10)
    fator_momento = 1 if gov["md"] == 0 else 2
    transpasse_calculado = (
        fator_momento * (lb_min if as_calculada == 0 else
        armaduras.alfa_gancho * (as_calculada / as_adotada) * max(lb, lb_min))
    )
    transpasse = _arredondar_transpasse(transpasse_calculado, fator_momento)

    print(f"Solo {solo.nome} | N1 pela envoltória N×M (NBR 6118) | barras de referência Ø {bitola_ref_mm:g} mm no raio {raio_ref:.1f} cm")
    for c, a in zip(casos, as_casos):
        extra = ""
        if c["tipo"] == "compressão":
            extra = f"  [M1d = {abs(c['md1']):.0f}, M1d,mín = {c['m1d_min']:.0f}, λ = {c['lambda']:.1f} (λ1 = {c['lambda_lim']:.1f})" + (f", M2d = {c['m2d']:.0f}]" if c["m2d"] else ", sem 2ª ordem]")
        print(f"   {c['tipo']:<11} {c['hipotese']:<12} Nd = {c['nd']:>9.0f} kgf  Md = {abs(c['md']):>9.0f} kgf·m  ->  As = {a:6.2f} cm²{extra}")
    print(f"   Governa: {gov['tipo']} {gov['hipotese']} | As,calc = {as_calculada:.2f} cm² (ω = {omega:.3f}"
          + (f"; ábaco ω = {omega_abaco:.3f}" if omega_abaco is not None else "; fora do ábaco") + f") | As,mín = {as_minima:.2f} cm²")
    print(f"   Adotado: {n_barras} Ø {bitola_longitudinal_mm:g} mm = {as_adotada:.2f} cm² | "
          f"Md = {abs(gov['md']):.0f} kgf·m, MRd = {mrd:.0f} kgf·m (utilização {utilizacao:.2f})")

    mxmy = _mxmy_tubulao(casos, as_casos, geometria, n_barras, raio, escolha["area_barra_cm2"], sigma_cd, fyd, materiais.fck_mpa)

    return {
        "mxmy_n1": mxmy,
        "hipotese_compressao_n1": caso_c["hipotese"], "Nd_compressao_kgf": caso_c["nd"], "Md_compressao_kgfm": caso_c["md"],
        "hipotese_tracao_n1": caso_t["hipotese"], "Nd_tracao_kgf": nd, "Md_tracao_kgfm": md,
        "nu": nu, "mu": mu, "omega": omega, "omega_abaco": omega_abaco, "rho_percentual": rho_percentual,
        "As_calculada_cm2": as_calculada, "As_minima_cm2": as_minima, "As_requerida_cm2": as_requerida,
        "As_adotada_cm2": as_adotada, "bitola_longitudinal_mm": bitola_longitudinal_mm,
        "quantidade_minima_por_area": escolha["n_por_area"], "quantidade_barras": n_barras,
        "espacamento_longitudinal_cm": espacamento, "faixa_espacamento_n1": escolha["faixa"],
        "transpasse_cm": transpasse,
        "metodo_n1": "Envoltória N×M — NBR 6118",
        "caso_governante_n1": f"{gov['tipo']} {gov['hipotese']}",
        "hipotese_verificacao_n1": gov["hipotese"],
        "MRd_n1_kgfm": mrd, "utilizacao_n1": utilizacao,
        "casos_n1": [{"tipo": c["tipo"], "hipotese": c["hipotese"], "Nd_kgf": c["Nd"], "Md_kgfm": abs(c["md"]), "M1d_kgfm": abs(c["md1"]),
                      "M1d_min_kgfm": c["m1d_min"], "M2d_kgfm": c["m2d"], "lambda": c["lambda"], "lambda_lim": c["lambda_lim"], "As_cm2": a}
                     for c, a in zip(casos, as_casos)],
        "envoltoria_n1": envoltoria_pontos(env_adotada, n_barras * escolha["area_barra_cm2"]),
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
    global LANCAMENTO_MXMY
    LANCAMENTO_MXMY = e.get("lancamento_mxmy", "eixo")
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
