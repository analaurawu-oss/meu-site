"""
Estaca de Euler-Bernoulli apoiada em molas horizontais concentradas.

As molas podem ser posicionadas a cada 1 m ou em qualquer profundidade.

Unidades:
    comprimento ............ m
    força .................. kN
    E ...................... kN/m²
    I ...................... m⁴
    EI ..................... kN.m²
    rigidez da mola K ...... kN/m
    deslocamento ........... m
    rotação ................ rad
    momento ................ kN.m
    cortante ................ kN

Convenções:
    - z = 0 no topo;
    - z cresce para baixo;
    - os gráficos possuem o eixo vertical invertido;
    - deslocamento horizontal positivo conforme H positivo.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Sequence, Union

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


NumberOrFunction = Union[float, Callable[[float], float]]


@dataclass
class ModeloEstaca:
    comprimento: float
    n_elementos: int
    E: NumberOrFunction
    I: NumberOrFunction

    # Posições e rigidezes das molas concentradas
    z_molas: Sequence[float]
    k_molas: Sequence[float]

    # Ações aplicadas no topo
    H: float = 0.0
    M0: float = 0.0

    # "livre", "engastada" ou "mola"
    condicao_topo: str = "livre"
    condicao_ponta: str = "livre"

    # Molas adicionais nos extremos, se necessárias
    k_topo_horizontal: float = 0.0
    k_topo_rotacional: float = 0.0
    k_ponta_horizontal: float = 0.0
    k_ponta_rotacional: float = 0.0


def avaliar(parametro: NumberOrFunction, z: float) -> float:
    """Avalia parâmetro constante ou função da profundidade."""
    return float(parametro(z) if callable(parametro) else parametro)


def matriz_viga(EI: float, le: float) -> np.ndarray:
    """Matriz de rigidez de viga Euler-Bernoulli."""
    return (EI / le**3) * np.array(
        [
            [12.0,       6.0 * le, -12.0,       6.0 * le],
            [6.0 * le, 4.0 * le**2, -6.0 * le, 2.0 * le**2],
            [-12.0,     -6.0 * le,  12.0,      -6.0 * le],
            [6.0 * le, 2.0 * le**2, -6.0 * le, 4.0 * le**2],
        ],
        dtype=float,
    )


def criar_molas_a_cada_metro(
    comprimento: float,
    rigidez: NumberOrFunction,
    incluir_topo: bool = False,
    incluir_ponta: bool = True,
):
    """
    Cria uma mola nas profundidades inteiras da estaca.

    Exemplos para L = 15 m:
        incluir_topo=False:
            z = 1, 2, 3, ..., 15 m

        incluir_topo=True:
            z = 0, 1, 2, ..., 15 m

    O parâmetro 'rigidez' pode ser:
        - número constante, em kN/m;
        - função K(z), em kN/m.
    """
    primeira = 0 if incluir_topo else 1
    ultima_inteira = int(np.floor(comprimento + 1e-12))

    z_molas = np.arange(primeira, ultima_inteira + 1, dtype=float)

    if not incluir_ponta:
        z_molas = z_molas[z_molas < comprimento - 1e-10]

    # Se L não for inteiro, adiciona-se opcionalmente mola na ponta
    if (
        incluir_ponta
        and comprimento > 0
        and not np.any(np.isclose(z_molas, comprimento))
    ):
        z_molas = np.append(z_molas, comprimento)

    k_molas = np.array(
        [avaliar(rigidez, z) for z in z_molas],
        dtype=float,
    )

    return z_molas, k_molas


def criar_malha_com_molas(
    comprimento: float,
    n_elementos: int,
    z_molas: Sequence[float],
) -> np.ndarray:
    """
    Cria a malha de elementos finitos garantindo que cada posição
    de mola coincida exatamente com um nó.

    A malha-base uniforme é combinada com as posições das molas.
    """
    if comprimento <= 0.0:
        raise ValueError("O comprimento deve ser positivo.")

    if n_elementos < 1:
        raise ValueError("n_elementos deve ser maior ou igual a 1.")

    z_base = np.linspace(0.0, comprimento, n_elementos + 1)
    z_molas = np.asarray(z_molas, dtype=float)

    if np.any(z_molas < -1e-10) or np.any(z_molas > comprimento + 1e-10):
        raise ValueError(
            "Todas as molas devem estar entre o topo e a ponta da estaca."
        )

    z_molas = np.clip(z_molas, 0.0, comprimento)

    # Arredondamento apenas para eliminar pequenas diferenças numéricas
    z = np.unique(
        np.round(
            np.concatenate(([0.0, comprimento], z_base, z_molas)),
            decimals=10,
        )
    )

    return z


def localizar_no(z_nos: np.ndarray, z_procurado: float) -> int:
    """Localiza o nó correspondente à posição de uma mola."""
    indice = int(np.argmin(np.abs(z_nos - z_procurado)))

    if not np.isclose(z_nos[indice], z_procurado, atol=1e-8):
        raise ValueError(
            f"Não foi encontrado nó em z = {z_procurado:.6f} m."
        )

    return indice


def montar_sistema(modelo: ModeloEstaca):
    """Monta matrizes globais e vetor de carregamentos."""
    z_molas = np.asarray(modelo.z_molas, dtype=float)
    k_molas = np.asarray(modelo.k_molas, dtype=float)

    if len(z_molas) != len(k_molas):
        raise ValueError(
            "z_molas e k_molas devem possuir o mesmo número de valores."
        )

    if np.any(k_molas < 0.0):
        raise ValueError("As rigidezes das molas não podem ser negativas.")

    z = criar_malha_com_molas(
        comprimento=modelo.comprimento,
        n_elementos=modelo.n_elementos,
        z_molas=z_molas,
    )

    n_nos = len(z)
    n_elementos_ef = n_nos - 1
    n_gl = 2 * n_nos

    K_viga = np.zeros((n_gl, n_gl), dtype=float)
    K_molas = np.zeros((n_gl, n_gl), dtype=float)
    F = np.zeros(n_gl, dtype=float)

    # ----------------------------------------------------------
    # Elementos de viga
    # ----------------------------------------------------------
    for e in range(n_elementos_ef):
        z1 = z[e]
        z2 = z[e + 1]
        le = z2 - z1
        z_meio = 0.5 * (z1 + z2)

        EI = avaliar(modelo.E, z_meio) * avaliar(modelo.I, z_meio)

        if EI <= 0.0:
            raise ValueError(
                f"EI inválido no elemento {e}: {EI:.6e} kN.m²."
            )

        ke = matriz_viga(EI, le)

        gl = np.array(
            [2 * e, 2 * e + 1, 2 * (e + 1), 2 * (e + 1) + 1],
            dtype=int,
        )

        K_viga[np.ix_(gl, gl)] += ke

    # ----------------------------------------------------------
    # Molas concentradas nas posições informadas
    # ----------------------------------------------------------
    nos_das_molas = []

    for zm, km in zip(z_molas, k_molas):
        no = localizar_no(z, zm)
        gl_y = 2 * no

        K_molas[gl_y, gl_y] += km
        nos_das_molas.append(no)

    # Molas adicionais nos extremos
    gl_y_topo = 0
    gl_rot_topo = 1
    gl_y_ponta = 2 * (n_nos - 1)
    gl_rot_ponta = gl_y_ponta + 1

    K_molas[gl_y_topo, gl_y_topo] += modelo.k_topo_horizontal
    K_molas[gl_rot_topo, gl_rot_topo] += modelo.k_topo_rotacional
    K_molas[gl_y_ponta, gl_y_ponta] += modelo.k_ponta_horizontal
    K_molas[gl_rot_ponta, gl_rot_ponta] += modelo.k_ponta_rotacional

    K_global = K_viga + K_molas

    # Força e momento no topo
    F[gl_y_topo] += modelo.H
    F[gl_rot_topo] += modelo.M0

    return {
        "z": z,
        "z_molas": z_molas,
        "k_molas": k_molas,
        "nos_das_molas": np.asarray(nos_das_molas, dtype=int),
        "K": K_global,
        "K_viga": K_viga,
        "K_molas": K_molas,
        "F": F,
    }


def obter_graus_restritos(
    modelo: ModeloEstaca,
    n_nos: int,
) -> np.ndarray:
    """Obtém os graus de liberdade restringidos."""
    restritos = []

    topo = modelo.condicao_topo.lower()
    ponta = modelo.condicao_ponta.lower()

    if topo == "engastada":
        restritos.extend([0, 1])
    elif topo not in {"livre", "mola"}:
        raise ValueError(
            "condicao_topo deve ser 'livre', 'engastada' ou 'mola'."
        )

    if ponta == "engastada":
        restritos.extend([2 * (n_nos - 1), 2 * (n_nos - 1) + 1])
    elif ponta not in {"livre", "mola"}:
        raise ValueError(
            "condicao_ponta deve ser 'livre', 'engastada' ou 'mola'."
        )

    return np.asarray(sorted(set(restritos)), dtype=int)


def resolver_modelo(modelo: ModeloEstaca) -> dict:
    """Monta e resolve o sistema estrutural linear."""
    sistema = montar_sistema(modelo)

    z = sistema["z"]
    K = sistema["K"]
    F = sistema["F"]

    n_gl = len(F)

    restritos = obter_graus_restritos(modelo, len(z))
    todos = np.arange(n_gl, dtype=int)
    livres = np.setdiff1d(todos, restritos)

    u = np.zeros(n_gl, dtype=float)

    K_ll = K[np.ix_(livres, livres)]
    F_l = F[livres]

    try:
        u[livres] = np.linalg.solve(K_ll, F_l)
    except np.linalg.LinAlgError as erro:
        raise RuntimeError(
            "Sistema singular ou mal condicionado. Verifique EI, "
            "molas e condições de contorno."
        ) from erro

    reacoes_apoio = K @ u - F

    # Forças desenvolvidas pelas molas sobre a estrutura.
    # K_molas @ u possui o sentido necessário para equilibrar as
    # ações no sistema matricial; a reação resistente é seu oposto.
    forcas_nodais_molas = -sistema["K_molas"] @ u

    sistema.update(
        {
            "modelo": modelo,
            "u": u,
            "restritos": restritos,
            "livres": livres,
            "reacoes_apoio": reacoes_apoio,
            "forcas_nodais_molas": forcas_nodais_molas,
        }
    )

    return sistema


def resultados_molas(resultado: dict) -> pd.DataFrame:
    """Monta a tabela de resultados de cada mola."""
    u = resultado["u"]
    z_molas = resultado["z_molas"]
    k_molas = resultado["k_molas"]
    nos = resultado["nos_das_molas"]

    y = np.array([u[2 * no] for no in nos])
    reacao = -k_molas * y

    return pd.DataFrame(
        {
            "mola": np.arange(1, len(z_molas) + 1),
            "no_ef": nos,
            "z_m": z_molas,
            "K_kN_m": k_molas,
            "y_m": y,
            "y_mm": 1000.0 * y,
            "reacao_mola_kN": reacao,
        }
    )


def resultados_nodais(resultado: dict) -> pd.DataFrame:
    """Retorna deslocamentos e rotações dos nós da estaca."""
    z = resultado["z"]
    u = resultado["u"]

    return pd.DataFrame(
        {
            "no": np.arange(len(z)),
            "z_m": z,
            "y_m": u[0::2],
            "y_mm": 1000.0 * u[0::2],
            "theta_rad": u[1::2],
        }
    )


def esforcos_elementos(resultado: dict) -> pd.DataFrame:
    """Recupera esforços locais nas extremidades dos elementos."""
    modelo = resultado["modelo"]
    z = resultado["z"]
    u = resultado["u"]

    dados = []

    for e in range(len(z) - 1):
        z1 = z[e]
        z2 = z[e + 1]
        le = z2 - z1
        z_meio = 0.5 * (z1 + z2)

        EI = avaliar(modelo.E, z_meio) * avaliar(modelo.I, z_meio)
        ke = matriz_viga(EI, le)

        gl = np.array(
            [2 * e, 2 * e + 1, 2 * (e + 1), 2 * (e + 1) + 1]
        )

        ue = u[gl]
        fe = ke @ ue

        dados.append(
            {
                "elemento": e,
                "z_inicial_m": z1,
                "z_final_m": z2,
                "EI_kNm2": EI,
                "V_inicial_kN": -fe[0],
                "M_inicial_kNm": -fe[1],
                "V_final_kN": fe[2],
                "M_final_kNm": fe[3],
            }
        )

    return pd.DataFrame(dados)


def diagramas_nodais(resultado: dict) -> pd.DataFrame:
    """
    Calcula valores nodais aproximados de momento e cortante.

    Nos nós internos, usa a média dos valores dos elementos adjacentes.
    """
    modelo = resultado["modelo"]
    z = resultado["z"]
    u = resultado["u"]

    n_nos = len(z)
    momentos = [[] for _ in range(n_nos)]
    cortantes = [[] for _ in range(n_nos)]

    for e in range(n_nos - 1):
        z1 = z[e]
        z2 = z[e + 1]
        le = z2 - z1
        z_meio = 0.5 * (z1 + z2)

        EI = avaliar(modelo.E, z_meio) * avaliar(modelo.I, z_meio)
        ke = matriz_viga(EI, le)

        gl = np.array(
            [2 * e, 2 * e + 1, 2 * (e + 1), 2 * (e + 1) + 1]
        )

        fe = ke @ u[gl]

        V_inicio = -fe[0]
        M_inicio = -fe[1]
        V_final = fe[2]
        M_final = fe[3]

        cortantes[e].append(V_inicio)
        momentos[e].append(M_inicio)

        cortantes[e + 1].append(V_final)
        momentos[e + 1].append(M_final)

    V = np.array([np.mean(valores) for valores in cortantes])
    M = np.array([np.mean(valores) for valores in momentos])

    return pd.DataFrame(
        {
            "no": np.arange(n_nos),
            "z_m": z,
            "V_kN": V,
            "M_kNm": M,
        }
    )


def verificar_equilibrio(resultado: dict) -> dict:
    """
    Verifica o equilíbrio global com as forças concentradas das molas.

    Para topo e ponta livres, espera-se aproximadamente:
        H + soma(R_i) = 0

        M0 + soma(R_i * z_i) = 0

    Se existirem engastes ou molas rotacionais, suas reações também
    devem ser incluídas na interpretação do equilíbrio.
    """
    modelo = resultado["modelo"]
    molas = resultados_molas(resultado)

    soma_reacoes = molas["reacao_mola_kN"].sum()
    momento_reacoes = (
        molas["reacao_mola_kN"] * molas["z_m"]
    ).sum()

    # Inclui molas concentradas adicionais no topo e na ponta
    u = resultado["u"]
    L = modelo.comprimento

    R_topo_adicional = -modelo.k_topo_horizontal * u[0]
    M_topo_adicional = -modelo.k_topo_rotacional * u[1]

    R_ponta_adicional = -modelo.k_ponta_horizontal * u[-2]
    M_ponta_adicional = -modelo.k_ponta_rotacional * u[-1]

    resultante_total = (
        soma_reacoes + R_topo_adicional + R_ponta_adicional
    )

    momento_total_topo = (
        momento_reacoes
        + M_topo_adicional
        + R_ponta_adicional * L
        + M_ponta_adicional
    )

    return {
        "H_aplicado_kN": modelo.H,
        "M0_aplicado_kNm": modelo.M0,
        "resultante_molas_kN": resultante_total,
        "momento_molas_topo_kNm": momento_total_topo,
        "erro_forca_kN": modelo.H + resultante_total,
        "erro_momento_kNm": modelo.M0 + momento_total_topo,
    }


def imprimir_resumo(resultado: dict) -> None:
    """Exibe resultados principais."""
    nodais = resultados_nodais(resultado)
    molas = resultados_molas(resultado)
    diagramas = diagramas_nodais(resultado)
    equilibrio = verificar_equilibrio(resultado)

    i_y = nodais["y_mm"].abs().idxmax()
    i_m = diagramas["M_kNm"].abs().idxmax()
    i_r = molas["reacao_mola_kN"].abs().idxmax()

    print("\nRESUMO")
    print("-" * 60)
    print(f"Número de elementos:  {len(resultado['z']) - 1}")
    print(f"Número de molas:      {len(molas)}")
    print(f"Deslocamento do topo: {nodais.loc[0, 'y_mm']:.4f} mm")
    print(f"Rotação do topo:      {nodais.loc[0, 'theta_rad']:.6e} rad")
    print(
        f"Deslocamento máximo: {nodais.loc[i_y, 'y_mm']:.4f} mm "
        f"em z={nodais.loc[i_y, 'z_m']:.3f} m"
    )
    print(
        f"Momento máximo:      {diagramas.loc[i_m, 'M_kNm']:.4f} kN.m "
        f"em z={diagramas.loc[i_m, 'z_m']:.3f} m"
    )
    print(
        f"Maior reação:        {molas.loc[i_r, 'reacao_mola_kN']:.4f} kN "
        f"em z={molas.loc[i_r, 'z_m']:.3f} m"
    )
    print(
        f"Erro de força:       {equilibrio['erro_forca_kN']:.4e} kN"
    )
    print(
        f"Erro de momento:     {equilibrio['erro_momento_kNm']:.4e} kN.m"
    )


def plotar_resultados(
    resultado: dict,
    fator_deformada: Optional[float] = None,
    arquivo: Optional[str] = "graficos_estaca.png",
) -> None:
    """
    Gera gráficos com profundidade positiva para baixo.

    O comando invert_yaxis() coloca:
        z = 0 no topo;
        z = L na parte inferior.

    A configuração deformada é apresentada como deslocamento
    horizontal versus profundidade.
    """
    nodais = resultados_nodais(resultado)
    molas = resultados_molas(resultado)
    diagramas = diagramas_nodais(resultado)

    z = nodais["z_m"].to_numpy()
    y_mm = nodais["y_mm"].to_numpy()

    if fator_deformada is None:
        fator_deformada = 1.0

    fig, eixos = plt.subplots(
        1,
        4,
        figsize=(17, 8),
        sharey=True,
    )

    # ----------------------------------------------------------
    # 1. Estaca deformada
    # ----------------------------------------------------------
    eixos[0].plot(
        fator_deformada * y_mm,
        z,
        color="tab:blue",
        linewidth=2,
        label="Deformada",
    )
    eixos[0].plot(
        np.zeros_like(z),
        z,
        color="black",
        linestyle="--",
        linewidth=1,
        label="Eixo original",
    )
    eixos[0].scatter(
        fator_deformada * molas["y_mm"],
        molas["z_m"],
        color="tab:orange",
        s=25,
        zorder=3,
        label="Molas",
    )
    eixos[0].set_xlabel(
        f"Deslocamento × {fator_deformada:g} (mm)"
    )
    eixos[0].set_ylabel("Profundidade z (m)")
    eixos[0].set_title("Estaca deformada")
    eixos[0].legend(fontsize=8)

    # ----------------------------------------------------------
    # 2. Reação das molas
    # ----------------------------------------------------------
    eixos[1].plot(
        molas["reacao_mola_kN"],
        molas["z_m"],
        marker="o",
        color="tab:green",
    )
    eixos[1].set_xlabel("Reação da mola (kN)")
    eixos[1].set_title("Reações concentradas")

    # ----------------------------------------------------------
    # 3. Momento
    # ----------------------------------------------------------
    eixos[2].plot(
        diagramas["M_kNm"],
        diagramas["z_m"],
        color="tab:red",
        linewidth=2,
    )
    eixos[2].set_xlabel("Momento M (kN.m)")
    eixos[2].set_title("Momento fletor")

    # ----------------------------------------------------------
    # 4. Cortante
    # ----------------------------------------------------------
    eixos[3].plot(
        diagramas["V_kN"],
        diagramas["z_m"],
        color="tab:purple",
        linewidth=2,
    )
    eixos[3].set_xlabel("Cortante V (kN)")
    eixos[3].set_title("Força cortante")

    for eixo in eixos:
        eixo.axvline(0.0, color="black", linewidth=0.8)
        eixo.grid(True, linestyle="--", alpha=0.5)
        eixo.invert_yaxis()  # Eixo Y invertido: topo em cima

    fig.suptitle(
        "Estaca sobre molas horizontais concentradas a cada metro"
    )
    fig.tight_layout()

    if arquivo:
        fig.savefig(arquivo, dpi=200, bbox_inches="tight")
        print(f"Gráfico salvo em: {Path(arquivo).resolve()}")

    plt.show()


def exportar_excel(
    resultado: dict,
    arquivo: str = "resultado_estaca.xlsx",
) -> None:
    """
    Exporta os resultados e insere gráficos de momento e cortante
    dentro do arquivo Excel.
    """
    nodais = resultados_nodais(resultado)
    molas = resultados_molas(resultado)
    elementos = esforcos_elementos(resultado)
    diagramas = diagramas_nodais(resultado)

    resultados_estaca = nodais.merge(
        diagramas[["z_m", "M_kNm", "V_kN"]],
        on="z_m",
        how="left",
    )

    resultados_estaca = resultados_estaca[
        [
            "no",
            "z_m",
            "y_m",
            "y_mm",
            "theta_rad",
            "M_kNm",
            "V_kN",
        ]
    ]

    equilibrio = pd.DataFrame(
        verificar_equilibrio(resultado).items(),
        columns=["grandeza", "valor"],
    )

    with pd.ExcelWriter(arquivo, engine="openpyxl") as writer:

        resultados_estaca.to_excel(
            writer,
            sheet_name="Resultado_estaca",
            index=False,
        )

        molas.to_excel(
            writer,
            sheet_name="Molas",
            index=False,
        )

        elementos.to_excel(
            writer,
            sheet_name="Elementos",
            index=False,
        )

        equilibrio.to_excel(
            writer,
            sheet_name="Equilibrio",
            index=False,
        )

        pd.DataFrame(resultado["K"]).to_excel(
            writer,
            sheet_name="Matriz_global",
            index=False,
            header=False,
        )

        pd.DataFrame(
            {
                "F_kN_ou_kNm": resultado["F"],
                "u_m_ou_rad": resultado["u"],
                "reacao_apoio": resultado["reacoes_apoio"],
            }
        ).to_excel(
            writer,
            sheet_name="Sistema",
            index=False,
        )

        # ------------------------------------------------------
        # Formatação e gráficos do Excel
        # ------------------------------------------------------
        workbook = writer.book
        worksheet = writer.sheets["Resultado_estaca"]

        from openpyxl.chart import ScatterChart, Reference, Series

        ultima_linha = len(resultados_estaca) + 1

        # Colunas da aba:
        # A = no
        # B = z_m
        # C = y_m
        # D = y_mm
        # E = theta_rad
        # F = M_kNm
        # G = V_kN

        # ------------------------------------------------------
        # Gráfico de momento
        # X = momento
        # Y = profundidade
        # ------------------------------------------------------
        grafico_momento = ScatterChart()
        grafico_momento.title = "Momento fletor ao longo da estaca"
        grafico_momento.x_axis.title = "Momento (kN.m)"
        grafico_momento.y_axis.title = "Profundidade (m)"
        grafico_momento.style = 13
        grafico_momento.height = 14
        grafico_momento.width = 11

        x_momento = Reference(
            worksheet,
            min_col=6,
            min_row=2,
            max_row=ultima_linha,
        )

        y_profundidade = Reference(
            worksheet,
            min_col=2,
            min_row=2,
            max_row=ultima_linha,
        )

        serie_momento = Series(
            x_momento,
            y_profundidade,
            title="M (kN.m)",
        )

        serie_momento.graphicalProperties.line.solidFill = "C00000"
        serie_momento.graphicalProperties.line.width = 25000

        grafico_momento.series.append(serie_momento)

        # Inverte o eixo vertical: z=0 em cima
        grafico_momento.y_axis.scaling.orientation = "maxMin"

        worksheet.add_chart(grafico_momento, "I2")

        # ------------------------------------------------------
        # Gráfico de cortante
        # X = cortante
        # Y = profundidade
        # ------------------------------------------------------
        grafico_cortante = ScatterChart()
        grafico_cortante.title = "Força cortante ao longo da estaca"
        grafico_cortante.x_axis.title = "Cortante (kN)"
        grafico_cortante.y_axis.title = "Profundidade (m)"
        grafico_cortante.style = 13
        grafico_cortante.height = 14
        grafico_cortante.width = 11

        x_cortante = Reference(
            worksheet,
            min_col=7,
            min_row=2,
            max_row=ultima_linha,
        )

        serie_cortante = Series(
            x_cortante,
            y_profundidade,
            title="V (kN)",
        )

        serie_cortante.graphicalProperties.line.solidFill = "7030A0"
        serie_cortante.graphicalProperties.line.width = 25000

        grafico_cortante.series.append(serie_cortante)

        # Inverte o eixo vertical: z=0 em cima
        grafico_cortante.y_axis.scaling.orientation = "maxMin"

        worksheet.add_chart(grafico_cortante, "I30")

        # ------------------------------------------------------
        # Formatação das colunas
        # ------------------------------------------------------
        larguras = {
            "A": 10,
            "B": 14,
            "C": 16,
            "D": 16,
            "E": 16,
            "F": 16,
            "G": 16,
        }

        for coluna, largura in larguras.items():
            worksheet.column_dimensions[coluna].width = largura

        worksheet.freeze_panes = "A2"
        worksheet.auto_filter.ref = (
            f"A1:G{ultima_linha}"
        )

    print(f"Arquivo Excel salvo em: {Path(arquivo).resolve()}")


# ==============================================================
# CÉLULA DE ENTRADA PARA O GOOGLE COLAB
# (no Colab, cole esta parte numa célula separada, abaixo do código acima)
# ==============================================================

# @title Dados de entrada

# -------------------- Geometria --------------------
L = 7.0  # @param {type:"number"}
# @markdown Comprimento da estaca (m). Use valor inteiro: cada trecho de 1 m = ΔH.

secao = "circular"  # @param ["circular", "retangular"]
D = 1.00  # @param {type:"number"}
# @markdown Seção circular: diâmetro D (m).

A = 0.40  # @param {type:"number"}
B = 0.60  # @param {type:"number"}
# @markdown Seção retangular: A = lado paralelo à força H (direção da flexão) e B = lado perpendicular (m).

# -------------------- Material --------------------
E = 25000000.0  # @param {type:"number"}
# @markdown Módulo de elasticidade (kN/m²).

# -------------------- Molas --------------------
incluir_topo = False  # @param {type:"boolean"}
# @markdown Se marcado, há mola também em z = 0 m. Se não, as molas ficam em z = 1, 2, ..., L.

k_texto = "300, 600, 3000, 6000, 6000, 6000, 20000"  # @param {type:"string"}
# @markdown Rigidez de cada mola (kN/m), separada por vírgula, de cima para baixo (uma por metro).
# @markdown Com L = 7 e sem mola no topo: 7 valores (z = 1 a 7 m). Com mola no topo: 8 valores.
# @markdown Se digitar um único valor, ele é usado em todas as molas.

# -------------------- Ações e malha --------------------
H = 1000.0  # @param {type:"number"}
M0 = 12500.0  # @param {type:"number"}
# @markdown H em kN e M0 em kN.m, aplicados no topo.

n_elementos = 60  # @param {type:"integer"}
# @markdown Número de elementos da malha (refina os esforços entre molas).

condicao_topo = "livre"  # @param ["livre", "engastada", "mola"]
condicao_ponta = "livre"  # @param ["livre", "engastada", "mola"]

baixar_arquivos = True  # @param {type:"boolean"}
# @markdown No Colab, baixa automaticamente o Excel e o gráfico ao final.


# ==============================================================
# PROCESSAMENTO
# ==============================================================

def calcular_inercia(secao: str, D: float, A: float, B: float) -> float:
    """Inércia da seção em relação ao eixo de flexão (m⁴)."""
    if secao == "circular":
        return np.pi * D**4 / 64.0
    if secao == "retangular":
        return B * A**3 / 12.0
    raise ValueError("secao deve ser 'circular' ou 'retangular'.")


def molas_por_lista(comprimento: float, k_texto: str, incluir_topo: bool):
    """Gera z e K das molas a cada 1 m a partir dos valores digitados."""
    if abs(comprimento - round(comprimento)) > 1e-9:
        raise ValueError("L deve ser inteiro para molas a cada metro.")

    n = int(round(comprimento))
    z_molas = np.arange(0 if incluir_topo else 1, n + 1, dtype=float)

    valores = [
        float(v) for v in k_texto.replace(";", ",").split(",") if v.strip()
    ]
    if len(valores) == 1:
        valores = valores * len(z_molas)
    if len(valores) != len(z_molas):
        raise ValueError(
            f"Foram digitados {len(valores)} valores de K, mas são "
            f"necessários {len(z_molas)} (z = {z_molas[0]:g} a {z_molas[-1]:g} m)."
        )
    return z_molas, np.array(valores, dtype=float)


I = calcular_inercia(secao, D, A, B)
print(f"Seção {secao}: I = {I:.6e} m⁴  |  EI = {E * I:,.1f} kN.m²")

z_molas, k_molas = molas_por_lista(L, k_texto, incluir_topo)
print(pd.DataFrame({"z (m)": z_molas, "K (kN/m)": k_molas}).to_string(index=False))

modelo = ModeloEstaca(
    comprimento=L,
    n_elementos=n_elementos,
    E=E,
    I=I,
    z_molas=z_molas,
    k_molas=k_molas,
    H=H,
    M0=M0,
    condicao_topo=condicao_topo,
    condicao_ponta=condicao_ponta,
)

resultado = resolver_modelo(modelo)

imprimir_resumo(resultado)

print("\nRESULTADOS DAS MOLAS")
print(resultados_molas(resultado).to_string(index=False))

exportar_excel(resultado, arquivo="resultado_estaca.xlsx")

plotar_resultados(
    resultado,
    fator_deformada=1.0,
    arquivo="graficos_estaca_molas.png",
)

if baixar_arquivos:
    try:
        from google.colab import files

        files.download("resultado_estaca.xlsx")
        files.download("graficos_estaca_molas.png")
    except ImportError:
        pass  # fora do Colab, os arquivos ficam na pasta atual
