# =====================================================================
# SAPATA — motor de cálculo
# Gerado a partir de SAPATA.ipynb (tabelas, funções e verificações).
# A interface chama rodar(entrada_json). Para atualizar, substitua as
# funções abaixo pelas novas versões do notebook, mantendo rodar().
# =====================================================================


import math
from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING
import numpy as np
import pandas as pd

def arred(x, casas=0):
    return float(Decimal(str(x)).quantize(Decimal('1').scaleb(-casas), rounding=ROUND_HALF_UP))

def acima(x, passo=1):
    # Remove apenas resíduos binários abaixo de 1e-10, antes do teto.
    return float(Decimal(str(round(x / passo, 10))).to_integral_value(rounding=ROUND_CEILING)) * passo

def area_barra(phi_mm):
    return math.pi * (phi_mm / 10)**2 / 4  # cm²

def peso_m(phi_mm):
    return area_barra(phi_mm) / 10000 * MATERIAIS['gamma_aco']

def calcular_stub(stub):
    out = dict(stub)
    for nome in ['beta', 'alfa_long', 'alfa_trans']:
        sec = stub['sec_' + nome]
        if sec < 1:
            raise ValueError('Secante deve ser >= 1: ' + nome)
        out[nome + '_rad'] = math.acos(1 / sec)
        out[nome + '_graus'] = math.degrees(out[nome + '_rad'])
        out['projecao_' + nome + '_mm'] = stub['H_mm'] * math.sqrt(sec**2 - 1)
    return out

def geometria(s):
    A, a, La, Lb, Lf = [s[k] for k in ['A','a','La','Lb','Lf']]
    if not (A > a > 0 and min(La,Lb,Lf) > 0):
        raise ValueError('Geometria inválida: exigir A > a > 0 e alturas positivas.')
    if Lb * 100 <= 2 * MATERIAIS['cob_cm']:
        raise ValueError('Borda insuficiente para os cobrimentos.')
    if not (0 <= s['gmin'] <= s['gmax']):
        raise ValueError('Afloramentos inválidos.')
    L = La + Lb + Lf
    vb = A*A*Lb + La/3*(A*A + A*a + a*a)
    vent = vb + a*a*Lf
    vr = A*A*L - vent
    vmin = vent + a*a*s['gmin']
    vmax = vent + a*a*s['gmax']
    return dict(L=L, D=La+Lf, Dc=2.5*(A-a), vb=vb, vent=vent,
                vmedio=vent+a*a*(s['gmin']+s['gmax'])/2,
                vmin=vmin, vmax=vmax, reaterro=vr, escavacao=A*A*(L+0.05),
                Pmin=arred(vmin*MATERIAIS['gamma_concreto']),
                Pmax=arred(vmax*MATERIAIS['gamma_concreto']),
                Ps=vr*s['gamma'], Psc=vr*s['gamma_sc'],
                rigida=La+Lb+1e-12 >= (A-a)/3)



TABELAS = {'abaco_compressao': {'m': [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15],
                      'omega': [[0, 0.02, 0.04, 0.06, 0.09, 0.1, 0.12, 0.14, 0.18, 0.2, 0.22, 0.25, 0.29, 0.3, 0.32, 0.35],
                                [0, 0, 0.02, 0.05, 0.09, 0.09, 0.11, 0.13, 0.17, 0.2, 0.22, 0.25, 0.29, 0.3, 0.32, 0.35],
                                [0, 0, 0, 0.04, 0.08, 0.08, 0.1, 0.12, 0.16, 0.19, 0.21, 0.24, 0.28, 0.29, 0.31, 0.34],
                                [0, 0, 0, 0.03, 0.07, 0.07, 0.09, 0.11, 0.15, 0.18, 0.2, 0.23, 0.27, 0.28, 0.3, 0.33],
                                [0, 0, 0, 0.02, 0.06, 0.06, 0.08, 0.1, 0.14, 0.17, 0.19, 0.22, 0.26, 0.27, 0.29, 0.32],
                                [0, 0, 0, 0, 0.05, 0.05, 0.07, 0.09, 0.13, 0.16, 0.18, 0.21, 0.25, 0.26, 0.28, 0.31],
                                [0, 0, 0, 0, 0.04, 0.04, 0.06, 0.08, 0.12, 0.15, 0.17, 0.2, 0.24, 0.25, 0.27, 0.3],
                                [0, 0, 0, 0, 0.03, 0.03, 0.05, 0.0699999999999999, 0.11, 0.14, 0.17, 0.19, 0.23, 0.24, 0.26,
                                 0.29],
                                [0, 0, 0, 0, 0.02, 0.02, 0.04, 0.0599999999999999, 0.0999999999999999, 0.13, 0.16, 0.18, 0.22,
                                 0.23, 0.25, 0.28],
                                [0, 0, 0, 0, 0.01, 0.01, 0.03, 0.0499999999999999, 0.0899999999999999, 0.12, 0.15, 0.17, 0.21,
                                 0.22, 0.24, 0.27],
                                [0, 0, 0, 0, 0, 0, 0.02, 0.0399999999999999, 0.0799999999999999, 0.11, 0.14, 0.16, 0.2, 0.21,
                                 0.23, 0.26],
                                [0, 0, 0, 0, 0, 0, 0.01, 0.03, 0.07, 0.1, 0.13, 0.15, 0.19, 0.2, 0.22, 0.25],
                                [0, 0, 0, 0, 0, 0, 0, 0.02, 0.06, 0.09, 0.12, 0.14, 0.180000000000001, 0.19, 0.21,
                                 0.240000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0.01, 0.05, 0.08, 0.11, 0.13, 0.170000000000001, 0.18, 0.2,
                                 0.230000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0.04, 0.07, 0.0999999999999999, 0.12, 0.160000000000001, 0.17, 0.19,
                                 0.220000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0.03, 0.06, 0.0899999999999999, 0.11, 0.150000000000001, 0.16, 0.18,
                                 0.210000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.05, 0.0799999999999999, 0.1, 0.140000000000001, 0.15, 0.17,
                                 0.200000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.04, 0.07, 0.09, 0.130000000000001, 0.14, 0.16,
                                 0.190000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.03, 0.06, 0.08, 0.120000000000001, 0.13, 0.15, 0.180000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.05, 0.07, 0.110000000000001, 0.12, 0.14, 0.170000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.04, 0.06, 0.100000000000001, 0.11, 0.13, 0.160000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.03, 0.05, 0.090000000000001, 0.1, 0.12, 0.150000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.04, 0.080000000000001, 0.09, 0.11, 0.140000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.03, 0.070000000000001, 0.08, 0.1, 0.130000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.060000000000001, 0.07, 0.09, 0.120000000000001],
                                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.050000000000001, 0.06, 0.08, 0.110000000000001]],
                      'u': [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16,
                            0.17, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25]},
 'abaco_tracao': {'m': [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15],
                  'omega': [[0, 0.02, 0.04, 0.06, 0.09, 0.1, 0.12, 0.14, 0.18, 0.2, 0.22, 0.25, 0.29, 0.3, 0.32, 0.35],
                            [0.02, 0.04, 0.06, 0.08, 0.11, 0.12, 0.14, 0.16, 0.2, 0.22, 0.24, 0.27, 0.31, 0.32, 0.34, 0.37],
                            [0.04, 0.06, 0.08, 0.1, 0.13, 0.14, 0.16, 0.18, 0.22, 0.24, 0.26, 0.29, 0.33, 0.34, 0.36, 0.39],
                            [0.06, 0.08, 0.1, 0.12, 0.15, 0.16, 0.18, 0.2, 0.24, 0.26, 0.28, 0.31, 0.35, 0.36, 0.38, 0.41],
                            [0.08, 0.1, 0.12, 0.14, 0.17, 0.18, 0.2, 0.22, 0.26, 0.28, 0.3, 0.33, 0.37, 0.38, 0.4, 0.43],
                            [0.1, 0.12, 0.14, 0.16, 0.19, 0.2, 0.22, 0.24, 0.28, 0.3, 0.32, 0.35, 0.39, 0.4, 0.42, 0.45],
                            [0.12, 0.14, 0.16, 0.18, 0.21, 0.22, 0.24, 0.26, 0.3, 0.32, 0.34, 0.37, 0.41, 0.42, 0.44, 0.47],
                            [0.14, 0.16, 0.18, 0.2, 0.23, 0.24, 0.26, 0.28, 0.32, 0.34, 0.36, 0.39, 0.43, 0.44, 0.46, 0.49],
                            [0.16, 0.18, 0.2, 0.22, 0.25, 0.26, 0.28, 0.3, 0.34, 0.36, 0.38, 0.41, 0.45, 0.46, 0.48, 0.51],
                            [0.18, 0.2, 0.22, 0.24, 0.27, 0.28, 0.3, 0.32, 0.36, 0.38, 0.4, 0.43, 0.47, 0.48, 0.5, 0.53],
                            [0.2, 0.22, 0.24, 0.26, 0.29, 0.3, 0.32, 0.34, 0.38, 0.4, 0.42, 0.45, 0.49, 0.5, 0.52, 0.55],
                            [0.22, 0.24, 0.26, 0.28, 0.31, 0.32, 0.34, 0.36, 0.4, 0.42, 0.44, 0.47, 0.51, 0.52, 0.54, 0.57],
                            [0.24, 0.26, 0.28, 0.3, 0.33, 0.34, 0.36, 0.38, 0.42, 0.44, 0.46, 0.49, 0.53, 0.54, 0.56, 0.59],
                            [0.26, 0.28, 0.3, 0.32, 0.35, 0.36, 0.38, 0.4, 0.44, 0.46, 0.48, 0.51, 0.55, 0.56, 0.58, 0.61],
                            [0.28, 0.3, 0.32, 0.34, 0.37, 0.38, 0.4, 0.42, 0.46, 0.48, 0.5, 0.53, 0.57, 0.58, 0.6, 0.63],
                            [0.3, 0.32, 0.34, 0.36, 0.39, 0.4, 0.42, 0.44, 0.48, 0.5, 0.52, 0.55, 0.59, 0.6, 0.62, 0.65],
                            [0.32, 0.34, 0.36, 0.38, 0.41, 0.42, 0.44, 0.46, 0.5, 0.52, 0.54, 0.57, 0.61, 0.62, 0.64, 0.67],
                            [0.34, 0.36, 0.38, 0.4, 0.43, 0.44, 0.46, 0.48, 0.52, 0.54, 0.56, 0.59, 0.63, 0.64, 0.66, 0.69],
                            [0.36, 0.38, 0.4, 0.42, 0.45, 0.46, 0.48, 0.5, 0.54, 0.56, 0.58, 0.61, 0.65, 0.66, 0.68, 0.71],
                            [0.38, 0.4, 0.42, 0.44, 0.47, 0.48, 0.5, 0.52, 0.56, 0.58, 0.6, 0.63, 0.67, 0.68, 0.7, 0.73],
                            [0.4, 0.42, 0.44, 0.46, 0.49, 0.5, 0.52, 0.54, 0.58, 0.6, 0.62, 0.65, 0.69, 0.7, 0.72, 0.75],
                            [0.42, 0.44, 0.46, 0.48, 0.51, 0.52, 0.54, 0.56, 0.6, 0.62, 0.64, 0.67, 0.71, 0.72, 0.74, 0.77],
                            [0.44, 0.46, 0.48, 0.5, 0.53, 0.54, 0.56, 0.58, 0.62, 0.64, 0.66, 0.69, 0.73, 0.74, 0.76, 0.79],
                            [0.46, 0.48, 0.5, 0.52, 0.55, 0.56, 0.58, 0.6, 0.64, 0.66, 0.68, 0.71, 0.75, 0.76, 0.78, 0.81],
                            [0.48, 0.5, 0.52, 0.54, 0.57, 0.58, 0.6, 0.62, 0.66, 0.68, 0.7, 0.73, 0.77, 0.78, 0.8, 0.83],
                            [0.5, 0.52, 0.54, 0.56, 0.59, 0.6, 0.62, 0.64, 0.68, 0.7, 0.72, 0.75, 0.79, 0.8, 0.82, 0.85]],
                  'u': [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34,
                        0.36, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5]},
 'k_borda': {'k': [[None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, None, None, None, None, 9.38, 9.89, 10.4, 11.05, 11.7, 12.55,
                    13.4, 14.5, 15.6, 17.2, 18.8],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, None, None, None, None, 8.95, 9.442499999999999, 9.935,
                    10.567499999999999, 11.2, 12, 12.8, 13.85, 14.899999999999999, 16.4, 17.9],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, None, None, 7.75, 8.135, 8.52, 8.995000000000001, 9.47,
                    10.085, 10.7, 11.45, 12.2, 13.2, 14.2, 15.6, 17],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, None, None, 7.425, 7.795, 8.165, 8.62, 9.075, 9.655, 10.235,
                    10.9675, 11.7, 12.649999999999999, 13.6, 14.95, 16.3],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, 6.51, 6.805, 7.1, 7.455, 7.81, 8.245, 8.68, 9.225, 9.77,
                    10.485, 11.2, 12.1, 13, 14.3, 15.6],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, None, None, 6.26, 6.545, 6.83, 7.17, 7.51, 7.927499999999999,
                    8.344999999999999, 8.8675, 9.39, 10.07, 10.75, 11.625, 12.5, 13.75, 15],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, 5.55, 5.779999999999999, 6.01, 6.285, 6.56, 6.885, 7.21,
                    7.609999999999999, 8.01, 8.51, 9.01, 9.655000000000001, 10.3, 11.15, 12, 13.2, 14.4],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, None, None, 5.35, 5.57, 5.79, 6.055, 6.32, 6.635, 6.95, 7.335, 7.72,
                    8.202499999999999, 8.684999999999999, 9.305, 9.925, 10.7125, 11.5, 12.7, 13.9],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, 4.77, 4.96, 5.15, 5.36, 5.57, 5.825, 6.08, 6.385, 6.69, 7.0600000000000005, 7.43,
                    7.895, 8.36, 8.955, 9.55, 10.275, 11, 12.2, 13.4],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None, 4.605, 4.7875000000000005, 4.970000000000001, 5.175000000000001, 5.380000000000001,
                    5.625, 5.87, 6.165000000000001, 6.460000000000001, 6.817500000000001, 7.175, 7.6225000000000005, 8.07, 8.6475,
                    9.225000000000001, 9.9625, 10.7, 11.825, 12.95],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, 4.14, 4.29, 4.44, 4.615, 4.79, 4.99, 5.19, 5.425000000000001, 5.66, 5.945, 6.23, 6.575, 6.92,
                    7.35, 7.78, 8.34, 8.9, 9.65, 10.4, 11.45, 12.5],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    None, None, 4, 4.1475, 4.295, 4.4625, 4.63, 4.8225, 5.015000000000001, 5.242500000000001, 5.470000000000001,
                    5.745, 6.02, 6.3549999999999995, 6.6899999999999995, 7.1049999999999995, 7.52, 8.06, 8.600000000000001, 9.32,
                    10.04, 11.045, 12.05],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    3.61, 3.735, 3.86, 4.005, 4.15, 4.3100000000000005, 4.47, 4.654999999999999, 4.84, 5.0600000000000005, 5.28,
                    5.545, 5.81, 6.135, 6.46, 6.859999999999999, 7.26, 7.78, 8.3, 8.99, 9.68, 10.64, 11.6],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,
                    3.495, 3.6175, 3.74, 3.8775000000000004, 4.015000000000001, 4.17, 4.324999999999999, 4.505,
                    4.6850000000000005, 4.897500000000001, 5.11, 5.365, 5.619999999999999, 5.935, 6.25, 6.6375, 7.025,
                    7.527500000000001, 8.030000000000001, 8.700000000000001, 9.370000000000001, 10.31, 11.25],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, 3.17, 3.275,
                    3.38, 3.5, 3.62, 3.75, 3.88, 4.029999999999999, 4.18, 4.355, 4.53, 4.735, 4.94, 5.1850000000000005, 5.43,
                    5.734999999999999, 6.04, 6.415, 6.79, 7.275, 7.76, 8.41, 9.06, 9.98, 10.9],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, 2.975,
                    3.0700000000000003, 3.1725000000000003, 3.275, 3.3899999999999997, 3.505, 3.6325, 3.76, 3.905, 4.05,
                    4.217499999999999, 4.385, 4.585, 4.785, 5.0225, 5.26, 5.555, 5.85, 6.215, 6.58, 7.047499999999999, 7.515,
                    8.145, 8.775, 9.662500000000001, 10.55],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, None, 2.79, 2.88, 2.97,
                    3.0700000000000003, 3.17, 3.2800000000000002, 3.39, 3.515, 3.64, 3.7800000000000002, 3.92, 4.08, 4.24,
                    4.4350000000000005, 4.63, 4.859999999999999, 5.09, 5.375, 5.66, 6.015000000000001, 6.37, 6.82, 7.27, 7.88,
                    8.49, 9.344999999999999, 10.2],
                   [None, None, None, None, None, None, None, None, None, None, None, None, None, 2.6325, 2.71, 2.7975, 2.885,
                    2.98, 3.075, 3.18, 3.285, 3.4050000000000002, 3.5250000000000004, 3.6625, 3.8, 3.955, 4.11, 4.300000000000001,
                    4.49, 4.7125, 4.9350000000000005, 5.21, 5.484999999999999, 5.8275, 6.17, 6.609999999999999, 7.05,
                    7.640000000000001, 8.23, 9.055, 9.879999999999999],
                   [None, None, None, None, None, None, None, None, None, None, None, None, 2.48, 2.5549999999999997, 2.63, 2.715,
                    2.8, 2.8899999999999997, 2.98, 3.08, 3.18, 3.295, 3.41, 3.545, 3.68, 3.83, 3.98, 4.165, 4.35,
                    4.5649999999999995, 4.78, 5.045, 5.31, 5.64, 5.97, 6.4, 6.83, 7.4, 7.97, 8.765, 9.56],
                   [None, None, None, None, None, None, None, None, None, None, None, 2.34, 2.41, 2.4825, 2.5549999999999997,
                    2.635, 2.715, 2.8024999999999998, 2.8899999999999997, 2.9875, 3.085, 3.1950000000000003, 3.305, 3.4375,
                    3.5700000000000003, 3.7150000000000003, 3.8600000000000003, 4.0375, 4.215, 4.425, 4.635, 4.8925, 5.15, 5.4725,
                    5.795, 6.21, 6.625, 7.1775, 7.73, 8.502500000000001, 9.275],
                   [None, None, None, None, None, None, None, None, None, None, 2.2, 2.27, 2.34, 2.41, 2.48, 2.5549999999999997,
                    2.63, 2.715, 2.8, 2.895, 2.99, 3.095, 3.2, 3.33, 3.46, 3.6, 3.74, 3.91, 4.08, 4.285, 4.49, 4.74, 4.99, 5.305,
                    5.62, 6.02, 6.42, 6.955, 7.49, 8.24, 8.99],
                   [None, None, None, None, None, None, None, None, None, 2.08, 2.14, 2.2075, 2.275, 2.3425000000000002, 2.41,
                    2.4825, 2.5549999999999997, 2.6374999999999997, 2.7199999999999998, 2.8125, 2.9050000000000002,
                    3.0075000000000003, 3.1100000000000003, 3.2325, 3.355, 3.4924999999999997, 3.63, 3.795, 3.96, 4.16, 4.36,
                    4.602500000000001, 4.845000000000001, 5.147500000000001, 5.45, 5.84, 6.23, 6.75, 7.27, 7.9975000000000005,
                    8.725000000000001],
                   [None, None, None, None, None, None, None, None, 1.96, 2.02, 2.08, 2.145, 2.21, 2.275, 2.34, 2.41, 2.48, 2.56,
                    2.64, 2.73, 2.82, 2.92, 3.02, 3.135, 3.25, 3.385, 3.52, 3.6799999999999997, 3.84, 4.035, 4.23, 4.465, 4.7,
                    4.99, 5.28, 5.66, 6.04, 6.545, 7.05, 7.755000000000001, 8.46],
                   [None, None, None, None, None, None, None, 1.8399999999999999, 1.9, 1.96, 2.02, 2.0825, 2.145, 2.21, 2.275,
                    2.3425000000000002, 2.41, 2.4875000000000003, 2.5650000000000004, 2.6525000000000003, 2.74, 2.835,
                    2.9299999999999997, 3.0425, 3.1550000000000002, 3.2875, 3.42, 3.575, 3.73, 3.9175000000000004, 4.105, 4.335,
                    4.5649999999999995, 4.8475, 5.130000000000001, 5.4975000000000005, 5.865, 6.355, 6.845, 7.5275, 8.21],
                   [None, None, None, None, None, None, 1.72, 1.78, 1.84, 1.9, 1.96, 2.02, 2.08, 2.145, 2.21, 2.275, 2.34, 2.415,
                    2.49, 2.575, 2.66, 2.75, 2.84, 2.95, 3.06, 3.19, 3.32, 3.4699999999999998, 3.62, 3.8, 3.98, 4.205, 4.43,
                    4.705, 4.98, 5.335000000000001, 5.69, 6.165, 6.64, 7.3, 7.96],
                   [None, None, None, None, None, None, 1.6600000000000001, 1.7200000000000002, 1.78, 1.8399999999999999, 1.9,
                    1.96, 2.02, 2.0825, 2.145, 2.21, 2.275, 2.3475, 2.42, 2.5, 2.58, 2.67, 2.76, 2.8649999999999998,
                    2.9699999999999998, 3.0974999999999997, 3.2249999999999996, 3.37, 3.515, 3.6900000000000004, 3.865, 4.0825,
                    4.3, 4.567500000000001, 4.835000000000001, 5.180000000000001, 5.525, 5.9875, 6.449999999999999,
                    7.092499999999999, 7.734999999999999],
                   [None, None, None, None, 1.48, 1.54, 1.6, 1.6600000000000001, 1.72, 1.78, 1.84, 1.9, 1.96, 2.02, 2.08, 2.145,
                    2.21, 2.2800000000000002, 2.35, 2.425, 2.5, 2.59, 2.68, 2.7800000000000002, 2.88, 3.005, 3.13, 3.27, 3.41,
                    3.58, 3.75, 3.96, 4.17, 4.43, 4.69, 5.025, 5.36, 5.8100000000000005, 6.26, 6.885, 7.51],
                   [None, None, None, None, 1.42, 1.48, 1.54, 1.6, 1.6600000000000001, 1.7200000000000002, 1.78,
                    1.8399999999999999, 1.9, 1.96, 2.02, 2.0825, 2.145, 2.2125000000000004, 2.2800000000000002, 2.355,
                    2.4299999999999997, 2.5175, 2.605, 2.7024999999999997, 2.8, 2.92, 3.04, 3.1775, 3.3150000000000004,
                    3.4800000000000004, 3.645, 3.8475, 4.05, 4.3025, 4.555, 4.88, 5.205, 5.6425, 6.08, 6.6875, 7.295],
                   [None, None, 1.24, 1.3, 1.36, 1.42, 1.48, 1.54, 1.6, 1.6600000000000001, 1.72, 1.78, 1.84, 1.9, 1.96, 2.02,
                    2.08, 2.145, 2.21, 2.285, 2.36, 2.445, 2.53, 2.625, 2.72, 2.835, 2.95, 3.085, 3.22, 3.38, 3.54,
                    3.7350000000000003, 3.93, 4.175, 4.42, 4.734999999999999, 5.05, 5.475, 5.9, 6.49, 7.08],
                   [None, None, 1.1800000000000002, 1.2400000000000002, 1.3, 1.3599999999999999, 1.42, 1.48, 1.54, 1.6,
                    1.6600000000000001, 1.7200000000000002, 1.78, 1.8399999999999999, 1.9, 1.96, 2.02, 2.0825, 2.145,
                    2.2175000000000002, 2.29, 2.3725, 2.455, 2.5475000000000003, 2.64, 2.7525000000000004, 2.865, 2.995, 3.125,
                    3.2800000000000002, 3.435, 3.625, 3.8150000000000004, 4.055, 4.295, 4.6, 4.904999999999999, 5.3175, 5.73,
                    6.3025, 6.875],
                   [1, 1.06, 1.12, 1.1800000000000002, 1.24, 1.3, 1.36, 1.42, 1.48, 1.54, 1.6, 1.6600000000000001, 1.72, 1.78,
                    1.84, 1.9, 1.96, 2.02, 2.08, 2.1500000000000004, 2.22, 2.3, 2.38, 2.4699999999999998, 2.56, 2.67, 2.78, 2.905,
                    3.03, 3.1799999999999997, 3.33, 3.515, 3.7, 3.935, 4.17, 4.465, 4.76, 5.16, 5.56, 6.115, 6.67]],
             'x': [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18,
                   0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37,
                   0.38, 0.39, 0.4],
             'y': [0.3, 0.29, 0.28, 0.27, 0.26, 0.25, 0.24, 0.23, 0.22, 0.21, 0.2, 0.19, 0.18, 0.17, 0.16, 0.15, 0.14, 0.13, 0.12,
                   0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0]},
 'kc_ks': {'fck': [200, 250, 300, 350, 400, 450, 500],
           'kc': [[26.2, 20.9, 17.4, 15, 13.1, 11.6, 10.5], [7.8, 6.2, 5.2, 4.5, 3.9, 3.5, 3.1],
                  [4.7, 3.8, 3.2, 2.7, 2.4, 2.1, 1.9], [3.7, 3, 2.5, 2.1, 1.8, 1.6, 1.5], [3.1, 2.5, 2, 1.8, 1.5, 1.4, 1.2],
                  [2.7, 2.2, 1.8, 1.6, 1.4, 1.2, 1.1], [2.4, 2, 1.6, 1.4, 1.2, 1.1, 1], [2.3, 1.8, 1.5, 1.3, 1.1, 1, 0.9],
                  [2.2, 1.8, 1.5, 1.3, 1.1, 1, 0.9]],
           'ks': [0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031]}}

def coef_k_borda(ex_A, ey_A):
    t=TABELAS['k_borda'];x=arred(ex_A,2);y=arred(ey_A,2)
    def busca(xx,yy):
        ix=[i for i,v in enumerate(t['x']) if isinstance(v,(float,int)) and abs(v-xx)<1e-8]
        iy=[i for i,v in enumerate(t['y']) if isinstance(v,(float,int)) and abs(v-yy)<1e-8]
        return t['k'][iy[0]][ix[0]] if ix and iy else None
    k=busca(x,y)
    if not isinstance(k,(int,float)) or k<=0:k=busca(y,x)
    if not isinstance(k,(int,float)) or k<=0:
        raise ValueError(f'Fora da tabela de contato: ex/A={x}, ey/A={y}.')
    return k

def arrancamento(s,g):
    # Biarez, categoria 2, areia, ruptura generalizada: B147:B154.
    if g['D'] >= g['Dc']:
        raise ValueError('D >= Dc: modelo localizado não habilitado; revisar antes de dimensionar.')
    if s['coesao'] != 0:
        raise ValueError('Este cadastro usa categoria 2 / areia / c=0. Modelo coesivo não habilitado.')
    phi=math.radians(s['phi']); rel=g['D']/(2*s['A']/math.pi)
    mg=-.5*math.tan(-phi)*(1-math.tan(-phi)*rel/3)
    ps=g['Psc'] if s['solo_cimento']=='Sim' else g['Ps']
    return 4*s['A']*g['D']**2*s['gamma']*mg+g['Pmin']+ps

def verificar_geotecnia(s):
    g=geometria(s); A=s['A'];a=s['a'];phi=math.radians(s['phi'])
    gamma=s['gamma'];c=s['coesao'];L=g['L'];altura=L+s['gmax']
    nq=math.exp(math.pi*math.tan(phi))*math.tan(math.pi/4+phi/2)**2
    nc=(nq-1)/math.tan(phi);ng=2*(nq+1)*math.tan(phi)
    sadm=(c*nc*(1+nq/nc)+gamma*L*nq*(1+math.tan(phi))+.5*gamma*A*ng*.6)/30000
    sempir=s['sigma_adm']+L*gamma/10000
    kp=math.tan(math.pi/4+phi/2)**2
    ep=(.5*gamma*kp*L**2+2*c*L*math.sqrt(kp))*A/2
    ps=g['Psc'] if s['solo_cimento']=='Sim' else g['Ps']
    qrt=arrancamento(s,g); out=[]; cel={}
    for i,ca in enumerate(CARGAS_COMPRESSAO):
        V,T,H=[ca[k] for k in ['vertical_kgf','transversal_kgf','longitudinal_kgf']]
        med=(V*COEF_GEO+g['Pmax']+g['Ps'])/(A*A*10000)
        borda=(V*COEF_GEO+g['Pmax']+ps)/(A*A*10000)+6*(T+H)*altura/(A**3*10000)
        ex=max(0,(H*altura-(ep*(s['gmax']+2*L/3) if s['solo_cimento']=='Sim' else 0))/(V+g['Pmax']+ps))
        ey=max(0,(T*altura-(ep*(s['gmax']+2*L/3) if s['solo_cimento']=='Sim' else 0))/(V+g['Pmax']+ps))
        x,y=arred(ex/A,2),arred(ey/A,2)
        # Conserva a classificação da planilha para rastreabilidade.
        zona1=x==y==0 or math.hypot(1/6-y,1/6-x)>=math.hypot(x,y)
        k=None if zona1 else coef_k_borda(x,y)
        sb=borda if zona1 else (V*COEF_GEO+g['Ps']+g['Pmax'])/(A*A*10000)*k
        adm_b=sadm*(1.3 if i==0 else 1) # H69:K69 da referência
        fscomp=min(sadm/med,adm_b/sb)
        fs_emp=min(sempir/med,1.3*sempir/borda)
        sigmin=med-6*(T+H)*altura/(A**3*10000)
        fsdes=((V+g['Pmin']+g['Ps'])*math.tan(phi)+A*A*c)/(math.hypot(T,H)*COEF_GEO)
        out.append(dict(tipo='Compressão',hipotese=ca['hipotese'],sigma_media=med,sigma_borda=sb,
                        sigma_min_linear=sigmin,FS_compressao=fscomp,FS_empirico=fs_emp,FS_deslizamento=fsdes,
                        contato='Integral (classificação Excel)' if zona1 else 'Parcial (tabela Excel)',
                        resultado='ATENDE aos critérios calculados' if min(fscomp,fs_emp,fsdes)>=1 else 'NÃO ATENDE'))
        col='BCDE'[i]
        cel.update({col+str(r):v for r,v in {34:med,35:borda,42:sadm,46:sempir,160:sigmin,168:fsdes}.items()})
    for i,ca in enumerate(CARGAS_TRACAO):
        V=ca['vertical_kgf'];h=max(ca['transversal_kgf'],ca['longitudinal_kgf'])
        mt=h*altura; tomb=(COEF_GEO*V-g['Pmax'])*A/3+COEF_GEO*mt
        meq=qrt*A/3
        ps1=(A-a)/2*(g['D']-s['La']/2)*A*gamma
        ps2a=g['D']**2*math.tan(phi)/2*A*gamma
        ps2b=math.pi/6*g['D']**3*math.tan(phi)**2*gamma
        ps2c=g['D']**2*math.tan(phi)/2*(A-a)/2*gamma
        meq_usbr=(ps1+ps2c)*(7*A+3*a)/12+(ps2a+ps2b)*(5*A+2*g['D']*math.tan(phi))/6
        fs_t=meq/tomb if tomb>0 else math.inf
        fs_u=meq_usbr/tomb if tomb>0 else math.inf
        fs_a=qrt/(COEF_GEO*V)
        out.append(dict(tipo='Tração',hipotese=ca['hipotese'],FS_arrancamento=fs_a,
                        FS_tombamento=fs_t,FS_USBR=fs_u,
                        resultado='ATENDE aos critérios calculados' if min(fs_a,fs_t)>=1 else 'NÃO ATENDE'))
        col='BCDE'[i]
        cel.update({col+str(r):v for r,v in {81:mt,82:tomb,83:meq,84:fs_t,94:fs_u,154:fs_a}.items()})
    cel.update(K13=L,K21=g['vmedio'],K23=g['Pmax'],K25=g['Pmin'],K26=g['Ps'],K28=g['reaterro'],B153=qrt)
    return pd.DataFrame(out),cel



def interpolar_abaco(u,m,tipo):
    t=TABELAS['abaco_'+tipo];us=np.array(t['u']);ms=np.array(t['m']);z=np.array(t['omega'],float)
    if not (us[0]<=u<=us[-1] and ms[0]<=m<=ms[-1]):
        raise ValueError(f'Fora do ábaco 3.8 ({tipo}): u={u:.4f}, m={m:.4f}; sem extrapolação.')
    # Bilinear na malha real: tração tem passo u=0,02, não 0,01.
    vals=np.array([np.interp(m,ms,row) for row in z])
    return float(np.interp(u,us,vals))


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

# Método do N1 do fuste: "envoltoria" (compatibilidade de deformações) ou "abaco" (planilha).
METODO_N1 = "envoltoria"
# Momentos no plano Mx × My: "eixo" (resultante em Mx, como no P-Calc) ou "componentes".
LANCAMENTO_MXMY = "eixo"

def ks_por_kc(kc):
    t=TABELAS['kc_ks'];fck=MATERIAIS['fck_kgf_cm2']
    if fck not in t['fck']:
        raise ValueError('fck deve constar na tabela kc/ks incorporada.')
    j=t['fck'].index(fck)
    for limites,ks in zip(t['kc'],t['ks']):
        if kc>limites[j]:return ks
    raise ValueError('Seção fora dos limites da tabela kc/ks.')

def transpasse(phi,as_calc,as_adot,aderencia=1):
    # H182/H219/H261; cm; mantém o critério da referência, arredonda em 5 cm.
    fyd=MATERIAIS['fyk_kgf_cm2']/MATERIAIS['gamma_s']
    fck=MATERIAIS['fck_kgf_cm2'];gc=MATERIAIS['gamma_c']
    fbd=aderencia*2.25*(.7*.3*(fck/10)**(2/3)*10/gc)
    lb=max(phi/40*fyd/fbd,25*phi/10)
    minimo=max(.3*max(phi/40*fyd/(fck/gc),25*phi/10),10*phi/10,10)
    return acima(2*max(lb,minimo)*as_calc/as_adot,5)

def dimensionar_base(s):
    g=geometria(s);A,a=s['A'],s['a'];phi=s['barra_base_mm'];cob=MATERIAIS['cob_cm']
    linhas=[];cel={}; calculadas={}
    for tipo,cargas,altura,mdrow,asrow in [('N3',CARGAS_TRACAO,s['La'],181,187),('N4',CARGAS_COMPRESSAO,s['La']+s['Lb'],218,224)]:
        for i,ca in enumerate(cargas):
            V=ca['vertical_kgf'];h=max(ca['transversal_kgf'],ca['longitudinal_kgf'])
            q=max(0,(V*COEF_ESTR-g['Pmin']-g['Ps'])/A**2) if tipo=='N3' else (V*COEF_ESTR+g['Pmax']+g['Ps'])/A**2
            md=q*A**3/8+h*(s['Lf']+s['gmax'])
            mdmin=.8*(1.3*.3*(MATERIAIS['fck_kgf_cm2']/10)**(2/3))*A*altura**2/6*101971.62129779
            d=altura*100-cob-1.5*phi/10
            if d<=0:raise ValueError('Altura útil da base não positiva.')
            # Preserva B185/B222 e B187/B224, documentando a assimetria.
            kc=(a if tipo=='N3' else A)*100*d*d/((md if tipo=='N3' else max(md,mdmin))*.980665)
            ks=ks_por_kc(kc)
            ascalc=arred(ks*(max(md,mdmin) if tipo=='N3' else md)/d,2)
            asmin=.0015*.67*A*100*altura*100
            linhas.append(dict(marca=tipo,hipotese=ca['hipotese'],Md_kgfm=md,Mdmin_kgfm=mdmin,d_cm=d,kc=kc,ks=ks,As_calc_cm2=ascalc,As_min_cm2=asmin))
            cel['BCDE'[i]+str(mdrow)]=md;cel['BCDE'[i]+str(asrow)]=ascalc
        calculadas[tipo]=max(l['As_calc_cm2'] for l in linhas if l['marca']==tipo)
    tb=pd.DataFrame(linhas)
    req=max(tb.As_calc_cm2.max(),tb.As_min_cm2.max())
    # Unifica as duas malhas, mas verifica também a superior (Excel copia N4 para N3).
    n=int(acima(req/area_barra(phi)))+s['barras_extra_base']
    asad=n*area_barra(phi);esp=(A*100-2*cob-2*phi/10)/(n-1)
    arm={k:dict(phi_mm=phi,n_por_direcao=n,As_cm2=asad,esp_cm=esp,
               transpasse_cm=transpasse(phi,calculadas[k],asad,.7)) for k in ['N3','N4']}
    cel.update(H181=asad,H218=asad,H182=arm['N3']['transpasse_cm'],H219=arm['N4']['transpasse_cm'])
    return tb,arm,cel

def escolher_estribos(s):
    a=s['a']*100;d=a-MATERIAIS['cob_cm'];fck=MATERIAIS['fck_kgf_cm2'];gc=MATERIAIS['gamma_c']
    fyd=MATERIAIS['fyk_kgf_cm2']/MATERIAIS['gamma_s'];av=1-fck/2500
    vd=max(math.hypot(c['transversal_kgf'],c['longitudinal_kgf']) for c in CARGAS_COMPRESSAO+CARGAS_TRACAO)*COEF_ESTR
    vrd2=.27*av*fck/gc*a*d
    vc=.6*.21*10*(fck/10)**(2/3)/gc*a*d
    asmin=.2*.3*(fck/10)**(2/3)/(MATERIAIS['fyk_kgf_cm2']/10)*100*a
    comp=(4*(a-2*MATERIAIS['cob_cm'])+15)/100
    opts=[]
    for phi in [6.3,8.0]:
        for esp in [10,15]:
            vsw=2*area_barra(phi)/esp*.9*d*fyd
            asmetro=2*area_barra(phi)*math.floor(100/esp) # B334, critério discreto da planilha
            ok=vsw>vd and vd<=vrd2 and vd<=vc+vsw and asmetro>=asmin
            opts.append(dict(phi_mm=phi,esp_cm=esp,Vd_kgf=vd,Vsw_kgf=vsw,Vc_kgf=vc,VRd2_kgf=vrd2,
                             As_metro_cm2=asmetro,As_min_cm2=asmin,kg_por_m=comp*peso_m(phi)*100/esp,atende=ok))
    df=pd.DataFrame(opts);validas=[x for x in opts if x['atende']]
    if not validas:raise ValueError('Nenhuma opção de estribo atende; rever seção ou ampliar opções.')
    melhor=min(validas,key=lambda x:(x['kg_por_m'],-x['esp_cm']))
    melhor=dict(melhor,comprimento_m=comp)
    return melhor,df

def _barras_fuste(a_cm, phi_mm, phi_estribo_mm):
    # Lado do quadrado que passa pelo centro das barras N1 (cm).
    return a_cm - 2 * (MATERIAIS['cob_cm'] + phi_estribo_mm / 10 + phi_mm / 20)

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



def _envoltorias_fuste(a_cm, n, lado_util, sigma_cd, fyd):
    # Flexão em torno do eixo principal e da diagonal (direção mais desfavorável).
    return [Envoltoria(*secao_quadrada(a_cm, diag), barras_quadradas(n, lado_util, diag), sigma_cd, fyd, MATERIAIS['fck_mpa'])
            for diag in (False, True)]


def dimensionar_fuste(s,stub,phi_estribo_mm=6.3):
    a=s['a'];ell=s['Lf']+s['gmax'];fck=MATERIAIS['fck_kgf_cm2']
    fcd=arred(.85*fck/MATERIAIS['gamma_c']);fyd=MATERIAIS['fyk_kgf_cm2']/MATERIAIS['gamma_s']
    fck_mpa=MATERIAIS['fck_mpa'];a_cm=a*100
    # fcd acima já inclui 0,85; acima de C50 aplica o αc da NBR 6118:2023.
    sigma_cd=fcd if fck_mpa<=50 else fcd*(1-(fck_mpa-50)/200)
    phi=s['barra_fuste_mm'];lado_util=_barras_fuste(a_cm,phi,phi_estribo_mm)
    usar_envoltoria=METODO_N1!='abaco'
    envs=_envoltorias_fuste(a_cm,40,lado_util,sigma_cd,fyd) if usar_envoltoria else None
    as_max=.08*a_cm**2
    lam=2*ell/(a/math.sqrt(12));linhas=[];cel={};casos=[]
    for tipo,cargas in [('tracao',CARGAS_TRACAO),('compressao',CARGAS_COMPRESSAO)]:
        for i,ca in enumerate(cargas):
            nd=ca['vertical_kgf']*COEF_ESTR
            hd=math.hypot(ca['transversal_kgf'],ca['longitudinal_kgf'])*COEF_ESTR
            md=hd*ell+a*a*ell*MATERIAIS['gamma_concreto']*math.tan(stub['beta_rad'])*ell/2
            nu=nd/(fcd*(a*100)**2);md_adot=md;lim=0
            if tipo=='compressao':
                lim=min(90,max(35/.9,(25+12.5*(md/nd)/a)/.9))
                if lam>90:raise ValueError('Esbeltez > 90: método de segunda ordem não habilitado.')
                if lam>lim:
                    curva=min(.005/(a*(nu+.5)),.005/a)
                    md_adot=max(md,.9*md+nd*(2*ell)**2/10*curva)
            mu=md_adot*100/(fcd*(a*100)**3)
            try:
                omega_abaco=interpolar_abaco(nu,mu,tipo)
            except ValueError:
                if not usar_envoltoria:raise
                omega_abaco=None
            if usar_envoltoria:
                Nd=nd if tipo=='compressao' else -nd
                as_dir=[env.as_necessaria(Nd,md_adot*100,as_max) for env in envs]
                if any(x is None for x in as_dir):
                    raise ValueError(f'Fuste: hipótese {ca["hipotese"]} ({tipo}) exige As > 8% da seção — aumentar o lado a.')
                ascalc=max(as_dir);omega=ascalc*fyd/(fcd*a_cm**2)
                casos.append(dict(Nd=Nd,Md=md_adot,hipotese=ca['hipotese'],tipo=tipo))
            else:
                omega=omega_abaco;ascalc=omega*fcd/fyd*(a*100)**2
            ht,hl=abs(ca['transversal_kgf']),abs(ca['longitudinal_kgf']);hr=math.hypot(ht,hl)
            # momento no eixo principal Mx (direção mais desfavorável do quadrado), ou decomposto
            sx=1 if tipo=='compressao' else -1  # compressão em +Mx, tração em −Mx
            mx,my=(sx*md_adot,0.0) if (hr==0 or LANCAMENTO_MXMY=='eixo') else (md_adot*ht/hr,md_adot*hl/hr)
            # seção intermediária do fuste (meia altura, em balanço a partir da base)
            m_meio=hd*ell/2+a*a*(ell/2)*MATERIAIS['gamma_concreto']*math.tan(stub['beta_rad'])*(ell/2)/2
            # envoltória mínima com 2ª ordem (NBR 6118, 15.3.2): αb = 1,0 e λ1 com e1,mín
            m1min=nd*(.015+.03*a);m2min=0.0
            if tipo=='compressao':
                lim_min=min(90,max(35,25+12.5*(.015+.03*a)/a))
                if lam>lim_min:m2min=nd*(2*ell)**2/10*min(.005/(a*(nu+.5)),.005/a)
            linhas.append(dict(tipo=tipo,hipotese=ca['hipotese'],Nd_kgf=nd,Md1_kgfm=md,Md_adot_kgfm=md_adot,Mx_kgfm=mx,My_kgfm=my,
                               M_meio_kgfm=m_meio,M1d_min_kgfm=m1min,M1d_min_2a_kgfm=m1min+m2min,
                               lambda_=lam,lambda_lim=lim,nu=nu,mu=mu,omega=omega,omega_abaco=omega_abaco,As_calc_cm2=ascalc))
            cel['BCDE'[i]+str(259 if tipo=='tracao' else 275)]=md
            cel['BCDE'[i]+str(267 if tipo=='tracao' else 283)]=ascalc
    tb=pd.DataFrame(linhas);req=max(.004*(a*100)**2,tb.As_calc_cm2.max())
    # Quatro faces: quantidade múltipla de quatro, mínimo quatro barras.
    n=max(4,int(acima(req/area_barra(phi),4)))
    verif=None
    if usar_envoltoria:
        # As barras saem da As da envoltória; aqui só se informa o MRd das barras adotadas.
        ev=_envoltorias_fuste(a_cm,n,lado_util,sigma_cd,fyd);As=n*area_barra(phi);pior=None
        for c in casos:
            mrd=min(e.momento_resistente(c['Nd'],As) for e in ev)/100
            u=math.inf if mrd<=0 else c['Md']/mrd
            if pior is None or u>pior['utilizacao']:pior=dict(caso=c,MRd_kgfm=mrd,utilizacao=u)
        verif=pior
        gov=tb.loc[tb.As_calc_cm2.idxmax()]
        print(f"Fuste {s.get('nome', '')} | N1 pela envoltória N×M (NBR 6118), eixo principal e diagonal | Ø {phi:g} mm")
        for l in linhas:
            print(f"   {l['tipo']:<10} {str(l['hipotese']):<10} Nd = {l['Nd_kgf']:>9.0f} kgf  Md = {l['Md_adot_kgfm']:>9.0f} kgf·m  ->  As = {l['As_calc_cm2']:6.2f} cm²"
                  + (f"  (ábaco {l['omega_abaco']*fcd/fyd*a_cm**2:6.2f})" if l['omega_abaco'] is not None else ''))
        print(f"   Governa {gov.tipo} {gov.hipotese}: As = {gov.As_calc_cm2:.2f} cm² | As,req = {req:.2f} cm² | adotado {n} Ø {phi:g}"
              f" | pior {pior['caso']['hipotese']}: Md = {pior['caso']['Md']:.0f} ≤ MRd = {pior['MRd_kgfm']:.0f} kgf·m (utilização {pior['utilizacao']:.2f})")
    asad=n*area_barra(phi)
    arm=dict(phi_mm=phi,n=n,As_cm2=asad,As_req_cm2=req,
             esp_cm=4*(a*100-2*MATERIAIS['cob_cm'])/n,
             transpasse_cm=transpasse(phi,tb.As_calc_cm2.max(),asad))
    if verif:
        arm.update(metodo='Envoltória N×M — NBR 6118',MRd_kgfm=verif['MRd_kgfm'],utilizacao=verif['utilizacao'],
                   hipotese_verificacao=verif['caso']['hipotese'],
                   envoltoria=envoltoria_pontos(min(_envoltorias_fuste(a_cm,n,lado_util,sigma_cd,fyd),
                                                    key=lambda e:e.momento_resistente(verif['caso']['Nd'],asad)),asad))
    if verif:
        # Plano Mx × My: contornos resistentes no Nd crítico de compressão e de tração.
        grupos={}
        for l in linhas:
            if l['tipo'] not in grupos or l['As_calc_cm2']>grupos[l['tipo']]['As_calc_cm2']:grupos[l['tipo']]=l
        tipos=list(grupos);fib,borda=fibras_quadrado(a_cm)
        pts=contorno_mxmy(fib,borda,barras_quadradas_xy(n,lado_util),area_barra(phi),
                          [(1 if t=='compressao' else -1)*grupos[t]['Nd_kgf'] for t in tipos],sigma_cd,fyd,fck_mpa)
        nome_t={'compressao':'compressão','tracao':'tração'}
        cont=[]
        for t,p in zip(tipos,pts):
            g=grupos[t];item=dict(tipo=nome_t[t],hipotese=g['hipotese'],Nd_kgf=(1 if t=='compressao' else -1)*g['Nd_kgf'],pontos=p,secoes=[])
            hyp=next(c for c in (CARGAS_TRACAO if t=='tracao' else CARGAS_COMPRESSAO) if c['hipotese']==g['hipotese'])
            ht,hl=abs(hyp['transversal_kgf']),abs(hyp['longitudinal_kgf']);hr=math.hypot(ht,hl)
            for sec,m in (('topo',0.0),('intermediária',g['M_meio_kgfm']),('base',g['Md_adot_kgfm'])):
                ex=hr==0 or LANCAMENTO_MXMY=='eixo'
                sx=1 if t=='compressao' else -1
                item['secoes'].append(dict(secao=sec,M_kgfm=m,Mx_kgfm=sx*m if ex else m*ht/hr,My_kgfm=0.0 if ex else m*hl/hr))
            if t=='compressao':
                item['m1d_min_xx']=item['m1d_min_yy']=g['M1d_min_kgfm']
                item['m1d_min_2a_xx']=item['m1d_min_2a_yy']=g['M1d_min_2a_kgfm']
            cont.append(item)
        arm['mxmy']=dict(contornos=cont,casos=[dict(tipo=nome_t[l['tipo']],hipotese=l['hipotese'],
            Nd_kgf=(1 if l['tipo']=='compressao' else -1)*l['Nd_kgf'],Mx_kgfm=l['Mx_kgfm'],My_kgfm=l['My_kgfm']) for l in linhas])
    cel.update(H259=asad,H261=arm['transpasse_cm'])
    return tb,arm,cel


def verificar_puncao(s,tfuste):
    # Reprodução do perímetro da face do pilar da referência B342:B351.
    a=s['a'];d=(s['La']*100-MATERIAIS['cob_cm']-1.5*s['barra_base_mm']/10)/100
    wp=1.5*a*a+4*a*d+16*d*d+2*math.pi*d*a
    resistente=.27*(1-MATERIAIS['fck_kgf_cm2']/2500)*MATERIAIS['fck_kgf_cm2']/MATERIAIS['gamma_c']*10000
    rows=[];cel={}
    for i,ca in enumerate(CARGAS_COMPRESSAO):
        md=tfuste[tfuste.tipo=='compressao'].iloc[i].Md_adot_kgfm
        solic=COEF_GEO*ca['vertical_kgf']/(4*a*d)+.6*md/(wp*d)
        rows.append(dict(hipotese=ca['hipotese'],tau_sd_kgf_m2=solic,tau_Rd2_kgf_m2=resistente,FS=resistente/solic))
        cel['BCDE'[i]+'349']=solic;cel['BCDE'[i]+'351']=resistente/solic
    return pd.DataFrame(rows),cel

def quantidade_estribos(p_vertical_m,esp_cm,stub,modo='corrigido'):
    # AI10:AI25. Mantém 5 estribos no trecho inicial e 9 no seguinte.
    # Excel usa COS(N19/100); corrigido usa COS(RADIANS(N19)).
    fator=(1/math.cos(stub['alfa_long_graus']/100) if modo=='excel' else stub['sec_alfa_long'])
    livre=p_vertical_m*fator-.05-.2-.1-.8
    if livre<0:raise ValueError('Fuste menor que os trechos fixos de estribos.')
    return int(acima(14+livre/(esp_cm/100)))

def ferro_base(s,arm):
    # N3 em grupos simétricos, acompanhando o talude; N4 reto com ganchos 10 cm.
    A,a,La,Lb=[s[k] for k in ['A','a','La','Lb']];cob=MATERIAIS['cob_cm'];n=arm['N3']['n_por_direcao']
    esp=arm['N3']['esp_cm'];lim=(A-a)*50
    grupos=min(int(math.floor(lim/esp+1e-10))+1,int(math.ceil(n/2)))
    linhas=[]
    for j in range(grupos):
        x=j*esp;declive=La/((A-a)/2);comp=(2*(Lb*100-2*cob)+(A*100-2*cob-2*x)+2*math.hypot(x,x*declive))/100
        qtd=4 if j<grupos-1 else 2*n-4*(grupos-1)
        linhas.append(dict(marca='N3-'+str(j+1),quantidade=qtd,comprimento_m=comp,phi_mm=arm['N3']['phi_mm']))
    linhas.append(dict(marca='N4',quantidade=2*arm['N4']['n_por_direcao'],comprimento_m=A-2*cob/100+.2,phi_mm=arm['N4']['phi_mm']))
    for l in linhas:l['peso_kg']=l['quantidade']*l['comprimento_m']*peso_m(l['phi_mm'])
    return pd.DataFrame(linhas)

def quantitativos(s,stub,n1,n2,base):
    g=geometria(s);a=s['a'];cob=MATERIAIS['cob_cm'];fixo=ferro_base(s,base);linhas=[]
    for gcm in range(int(arred(s['gmin']*100)),int(arred(s['gmax']*100))+1,10):
        afl=gcm/100;p=s['Lf']+afl
        l1=p*stub['sec_beta']-2*cob/100+.2+s['La']+s['Lb']
        qtd=quantidade_estribos(p,n2['esp_cm'],stub)
        kg1=l1*n1['n']*peso_m(n1['phi_mm']);kg2=qtd*n2['comprimento_m']*peso_m(n2['phi_mm'])
        linhas.append(dict(G_cm=gcm,H_m=g['L']+afl,P_m=p,
            X_cm=(p+stub['nivel_concreto_mm']/1000)*math.tan(stub['alfa_long_rad'])*100,
            Y_cm=(p+stub['nivel_concreto_mm']/1000)*math.tan(stub['alfa_trans_rad'])*100,
            Z_cm=(p+stub['nivel_concreto_mm']/1000)*math.tan(stub['beta_rad'])*100,
            concreto_m3=arred(g['vent']+a*a*afl,2),escavacao_m3=g['escavacao'],reaterro_m3=g['reaterro'],
            N1_unit_m=l1,N1_qtd=n1['n'],N1_kg=kg1,N2_qtd=qtd,N2_kg=kg2,
            base_kg=fixo.peso_kg.sum(),aco_total_kg=kg1+kg2+fixo.peso_kg.sum()))
    return pd.DataFrame(linhas),fixo

def calcular_sapata(s,stub):
    geo,cel=verificar_geotecnia(s)
    b,armb,cb=dimensionar_base(s);n2,op=escolher_estribos(s)
    f,n1,cf=dimensionar_fuste(s,stub,n2['phi_mm']);pun,cp=verificar_puncao(s,f)
    qt,fixo=quantitativos(s,stub,n1,n2,armb)
    cel.update(cb);cel.update(cf);cel.update(cp)
    cel['B326']=n2['Vsw_kgf'];cel['B337']=n2['As_metro_cm2']/n2['As_min_cm2']
    for i,row in qt.iterrows():
        r=10+i;cel['Y'+str(r)]=row.G_cm;cel['AE'+str(r)]=row.concreto_m3
        cel['AF'+str(r)]=row.N1_unit_m;cel['AI'+str(r)]=row.N2_qtd
    return dict(geotecnia=geo,base=b,fuste=f,N1=n1,N2=n2,arm_base=armb,opcoes_estribos=op,
                puncao=pun,quantitativos=qt,ferro_base=fixo,celulas=cel)



# =====================================================================
# INTERFACE COM O SOFTWARE — recebe as entradas em JSON e devolve JSON
# =====================================================================
import json

def _limpa(o):
    if isinstance(o, dict):
        return {str(k): _limpa(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_limpa(v) for v in o]
    if isinstance(o, (np.bool_, bool)):
        return bool(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        v = float(o)
        return None if (math.isinf(v) or math.isnan(v)) else v
    return o

def _st(ok):
    return "ATENDE" if ok else "REVER"

def _minimo(df, col):
    v = df[col].replace([np.inf, -np.inf], np.nan).dropna()
    if len(v) == 0:
        return None, ""
    i = v.idxmin()
    return float(v.loc[i]), str(df.loc[i, "hipotese"])

def rodar(entrada_json):
    global NOME_TORRE, COEF_GEO, COEF_ESTR, MATERIAIS, CARGAS_COMPRESSAO, CARGAS_TRACAO, STUB_DADOS, METODO_N1
    e = json.loads(entrada_json)
    METODO_N1 = e.get("metodo_n1", "envoltoria")
    global LANCAMENTO_MXMY
    LANCAMENTO_MXMY = e.get("lancamento_mxmy", "eixo")
    NOME_TORRE = e["nome_torre"]
    COEF_GEO = float(e["coef_geo"]); COEF_ESTR = float(e["coef_estr"])
    MATERIAIS = e["materiais"]
    CARGAS_COMPRESSAO = e["cargas_compressao"]; CARGAS_TRACAO = e["cargas_tracao"]
    STUB_DADOS = e["stub_sapata"]
    stub = calcular_stub(STUB_DADOS)
    resultados, tabelas, quant, erros = {}, {}, {}, {}
    for s in e["solos"]:
        nome = s["nome"]
        try:
            s = dict(s); s["barras_extra_base"] = int(s["barras_extra_base"])
            r = calcular_sapata(s, stub)
            g = geometria(s)
            geo = r["geotecnia"]
            comp = geo[geo.tipo == "Compressão"].copy(); trac = geo[geo.tipo == "Tração"].copy()
            fsc, hc = _minimo(comp, "FS_compressao"); fse, _ = _minimo(comp, "FS_empirico"); fsd, hd = _minimo(comp, "FS_deslizamento")
            fsa, ha = _minimo(trac, "FS_arrancamento"); fst, ht = _minimo(trac, "FS_tombamento"); fsu, _ = _minimo(trac, "FS_USBR")
            pun = r["puncao"]; fsp = float(pun.FS.min())
            cel = r["celulas"]; n1 = r["N1"]; n2 = r["N2"]; ab = r["arm_base"]
            res = dict(sap=True, solo=nome, A_m=s["A"], a_m=s["a"], La_m=s["La"], Lb_m=s["Lb"], Lf_m=s["Lf"],
                       L_m=g["L"], D_m=g["D"], Dc_m=g["Dc"], rigidez=_st(g["rigida"]),
                       vent_m3=g["vent"], reaterro_m3=g["reaterro"], escavacao_m3=g["escavacao"], Pmin_kgf=g["Pmin"], Pmax_kgf=g["Pmax"], Ps_kgf=g["Ps"],
                       sigma_adm_calc=cel.get("B42"), sigma_empirica=cel.get("B46"), Qrt_kgf=cel.get("B153"),
                       sigma_media_max=float(comp.sigma_media.max()), sigma_borda_max=float(comp.sigma_borda.max()),
                       FS_compressao_min=fsc, hip_compressao=hc, FS_empirico_min=fse, FS_deslizamento_min=fsd, hip_deslizamento=hd,
                       FS_arrancamento_min=fsa, hip_arrancamento=ha, FS_tombamento_min=fst, hip_tombamento=ht, FS_USBR_min=fsu, FS_puncao_min=fsp)
            res["compressao"] = _st(fsc is not None and fsc >= 1 and fse is not None and fse >= 1)
            res["deslizamento"] = _st(fsd is not None and fsd >= 1)
            res["arrancamento"] = _st(fsa is None or fsa >= 1)
            res["tombamento"] = _st(fst is None or fst >= 1)
            res["puncao"] = _st(fsp >= 1)
            res["situacao"] = _st(all(res[k] == "ATENDE" for k in ["compressao", "deslizamento", "arrancamento", "tombamento", "puncao", "rigidez"]))
            res.update(N1_phi_mm=n1["phi_mm"], N1_n=n1["n"], N1_As_cm2=n1["As_cm2"], N1_As_req_cm2=n1["As_req_cm2"], N1_esp_cm=n1["esp_cm"], N1_transpasse_cm=n1["transpasse_cm"],
                       N1_metodo=n1.get("metodo", "Ábaco"), N1_MRd_kgfm=n1.get("MRd_kgfm"), N1_utilizacao=n1.get("utilizacao"), N1_hip_verificacao=n1.get("hipotese_verificacao"), N1_envoltoria=n1.get("envoltoria"), N1_mxmy=n1.get("mxmy"),
                       N2_phi_mm=n2["phi_mm"], N2_esp_cm=n2["esp_cm"], N2_Vd_kgf=n2["Vd_kgf"], N2_Vsw_kgf=n2["Vsw_kgf"], N2_Vc_kgf=n2["Vc_kgf"], N2_VRd2_kgf=n2["VRd2_kgf"], N2_comp_m=n2["comprimento_m"],
                       base_phi_mm=ab["N4"]["phi_mm"], base_n=ab["N4"]["n_por_direcao"], base_As_cm2=ab["N4"]["As_cm2"], base_esp_cm=ab["N4"]["esp_cm"],
                       N3_transpasse_cm=ab["N3"]["transpasse_cm"], N4_transpasse_cm=ab["N4"]["transpasse_cm"])
            res["N1_txt"] = f"{n1['n']} Ø {n1['phi_mm']:g}"; res["N2_txt"] = f"Ø {n2['phi_mm']:g} c/{n2['esp_cm']:g}"
            res["base_txt"] = f"{ab['N4']['n_por_direcao']} Ø {ab['N4']['phi_mm']:g} c/{ab['N4']['esp_cm']:.1f}"
            resultados[nome] = res
            tabelas[nome] = dict(compressao=comp.to_dict("records"), tracao=trac.to_dict("records"),
                                 base=r["base"].to_dict("records"), fuste=r["fuste"].to_dict("records"),
                                 estribos=r["opcoes_estribos"].to_dict("records"), puncao=pun.to_dict("records"),
                                 ferro_base=r["ferro_base"].to_dict("records"))
            q = r["quantitativos"].to_dict("records")
            for l in q: l["peso_total_kgf"] = l["aco_total_kg"]
            quant[nome] = dict(n1=f"N1 — {n1['n']} Ø {n1['phi_mm']:g} mm", n2=f"N2 — Ø {n2['phi_mm']:g} mm c/{n2['esp_cm']:g} cm", linhas=q)
        except Exception as ex:
            erros[nome] = f"{type(ex).__name__}: {ex}"
    return json.dumps(_limpa({"solos": [s["nome"] for s in e["solos"]], "stub": stub, "resultados": resultados,
                              "tabelas": tabelas, "quantitativos": quant, "erros": erros}))
