"""Copia os motores de motor/*.py para dentro do index.html.

O site busca primeiro motor/<arquivo>.py (quando está publicado ou servido
por um servidor local); se não conseguir (por exemplo, index.html aberto
direto do disco), usa a cópia embutida no próprio index.html. Rode este
script depois de alterar qualquer motor para manter as duas cópias iguais:

    python motor/embutir.py
"""
import base64
import gzip
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOTORES = {
    "tubulao_sem_base.py": "MOTOR_TUBULAO_SEM_BASE",
    "tubulao_com_base.py": "MOTOR_TUBULAO_COM_BASE",
    "sapata.py": "MOTOR_SAPATA",
}


def main():
    caminho = os.path.join(RAIZ, "index.html")
    with open(caminho, encoding="utf-8") as f:
        linhas = f.read().split("\n")
    i = next(n for n, l in enumerate(linhas) if l.startswith('{"') and '"compressed"' in l)
    manifesto = json.loads(linhas[i])
    for arq, glob in MOTORES.items():
        chave = next(k for k, v in manifesto.items() if v["mime"].endswith("javascript")
                     and gzip.decompress(base64.b64decode(v["data"])).startswith(f"// Gerado a partir de {arq}".encode()))
        with open(os.path.join(RAIZ, "motor", arq), encoding="utf-8") as f:
            codigo = f.read()
        js = f"// Gerado a partir de {arq} — não editar à mão\nwindow.{glob} = {json.dumps(codigo, ensure_ascii=False)};\n"
        manifesto[chave]["data"] = base64.b64encode(gzip.compress(js.encode("utf-8"), mtime=0)).decode()
        print(f"{arq} -> {chave}")
    linhas[i] = json.dumps(manifesto)
    with open(caminho, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas))


if __name__ == "__main__":
    main()
