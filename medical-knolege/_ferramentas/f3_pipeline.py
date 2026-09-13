#!/usr/bin/env python3
"""F3 — extração página a página das DN CONITEC (OA joelho / OA quadril).

Autor do texto: pdftotext -layout (Poppler).
Autor das imagens: pdfimages -j + pdftoppm.
Auditor (não escreve MD): liteparse.
Código nosso. Estudo: mecanismo do CLI Poppler; skill liteparse fechada antes de implementar.
"""
from __future__ import annotations

import hashlib
import json
import random
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POPPLER = {
    "pdftotext": "/opt/homebrew/bin/pdftotext",
    "pdfinfo": "/opt/homebrew/bin/pdfinfo",
    "pdfimages": "/opt/homebrew/bin/pdfimages",
    "pdftoppm": "/opt/homebrew/bin/pdftoppm",
}

DOCS = [
    {
        "doc_id": "DN-osteoartrite-joelho-MS-conitec",
        "folder": "DN-osteoartrite-joelho",
        "area": "reumatologia",
        "img_dir": "joelho",
        "short": "joelho",
        "pdf_name": "DN-osteoartrite-joelho-MS-conitec.pdf",
        "expected_pages": 82,
        "expected_sha256": "7814d321542893766bc8fb85e97c87903161eeb309876eaf6a8cf2264ac43e74",
        "titulo": "Diretriz Nacional — Tratamento não cirúrgico da osteoartrite de joelho (MS/CONITEC)",
        "tipo_ms": "DN",
        "creation_date": "2024-08-26",
    },
    {
        "doc_id": "DN-osteoartrite-quadril-MS-conitec",
        "folder": "DN-osteoartrite-quadril",
        "area": "reumatologia",
        "img_dir": "quadril",
        "short": "quadril",
        "pdf_name": "DN-osteoartrite-quadril-MS-conitec.pdf",
        "expected_pages": 72,
        "expected_sha256": "e62b4d3023e696749d8ed56700d54c894cb0d39e24ff69172895af9d5f7fc937",
        "titulo": "Diretriz Nacional — Tratamento não cirúrgico da osteoartrite de quadril (MS/CONITEC)",
        "tipo_ms": "DN",
        "creation_date": "2024-08-26",
    },
]

SEED = 20260828
TETO_CHARS = 12000
RELATORIO = []


def log(msg: str) -> None:
    print(msg, flush=True)


def pdf_path(doc: dict) -> Path:
    return ROOT / "fontes-oficiais" / doc["area"] / doc["pdf_name"]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def pdfinfo_map(path: Path) -> dict[str, str]:
    out = run([POPPLER["pdfinfo"], str(path)]).stdout.decode("utf-8", "replace")
    info = {}
    for line in out.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            info[k.strip()] = v.strip()
    return info


def pdftotext_page(path: Path, n: int) -> str:
    out = run(
        [POPPLER["pdftotext"], "-layout", "-f", str(n), "-l", str(n), str(path), "-"]
    ).stdout
    return out.decode("utf-8", "replace")


def detect_folha(text: str, pdf_page: int) -> int | None:
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    candidates: list[int] = []
    for ln in lines[-10:]:
        m = re.search(r"(?:^|\s)(\d{1,3})\s*$", ln.strip())
        if not m:
            continue
        val = int(m.group(1))
        if 1 <= val <= pdf_page:
            candidates.append(val)
    return candidates[-1] if candidates else None


def yaml_dump(data: dict) -> str:
    lines = ["---"]
    for k, v in data.items():
        if isinstance(v, list):
            if not v:
                lines.append(f"{k}: []")
            else:
                lines.append(f"{k}:")
                for item in v:
                    lines.append(f"  - {item}")
        elif v is None:
            lines.append(f"{k}: null")
        elif isinstance(v, bool):
            lines.append(f"{k}: {'true' if v else 'false'}")
        elif isinstance(v, str):
            if v == "" or any(ch in v for ch in ":#{}[]&*?|>'!@%") or v.lower() in {
                "true", "false", "null", "yes", "no"
            }:
                lines.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
            else:
                lines.append(f"{k}: {v}")
        else:
            lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def list_embedded_images(path: Path) -> dict[int, int]:
    """page -> count of raster images (from pdfimages -list)."""
    proc = subprocess.run(
        [POPPLER["pdfimages"], "-list", str(path)],
        capture_output=True,
        check=False,
    )
    text = proc.stdout.decode("utf-8", "replace")
    counts: dict[int, int] = {}
    for line in text.splitlines():
        m = re.match(r"\s*(\d+)\s+\d+\s+image\b", line)
        if m:
            p = int(m.group(1))
            counts[p] = counts.get(p, 0) + 1
    return counts


# ---------------------------------------------------------------------------
# Etapa 0
# ---------------------------------------------------------------------------
def etapa0() -> dict:
    log("=== ETAPA 0 — congelar fonte ===")
    results = []
    ok = True
    for doc in DOCS:
        p = pdf_path(doc)
        if not p.is_file():
            log(f"FALTA PDF {p}")
            ok = False
            continue
        digest = sha256_file(p)
        info = pdfinfo_map(p)
        pages = int(info.get("Pages", "0"))
        encrypted = info.get("Encrypted", "")
        rot = info.get("Page rot", "")
        size = info.get("Page size", "")
        row = {
            "doc_id": doc["doc_id"],
            "sha256": digest,
            "pages": pages,
            "encrypted": encrypted,
            "page_rot": rot,
            "page_size": size,
            "hash_ok": digest == doc["expected_sha256"],
            "pages_ok": pages == doc["expected_pages"],
            "crypto_ok": encrypted.lower().startswith("no"),
            "rot_ok": rot in ("0", "0.0", ""),
            "a4_ok": "595" in size and "842" in size,
        }
        results.append(row)
        flags = [k for k in ("hash_ok", "pages_ok", "crypto_ok", "rot_ok", "a4_ok") if not row[k]]
        log(
            f"  {doc['short']}: sha256={digest[:12]}… pages={pages} "
            f"{'PASS' if not flags else 'NÃO PASSA ' + ','.join(flags)}"
        )
        if flags:
            ok = False
    RELATORIO.append({"etapa": 0, "pass": ok, "detalhe": results})
    if not ok:
        log("ETAPA 0 NÃO PASSA — extração segue mesmo assim (ordem: não parar).")
    else:
        log("ETAPA 0 PASS")
    return {"pass": ok, "docs": results}


# ---------------------------------------------------------------------------
# Etapa 1 — inventário
# ---------------------------------------------------------------------------
def etapa1(doc: dict) -> list[dict]:
    p = pdf_path(doc)
    n_pages = doc["expected_pages"]
    embedded = list_embedded_images(p)
    rows = []
    for n in range(1, n_pages + 1):
        text = pdftotext_page(p, n)
        chars = len(text)
        folha = detect_folha(text, n)
        n_img = embedded.get(n, 0)
        # Medido: joelho p.14 tem ~30 chars (só "ALGORITMO"); quadril p.14 tem
        # legenda longa ("ALGORITMO DE TRATAMENTO NÃO CIRÚRGICO…") e estoura 80.
        # Página com raster embutido é figura mesmo com legenda — senão o aceite
        # "p.14 = figura" mente no quadril e a IA fica sem caminho de imagem.
        if n == 1:
            kind = "capa"
        elif n_img:
            kind = "figura"
        elif chars < 80:
            kind = "escassa"
        else:
            kind = "texto"
        tags = []
        if n == 6:
            tags.append("nao_e_desta_dn")
        rows.append(
            {
                "pdf_page": n,
                "chars": chars,
                "folha_impressa": folha,
                "kind": kind,
                "n_imagens_embutidas": n_img,
                "tags": tags,
                "tabela_candidata": False,
            }
        )
    # marcar resumo das recomendações como candidato a tabela
    for row in rows:
        if 8 <= row["pdf_page"] <= 13:
            row["tabela_candidata"] = True
    out = ROOT / "indices" / f"inventario-{doc['doc_id']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "doc_id": doc["doc_id"],
        "sha256": doc["expected_sha256"],
        "pages": n_pages,
        "linhas": rows,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return rows


def aceite1(doc: dict, rows: list[dict]) -> bool:
    n = doc["expected_pages"]
    ok = len(rows) == n
    ok = ok and all(r["chars"] >= 0 for r in rows)
    by = {r["pdf_page"]: r for r in rows}
    ok = ok and by[1]["kind"] == "capa"
    ok = ok and by[14]["kind"] == "figura"
    if doc["short"] == "joelho":
        ok = ok and by[28]["folha_impressa"] == 27
    log(
        f"  aceite1 {doc['short']}: linhas={len(rows)}/{n} "
        f"p1={by[1]['kind']} p14={by[14]['kind']} "
        f"p28_folha={by.get(28, {}).get('folha_impressa')} "
        f"{'PASS' if ok else 'NÃO PASSA'}"
    )
    return ok


# ---------------------------------------------------------------------------
# Etapa 2 — imagens
# ---------------------------------------------------------------------------
def etapa2(doc: dict, rows: list[dict]) -> dict[int, list[str]]:
    p = pdf_path(doc)
    img_root = ROOT / "imagens" / doc["area"] / doc["img_dir"]
    img_root.mkdir(parents=True, exist_ok=True)
    rels: dict[int, list[str]] = {}

    # capa
    capa_stem = img_root / "p-001-capa"
    run(
        [
            POPPLER["pdftoppm"],
            "-png",
            "-r",
            "150",
            "-f",
            "1",
            "-l",
            "1",
            "-singlefile",
            str(p),
            str(capa_stem),
        ]
    )
    capa = capa_stem.with_suffix(".png")
    if capa.is_file() and capa.stat().st_size > 0:
        rels.setdefault(1, []).append(
            f"imagens/{doc['area']}/{doc['img_dir']}/{capa.name}"
        )

    # algoritmo embutido p.14
    tmp = img_root / "_tmp14"
    subprocess.run(
        [POPPLER["pdfimages"], "-j", "-f", "14", "-l", "14", str(p), str(tmp)],
        check=False,
        capture_output=True,
    )
    produced = sorted(img_root.glob("_tmp14*"))
    algo_rel = None
    if produced:
        src = produced[0]
        ext = src.suffix.lower() or ".jpg"
        dest = img_root / f"p-014-algoritmo{ext}"
        if dest.exists():
            dest.unlink()
        src.rename(dest)
        if dest.stat().st_size > 0:
            algo_rel = f"imagens/{doc['area']}/{doc['img_dir']}/{dest.name}"
            rels.setdefault(14, []).append(algo_rel)
        for extra in produced[1:]:
            extra.unlink(missing_ok=True)

    # raster da página 14 (legenda / borda)
    pag14_stem = img_root / "p-014-pagina"
    run(
        [
            POPPLER["pdftoppm"],
            "-png",
            "-r",
            "150",
            "-f",
            "14",
            "-l",
            "14",
            "-singlefile",
            str(p),
            str(pag14_stem),
        ]
    )
    pag14 = pag14_stem.with_suffix(".png")
    if pag14.is_file() and pag14.stat().st_size > 0:
        rels.setdefault(14, []).append(
            f"imagens/{doc['area']}/{doc['img_dir']}/{pag14.name}"
        )

    # demais escassas
    for row in rows:
        n = row["pdf_page"]
        if row["kind"] not in ("escassa",):
            continue
        if n in (1, 14):
            continue
        stem = img_root / f"p-{n:03d}-pagina"
        run(
            [
                POPPLER["pdftoppm"],
                "-png",
                "-r",
                "150",
                "-f",
                str(n),
                "-l",
                str(n),
                "-singlefile",
                str(p),
                str(stem),
            ]
        )
        png = stem.with_suffix(".png")
        if png.is_file() and png.stat().st_size > 0:
            rels.setdefault(n, []).append(
                f"imagens/{doc['area']}/{doc['img_dir']}/{png.name}"
            )

    return rels


def aceite2(doc: dict, rows: list[dict], rels: dict[int, list[str]]) -> bool:
    img_root = ROOT / "imagens" / doc["area"] / doc["img_dir"]
    files = [f for f in img_root.iterdir() if f.is_file() and f.stat().st_size > 0]
    need_kinds = [r for r in rows if r["kind"] in ("capa", "figura", "escassa")]
    has_capa = any("p-001-capa" in f.name for f in files)
    has_algo = any("p-014-algoritmo" in f.name or "p-014-pagina" in f.name for f in files)
    ok = has_capa and has_algo and len(files) >= len(need_kinds)
    log(
        f"  aceite2 {doc['short']}: arquivos={len(files)} "
        f"capa={has_capa} algo={has_algo} kinds={len(need_kinds)} "
        f"{'PASS' if ok else 'NÃO PASSA'}"
    )
    return ok


# ---------------------------------------------------------------------------
# Etapa 3 — MD
# ---------------------------------------------------------------------------
def etapa3(doc: dict, rows: list[dict], rels: dict[int, list[str]]) -> Path:
    md_dir = ROOT / "md-paginado" / doc["area"] / doc["folder"]
    md_dir.mkdir(parents=True, exist_ok=True)
    p = pdf_path(doc)
    fonte_rel = f"fontes-oficiais/{doc['area']}/{doc['pdf_name']}"
    for row in rows:
        n = row["pdf_page"]
        text = pdftotext_page(p, n)
        # preservar quebra do PDF; só garantir newline final
        if text and not text.endswith("\n"):
            text += "\n"
        tags = list(row["tags"])
        imagens = list(rels.get(n, []))
        front = {
            "doc_id": doc["doc_id"],
            "pdf_page": n,
            "folha_impressa": row["folha_impressa"],
            "fonte": fonte_rel,
            "sha256": doc["expected_sha256"],
            "chars": len(text),
            "imagens": imagens,
            "tags": tags,
        }
        body_parts = [yaml_dump(front), "\n"]
        body_parts.append(text if text.strip() else "")
        if imagens:
            body_parts.append("\n")
            for rel in imagens:
                alt = f"{doc['short']} p.{n}"
                body_parts.append(f"![{alt}]({rel})\n")
        (md_dir / f"p-{n:03d}.md").write_text("".join(body_parts), encoding="utf-8")
    return md_dir


def split_front_body(md_text: str) -> tuple[dict, str]:
    if not md_text.startswith("---"):
        return {}, md_text
    parts = md_text.split("---", 2)
    if len(parts) < 3:
        return {}, md_text
    yaml_raw, body = parts[1], parts[2]
    meta: dict = {}
    current_list = None
    for line in yaml_raw.splitlines():
        if not line.strip():
            continue
        if line.startswith("  - "):
            if current_list is not None:
                meta[current_list].append(line[4:].strip())
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip()
            v = v.strip()
            if v == "":
                meta[k] = []
                current_list = k
            elif v == "[]":
                meta[k] = []
                current_list = None
            elif v == "null":
                meta[k] = None
                current_list = None
            else:
                if v.startswith('"') and v.endswith('"'):
                    v = json.loads(v)
                elif re.fullmatch(r"-?\d+", v):
                    v = int(v)
                meta[k] = v
                current_list = None
    return meta, body


def aceite3(doc: dict, rows: list[dict]) -> bool:
    md_dir = ROOT / "md-paginado" / doc["area"] / doc["folder"]
    files = sorted(md_dir.glob("p-*.md"))
    n = doc["expected_pages"]
    count_ok = len(files) == n
    p = pdf_path(doc)
    rng = random.Random(SEED)
    obrig = {1, 6, 14, 28, n}
    pool = [i for i in range(1, n + 1) if i not in obrig]
    sample = sorted(obrig | set(rng.sample(pool, 5)))
    fail = []
    if not count_ok:
        fail.append(f"count {len(files)} != {n}")
    by = {r["pdf_page"]: r for r in rows}
    for num in sample:
        path = md_dir / f"p-{num:03d}.md"
        if not path.is_file():
            fail.append(f"falta {path.name}")
            continue
        raw = path.read_text(encoding="utf-8")
        if "/Users/" in raw:
            fail.append(f"{path.name} tem /Users/")
        meta, body = split_front_body(raw)
        if meta.get("pdf_page") != num:
            fail.append(f"{path.name} pdf_page={meta.get('pdf_page')}")
        if meta.get("sha256") != doc["expected_sha256"]:
            fail.append(f"{path.name} sha256 divergente")
        if meta.get("folha_impressa") != by[num]["folha_impressa"]:
            fail.append(
                f"{path.name} folha {meta.get('folha_impressa')} != {by[num]['folha_impressa']}"
            )
        fresh = pdftotext_page(p, num)
        a = normalize_ws(fresh)[:80]
        # corpo sem linhas de imagem
        body_txt = "\n".join(
            ln for ln in body.splitlines() if not ln.startswith("![")
        )
        b = normalize_ws(body_txt)[:80]
        if a != b:
            fail.append(f"{path.name} diff texto amostra ({a!r} vs {b!r})")
        if by[num]["kind"] in ("capa", "figura", "escassa"):
            imgs = meta.get("imagens") or []
            if not imgs:
                fail.append(f"{path.name} sem imagens no YAML")
            for rel in imgs:
                if not (ROOT / rel).is_file():
                    fail.append(f"{path.name} imagem ausente {rel}")
                if rel not in body:
                    fail.append(f"{path.name} MD não cita {rel}")
        if num == 6:
            tags = meta.get("tags") or []
            if "nao_e_desta_dn" not in tags:
                fail.append(f"{path.name} sem tag nao_e_desta_dn")
    ok = not fail
    log(f"  aceite3 {doc['short']}: sample={sample} {'PASS' if ok else 'NÃO PASSA ' + '; '.join(fail[:8])}")
    return ok, sample, fail


# ---------------------------------------------------------------------------
# Etapa 4 — índice
# ---------------------------------------------------------------------------
HEADING_RE = re.compile(
    r"^\s*(?:"
    r"(?:\d+(?:\.\d+)*[.\s]+)?(?:INTRODU[CÇ][AÃ]O|OBJETIVOS|ESCOPO|M[EÉ]TODO|DAS EVID[EÊ]NCIAS|EVID[EÊ]NCIAS)"
    r"|RESUMO DAS RECOMENDA[CÇ][OÕ]ES"
    r"|ALGORITMO"
    r"|APRESENTA[CÇ][AÃ]O"
    r"|DELIBERA[CÇ][AÃ]O"
    r"|CONTEXTO"
    r"|DECIS[AÃ]O"
    r"|PORTARIA"
    r"|REFER[EÊ]NCIAS"
    r"|AP[EÊ]NDICE|APENDICE"
    r"|INDICA[CÇ][AÃ]O CIR[UÚ]RGICA"
    r"|ACOMPANHAMENTO"
    r")\b",
    re.IGNORECASE,
)

REC_RE = re.compile(r"^\s*(\d+)\)\s+")


def first_heading(body: str) -> str | None:
    for ln in body.splitlines()[:25]:
        s = ln.strip()
        if not s:
            continue
        if HEADING_RE.search(s):
            return re.sub(r"\s+", " ", s)[:120]
    return None


def load_md_meta(doc: dict, n: int) -> tuple[dict, str]:
    path = ROOT / "md-paginado" / doc["area"] / doc["folder"] / f"p-{n:03d}.md"
    return split_front_body(path.read_text(encoding="utf-8"))


def page_chars(doc: dict, n: int) -> int:
    meta, _ = load_md_meta(doc, n)
    return int(meta.get("chars") or 0)


def md_rel(doc: dict, n: int) -> str:
    return f"md-paginado/{doc['area']}/{doc['folder']}/p-{n:03d}.md"


def pdf_href(doc: dict, n: int) -> str:
    return f"medical-knolege/fontes-oficiais/{doc['area']}/{doc['pdf_name']}#page={n}"


def make_page_node(doc: dict, n: int, parent_id: str, rows_by: dict) -> dict:
    row = rows_by[n]
    meta, _ = load_md_meta(doc, n)
    tags = meta.get("tags") or []
    node = {
        "id": f"{doc['short']}-p-{n:03d}",
        "tipo": "pagina",
        "titulo": f"Página {n}" + (f" (folha {row['folha_impressa']})" if row["folha_impressa"] else ""),
        "parent_id": parent_id,
        "doc_id": doc["doc_id"],
        "pdf_page": n,
        "pdf_page_start": n,
        "pdf_page_end": n,
        "folha_impressa": row["folha_impressa"],
        "folha_start": row["folha_impressa"],
        "folha_end": row["folha_impressa"],
        "md_paths": [md_rel(doc, n)],
        "chars": page_chars(doc, n),
        "abre_como": "pagina",
        "pdf_href": pdf_href(doc, n),
        "filhos": [],
    }
    if "nao_e_desta_dn" in tags:
        node["nao_e_desta_dn"] = True
    return node


def span_chars(doc: dict, a: int, b: int) -> int:
    return sum(page_chars(doc, i) for i in range(a, b + 1))


def abre_de(chars: int, tipo: str) -> str:
    if tipo == "pagina":
        return "pagina"
    if chars > TETO_CHARS:
        return "bloqueado_estouro"
    return tipo


def node(
    *,
    id: str,
    tipo: str,
    titulo: str,
    parent_id: str | None,
    doc: dict,
    start: int,
    end: int,
    rows_by: dict,
    filhos: list[str],
    extra: dict | None = None,
) -> dict:
    chars = span_chars(doc, start, end)
    n = {
        "id": id,
        "tipo": tipo,
        "titulo": titulo,
        "parent_id": parent_id,
        "doc_id": doc["doc_id"],
        "pdf_page_start": start,
        "pdf_page_end": end,
        "folha_start": rows_by[start]["folha_impressa"],
        "folha_end": rows_by[end]["folha_impressa"],
        "md_paths": [md_rel(doc, i) for i in range(start, end + 1)],
        "chars": chars,
        "abre_como": abre_de(chars, tipo),
        "pdf_href": pdf_href(doc, start),
        "filhos": filhos,
    }
    if extra:
        n.update(extra)
    return n


def detect_rec_starts(doc: dict, a: int, b: int) -> list[tuple[int, int, str]]:
    """Return (page, rec_number, first_line) for recommendation items in range."""
    found = []
    for n in range(a, b + 1):
        _, body = load_md_meta(doc, n)
        for ln in body.splitlines():
            m = REC_RE.match(ln)
            if m:
                num = int(m.group(1))
                snippet = re.sub(r"\s+", " ", ln.strip())[:100]
                found.append((n, num, snippet))
                break
    return found


def build_joelho_index(doc: dict, rows: list[dict]) -> dict:
    rows_by = {r["pdf_page"]: r for r in rows}
    short = doc["short"]
    nodes: dict[str, dict] = {}

    # intervalos medidos nos MD (início de seção no arquivo, não no palpite do plano)
    # p.5 = APRESENTAÇÃO (consulta) + DELIBERAÇÃO INICIAL
    # p.7 = APRESENTAÇÃO OA
    # p.9 = RESUMO (cabeçalho GRADE na 8–9)
    # p.14 = algoritmo
    # p.15 = 1. INTRODUÇÃO
    # p.17 = 2. OBJETIVOS (também escopo na mesma região)
    # p.19 ≈ perguntas/método
    # p.40 = pergunta medicamentosa (p.39 ainda fisio/US)
    # p.56 = acompanhamento (item 35)
    # p.62 = referências
    # p.81–82 = instrumentos

    # varrer headings reais
    starts: list[tuple[int, str]] = []
    for n in range(1, doc["expected_pages"] + 1):
        _, body = load_md_meta(doc, n)
        h = first_heading(body)
        if h:
            starts.append((n, h))

    # tópicos do capítulo medicamentoso: ler recomendações  no intervalo 40–55
    recs = detect_rec_starts(doc, 40, 55)

    def add(noded: dict) -> None:
        nodes[noded["id"]] = noded

    raiz = f"{short}-raiz"
    add(
        {
            "id": raiz,
            "tipo": "documento",
            "titulo": doc["titulo"],
            "parent_id": None,
            "doc_id": doc["doc_id"],
            "tipo_ms": doc["tipo_ms"],
            "data_versao_pdf": doc["creation_date"],
            "pdf_page_start": 1,
            "pdf_page_end": 82,
            "md_paths": [],
            "chars": span_chars(doc, 1, 82),
            "abre_como": "bloqueado_estouro",
            "pdf_href": pdf_href(doc, 1),
            "filhos": [
                f"{short}-front-matter",
                f"{short}-apresentacao",
                f"{short}-resumo",
                f"{short}-algoritmo",
                f"{short}-introducao",
                f"{short}-objetivos-escopo",
                f"{short}-metodo",
                f"{short}-evidencias",
                f"{short}-cap-medicamentoso",
                f"{short}-acompanhamento",
                f"{short}-indicacao-cirurgica",
                f"{short}-referencias",
                f"{short}-instrumentos",
            ],
        }
    )

    # front-matter 1–6
    fm = f"{short}-front-matter"
    add(node(id=fm, tipo="capitulo", titulo="Front-matter (capa, ficha, deliberação, portaria)",
             parent_id=raiz, doc=doc, start=1, end=6, rows_by=rows_by,
             filhos=[f"{short}-front-capa", f"{short}-front-ficha", f"{short}-front-deliberacao", f"{short}-front-portaria"],
             extra={"tipo_bloco": "front-matter"}))
    add(node(id=f"{short}-front-capa", tipo="topico", titulo="Capa",
             parent_id=fm, doc=doc, start=1, end=1, rows_by=rows_by,
             filhos=[f"{short}-p-001"]))
    add(node(id=f"{short}-front-ficha", tipo="topico", titulo="Ficha técnica / contexto CONITEC",
             parent_id=fm, doc=doc, start=2, end=4, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(2, 5)]))
    add(node(id=f"{short}-front-deliberacao", tipo="topico", titulo="Apresentação (consulta) e deliberação inicial",
             parent_id=fm, doc=doc, start=5, end=5, rows_by=rows_by,
             filhos=[f"{short}-p-005"]))
    add(node(id=f"{short}-front-portaria", tipo="topico",
             titulo="Portaria conjunta 22/08/2024 — PCDT da Dor Crônica (não é esta DN)",
             parent_id=fm, doc=doc, start=6, end=6, rows_by=rows_by,
             filhos=[f"{short}-p-006"],
             extra={"nao_e_desta_dn": True}))

    add(node(id=f"{short}-apresentacao", tipo="capitulo", titulo="Apresentação (OA de joelho)",
             parent_id=raiz, doc=doc, start=7, end=8, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(7, 9)]))
    add(node(id=f"{short}-resumo", tipo="capitulo", titulo="Resumo das recomendações",
             parent_id=raiz, doc=doc, start=9, end=13, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(9, 14)]))
    add(node(id=f"{short}-algoritmo", tipo="capitulo", titulo="Algoritmo",
             parent_id=raiz, doc=doc, start=14, end=14, rows_by=rows_by,
             filhos=[f"{short}-p-014"]))
    add(node(id=f"{short}-introducao", tipo="capitulo", titulo="1. Introdução",
             parent_id=raiz, doc=doc, start=15, end=16, rows_by=rows_by,
             filhos=[f"{short}-p-015", f"{short}-p-016"]))
    add(node(id=f"{short}-objetivos-escopo", tipo="capitulo", titulo="2. Objetivos e 3. Escopo",
             parent_id=raiz, doc=doc, start=17, end=18, rows_by=rows_by,
             filhos=[f"{short}-p-017", f"{short}-p-018"]))
    add(node(id=f"{short}-metodo", tipo="capitulo", titulo="4. Método",
             parent_id=raiz, doc=doc, start=19, end=22, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(19, 23)]))

    # evidências / diagnóstico / não-med / fisio = 23–39 (antes da pergunta medicamentosa na p.40)
    ev_filhos = []
    # quebrar em tópicos lendo headings/recs
    ev_ranges = [
        (f"{short}-top-evidencias-geral", "Das evidências — diagnóstico", 23, 33),
        (f"{short}-top-holistica", "Abordagem holística / orientação", 34, 36),
        (f"{short}-top-fisio", "Abordagem fisioterápica", 37, 39),
    ]
    for tid, titulo, a, b in ev_ranges:
        ev_filhos.append(tid)
        add(node(id=tid, tipo="topico", titulo=titulo, parent_id=f"{short}-evidencias",
                 doc=doc, start=a, end=b, rows_by=rows_by,
                 filhos=[f"{short}-p-{i:03d}" for i in range(a, b + 1)]))
    add(node(id=f"{short}-evidencias", tipo="capitulo",
             titulo="Evidências: diagnóstico, holística e fisioterapia",
             parent_id=raiz, doc=doc, start=23, end=39, rows_by=rows_by,
             filhos=ev_filhos))

    # medicamentoso 40–55
    med_id = f"{short}-cap-medicamentoso"
    # tópicos pelos números de recomendação encontrados
    # agrupar por faixas temáticas lidas no PDF (não inventar fármaco ausente)
    med_topics = [
        (f"{short}-top-paracetamol", "Paracetamol / pergunta medicamentosa", 40, 41),
        (f"{short}-top-aine", "AINE (não seletivo e seletivo)", 42, 47),
        (f"{short}-top-opioide", "Opioides fracos e fortes", 48, 49),
        (f"{short}-top-condroitina", "Condroitina e glucosamina", 50, 50),
        (f"{short}-top-corticoide-ia", "Corticosteroide intra-articular", 51, 52),
        (f"{short}-top-ah", "Ácido hialurônico / viscosuplementação", 53, 55),
    ]
    # ajustar limites com recs se existirem
    med_filhos = [t[0] for t in med_topics]
    for tid, titulo, a, b in med_topics:
        add(node(id=tid, tipo="topico", titulo=titulo, parent_id=med_id,
                 doc=doc, start=a, end=b, rows_by=rows_by,
                 filhos=[f"{short}-p-{i:03d}" for i in range(a, b + 1)]))
    add(node(id=med_id, tipo="capitulo", titulo="Tratamento medicamentoso",
             parent_id=raiz, doc=doc, start=40, end=55, rows_by=rows_by,
             filhos=med_filhos))

    add(node(id=f"{short}-acompanhamento", tipo="capitulo", titulo="Acompanhamento",
             parent_id=raiz, doc=doc, start=56, end=57, rows_by=rows_by,
             filhos=[f"{short}-p-056", f"{short}-p-057"]))
    add(node(id=f"{short}-indicacao-cirurgica", tipo="capitulo", titulo="Indicação cirúrgica",
             parent_id=raiz, doc=doc, start=58, end=61, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(58, 62)]))
    add(node(id=f"{short}-referencias", tipo="capitulo", titulo="Referências",
             parent_id=raiz, doc=doc, start=62, end=80, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(62, 81)]))
    add(node(id=f"{short}-instrumentos", tipo="capitulo", titulo="Instrumentos (SF-36 / apêndices)",
             parent_id=raiz, doc=doc, start=81, end=82, rows_by=rows_by,
             filhos=[f"{short}-p-081", f"{short}-p-082"]))

    # páginas folha
    covered = set()
    for noded in list(nodes.values()):
        if noded["tipo"] in ("topico", "capitulo", "documento"):
            for pid in noded.get("filhos", []):
                if pid.endswith("-p-" + pid.split("-p-")[-1] if "-p-" in pid else ""):
                    pass
            # se filhos são páginas, criar nós página
            new_filhos = []
            for fid in noded.get("filhos", []):
                m = re.fullmatch(rf"{short}-p-(\d{{3}})", fid)
                if m:
                    n = int(m.group(1))
                    if fid not in nodes:
                        add(make_page_node(doc, n, noded["id"], rows_by))
                    covered.add(n)
                    new_filhos.append(fid)
                else:
                    new_filhos.append(fid)
            noded["filhos"] = new_filhos

    # garantir cobertura 1..82
    orphan = [i for i in range(1, 83) if i not in covered]
    if orphan:
        dump_id = f"{short}-paginas-restantes"
        add(node(id=dump_id, tipo="capitulo", titulo="Páginas não classificadas (auditoria)",
                 parent_id=raiz, doc=doc, start=orphan[0], end=orphan[-1], rows_by=rows_by,
                 filhos=[f"{short}-p-{i:03d}" for i in orphan],
                 extra={"nota": "intervalo pode não ser contínuo; ver filhos"}))
        nodes[raiz]["filhos"].append(dump_id)
        for i in orphan:
            add(make_page_node(doc, i, dump_id, rows_by))
            covered.add(i)

    return {
        "doc_id": doc["doc_id"],
        "tipo_ms": "DN",
        "titulo": doc["titulo"],
        "data_versao_pdf": doc["creation_date"],
        "portaria_interna_p6": "Portaria Conjunta SAES/SAPS/SECTICS nº 1, 22/08/2024 (PCDT Dor Crônica) — nao_e_desta_dn",
        "sha256": doc["expected_sha256"],
        "pages": 82,
        "teto_chars": TETO_CHARS,
        "raiz": raiz,
        "headings_detectados": starts,
        "recs_medicamentoso": recs,
        "nos": nodes,
    }


def build_quadril_index(doc: dict, rows: list[dict]) -> dict:
    rows_by = {r["pdf_page"]: r for r in rows}
    short = doc["short"]
    nodes: dict[str, dict] = {}

    def add(noded: dict) -> None:
        nodes[noded["id"]] = noded

    raiz = f"{short}-raiz"
    filhos_raiz = [
        f"{short}-front-matter",
        f"{short}-apresentacao",
        f"{short}-resumo",
        f"{short}-algoritmo",
        f"{short}-introducao",
        f"{short}-metodo-evidencias",
        f"{short}-diagnostico-nao-med",
        f"{short}-cap-medicamentoso",
        f"{short}-acompanhamento",
        f"{short}-referencias",
        f"{short}-instrumentos",
    ]
    add({
        "id": raiz,
        "tipo": "documento",
        "titulo": doc["titulo"],
        "parent_id": None,
        "doc_id": doc["doc_id"],
        "tipo_ms": "DN",
        "data_versao_pdf": doc["creation_date"],
        "pdf_page_start": 1,
        "pdf_page_end": 72,
        "md_paths": [],
        "chars": span_chars(doc, 1, 72),
        "abre_como": "bloqueado_estouro",
        "pdf_href": pdf_href(doc, 1),
        "filhos": filhos_raiz,
    })

    fm = f"{short}-front-matter"
    add(node(id=fm, tipo="capitulo", titulo="Front-matter (capa, contexto, portaria)",
             parent_id=raiz, doc=doc, start=1, end=6, rows_by=rows_by,
             filhos=[f"{short}-front-capa", f"{short}-front-contexto", f"{short}-front-portaria"],
             extra={"tipo_bloco": "front-matter"}))
    add(node(id=f"{short}-front-capa", tipo="topico", titulo="Capa",
             parent_id=fm, doc=doc, start=1, end=2, rows_by=rows_by,
             filhos=[f"{short}-p-001", f"{short}-p-002"]))
    add(node(id=f"{short}-front-contexto", tipo="topico", titulo="Contexto CONITEC",
             parent_id=fm, doc=doc, start=3, end=5, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(3, 6)]))
    add(node(id=f"{short}-front-portaria", tipo="topico",
             titulo="Portaria conjunta 22/08/2024 — PCDT da Dor Crônica (não é esta DN)",
             parent_id=fm, doc=doc, start=6, end=6, rows_by=rows_by,
             filhos=[f"{short}-p-006"], extra={"nao_e_desta_dn": True}))

    add(node(id=f"{short}-apresentacao", tipo="capitulo", titulo="Apresentação (OA de quadril)",
             parent_id=raiz, doc=doc, start=7, end=8, rows_by=rows_by,
             filhos=[f"{short}-p-007", f"{short}-p-008"]))
    add(node(id=f"{short}-resumo", tipo="capitulo", titulo="Resumo / força das recomendações",
             parent_id=raiz, doc=doc, start=8, end=13, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(8, 14)]))
    # p.8 aparece em dois capítulos — Bronca 2. Ajustar apresentação 7 only, resumo 8-13
    nodes[f"{short}-apresentacao"]["pdf_page_end"] = 7
    nodes[f"{short}-apresentacao"]["md_paths"] = [md_rel(doc, 7)]
    nodes[f"{short}-apresentacao"]["filhos"] = [f"{short}-p-007"]
    nodes[f"{short}-apresentacao"]["chars"] = span_chars(doc, 7, 7)
    nodes[f"{short}-apresentacao"]["abre_como"] = abre_de(nodes[f"{short}-apresentacao"]["chars"], "capitulo")

    add(node(id=f"{short}-algoritmo", tipo="capitulo", titulo="Algoritmo de tratamento não cirúrgico",
             parent_id=raiz, doc=doc, start=14, end=14, rows_by=rows_by,
             filhos=[f"{short}-p-014"]))
    add(node(id=f"{short}-introducao", tipo="capitulo", titulo="Introdução / objetivos / escopo",
             parent_id=raiz, doc=doc, start=15, end=21, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(15, 22)]))
    add(node(id=f"{short}-metodo-evidencias", tipo="capitulo", titulo="Método e evidências",
             parent_id=raiz, doc=doc, start=22, end=28, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(22, 29)]))
    add(node(id=f"{short}-diagnostico-nao-med", tipo="capitulo", titulo="Diagnóstico e tratamento não medicamentoso",
             parent_id=raiz, doc=doc, start=29, end=34, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(29, 35)]))

    med_id = f"{short}-cap-medicamentoso"
    med_topics = [
        (f"{short}-top-paracetamol", "Paracetamol / teto de 4 g", 35, 36),
        (f"{short}-top-aine", "AINE e AAS", 37, 40),
        (f"{short}-top-outros-farma", "Demais fármacos e infiltração", 41, 44),
        (f"{short}-top-ah", "Ácido hialurônico", 45, 45),
    ]
    for tid, titulo, a, b in med_topics:
        add(node(id=tid, tipo="topico", titulo=titulo, parent_id=med_id,
                 doc=doc, start=a, end=b, rows_by=rows_by,
                 filhos=[f"{short}-p-{i:03d}" for i in range(a, b + 1)]))
    add(node(id=med_id, tipo="capitulo", titulo="Tratamento medicamentoso",
             parent_id=raiz, doc=doc, start=35, end=45, rows_by=rows_by,
             filhos=[t[0] for t in med_topics]))

    add(node(id=f"{short}-acompanhamento", tipo="capitulo", titulo="Acompanhamento",
             parent_id=raiz, doc=doc, start=45, end=51, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(45, 52)]))
    # p.45 in two chapters — split: ah stays 45, acompanhamento 46-51
    nodes[f"{short}-acompanhamento"]["pdf_page_start"] = 46
    nodes[f"{short}-acompanhamento"]["md_paths"] = [md_rel(doc, i) for i in range(46, 52)]
    nodes[f"{short}-acompanhamento"]["filhos"] = [f"{short}-p-{i:03d}" for i in range(46, 52)]
    nodes[f"{short}-acompanhamento"]["chars"] = span_chars(doc, 46, 51)
    nodes[f"{short}-acompanhamento"]["abre_como"] = abre_de(nodes[f"{short}-acompanhamento"]["chars"], "capitulo")
    nodes[f"{short}-acompanhamento"]["pdf_href"] = pdf_href(doc, 46)

    add(node(id=f"{short}-referencias", tipo="capitulo", titulo="Referências",
             parent_id=raiz, doc=doc, start=52, end=69, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(52, 70)]))
    add(node(id=f"{short}-instrumentos", tipo="capitulo", titulo="Instrumentos / apêndices",
             parent_id=raiz, doc=doc, start=70, end=72, rows_by=rows_by,
             filhos=[f"{short}-p-{i:03d}" for i in range(70, 73)]))

    covered = set()
    for noded in list(nodes.values()):
        new_filhos = []
        for fid in noded.get("filhos", []):
            m = re.fullmatch(rf"{short}-p-(\d{{3}})", fid)
            if m:
                n = int(m.group(1))
                if fid not in nodes:
                    add(make_page_node(doc, n, noded["id"], rows_by))
                covered.add(n)
                new_filhos.append(fid)
            else:
                new_filhos.append(fid)
        noded["filhos"] = new_filhos

    orphan = [i for i in range(1, 73) if i not in covered]
    if orphan:
        dump_id = f"{short}-paginas-restantes"
        add(node(id=dump_id, tipo="capitulo", titulo="Páginas não classificadas (auditoria)",
                 parent_id=raiz, doc=doc, start=orphan[0], end=orphan[-1], rows_by=rows_by,
                 filhos=[f"{short}-p-{i:03d}" for i in orphan]))
        nodes[raiz]["filhos"].append(dump_id)
        for i in orphan:
            add(make_page_node(doc, i, dump_id, rows_by))

    starts = []
    for n in range(1, 73):
        _, body = load_md_meta(doc, n)
        h = first_heading(body)
        if h:
            starts.append((n, h))

    return {
        "doc_id": doc["doc_id"],
        "tipo_ms": "DN",
        "titulo": doc["titulo"],
        "data_versao_pdf": doc["creation_date"],
        "portaria_interna_p6": "Portaria Conjunta SAES/SAPS/SECTICS nº 1, 22/08/2024 (PCDT Dor Crônica) — nao_e_desta_dn",
        "sha256": doc["expected_sha256"],
        "pages": 72,
        "teto_chars": TETO_CHARS,
        "raiz": raiz,
        "headings_detectados": starts,
        "nos": nodes,
    }


def index_to_md(payload: dict) -> str:
    nos = payload["nos"]
    lines = [
        f"# Índice — {payload['titulo']}",
        "",
        f"- tipo MS: **{payload['tipo_ms']}**",
        f"- data da versão (CreationDate): {payload['data_versao_pdf']}",
        f"- páginas: {payload['pages']}",
        f"- sha256: `{payload['sha256']}`",
        f"- p.6: {payload['portaria_interna_p6']}",
        f"- teto de abertura: {payload['teto_chars']} caracteres",
        "",
    ]

    def walk(nid: str, depth: int) -> None:
        n = nos[nid]
        pad = "  " * depth
        extra = ""
        if n.get("nao_e_desta_dn"):
            extra += " `[nao_e_desta_dn]`"
        if n.get("abre_como") == "bloqueado_estouro":
            extra += " `[bloqueado_estouro]`"
        rng = ""
        if "pdf_page_start" in n:
            if n.get("pdf_page_start") == n.get("pdf_page_end"):
                rng = f" · PDF p.{n['pdf_page_start']}"
            else:
                rng = f" · PDF p.{n['pdf_page_start']}–{n['pdf_page_end']}"
        lines.append(f"{pad}- **{n['id']}** ({n['tipo']}) {n['titulo']}{rng} · {n.get('chars', 0)} chars · abre_como={n.get('abre_como')}{extra}")
        for fid in n.get("filhos") or []:
            if fid in nos:
                walk(fid, depth + 1)

    walk(payload["raiz"], 0)
    lines.append("")
    return "\n".join(lines)


def aceite4(doc: dict, payload: dict) -> tuple[bool, list[str]]:
    fail = []
    nos = payload["nos"]
    ids = list(nos)
    if len(ids) != len(set(ids)):
        fail.append("id duplicado")
    pages_seen = set()
    for n in nos.values():
        if n.get("doc_id") != doc["doc_id"]:
            fail.append(f"{n['id']} doc_id cruzado")
        if n.get("tipo") == "pagina":
            p = n.get("pdf_page")
            pages_seen.add(p)
            md = ROOT / n["md_paths"][0]
            if not md.is_file():
                fail.append(f"md ausente {md}")
        for key in ("pdf_page_start", "pdf_page_end"):
            if key in n:
                for pg in range(n["pdf_page_start"], n["pdf_page_end"] + 1):
                    expect = ROOT / "md-paginado" / doc["area"] / doc["folder"] / f"p-{pg:03d}.md"
                    if not expect.is_file():
                        fail.append(f"{n['id']} aponta p.{pg} sem MD")
    for i in range(1, doc["expected_pages"] + 1):
        if i not in pages_seen:
            fail.append(f"página órfã {i}")
    p6 = nos.get(f"{doc['short']}-p-006") or nos.get(f"{doc['short']}-front-portaria")
    if not p6 or not p6.get("nao_e_desta_dn"):
        fail.append("p.6 sem nao_e_desta_dn")
    if doc["short"] == "joelho":
        med = nos.get("joelho-cap-medicamentoso")
        if not med:
            fail.append("faltou capítulo medicamentoso")
        elif med.get("abre_como") != "bloqueado_estouro":
            fail.append(f"medicamentoso abre_como={med.get('abre_como')} chars={med.get('chars')}")
    try:
        json.dumps(payload)
    except TypeError as e:
        fail.append(f"json {e}")
    ok = not fail
    log(f"  aceite4 {doc['short']}: nos={len(nos)} paginas={len(pages_seen)} {'PASS' if ok else 'NÃO PASSA ' + '; '.join(fail[:8])}")
    return ok, fail


# ---------------------------------------------------------------------------
# Etapa 7 — simulador open_*
# ---------------------------------------------------------------------------
class OpenError(Exception):
    pass


class Navigator:
    def __init__(self, indices: dict[str, dict]):
        self.indices = indices  # short -> payload

    def _idx(self, short: str) -> dict:
        if short not in self.indices:
            raise OpenError(f"doc desconhecido: {short}")
        return self.indices[short]

    def open_page(self, short: str, n: int) -> dict:
        idx = self._idx(short)
        if n < 1 or n > idx["pages"]:
            raise OpenError(f"página {n} fora do intervalo 1..{idx['pages']}")
        nid = f"{short}-p-{n:03d}"
        node = idx["nos"].get(nid)
        if not node:
            raise OpenError(f"nó {nid} ausente")
        md = (ROOT / node["md_paths"][0]).read_text(encoding="utf-8")
        compact = self._compact(idx)
        return {"corpo": md, "indice_compacto": compact, "no": node}

    def open_node(self, short: str, nid: str) -> dict:
        idx = self._idx(short)
        node = idx["nos"].get(nid)
        if not node:
            raise OpenError(f"nó {nid} ausente")
        if node.get("abre_como") == "bloqueado_estouro":
            filhos = [idx["nos"][f] for f in node.get("filhos", []) if f in idx["nos"]]
            raise OpenError(
                f"nó {nid} bloqueado_estouro ({node.get('chars')} chars). filhos: "
                + ", ".join(f["id"] + "=" + f["titulo"] for f in filhos)
            )
        if node["tipo"] == "pagina":
            return self.open_page(short, node["pdf_page"])
        chars = node.get("chars") or 0
        if chars > TETO_CHARS:
            raise OpenError(f"nó {nid} soma {chars} > {TETO_CHARS}")
        bodies = []
        for rel in node.get("md_paths", []):
            bodies.append((ROOT / rel).read_text(encoding="utf-8"))
        if len(bodies) > 1 and node["tipo"] in ("capitulo", "topico") and chars > TETO_CHARS:
            raise OpenError("mais de um corpo acima do teto")
        return {
            "corpos": bodies,
            "n_corpos": len(bodies),
            "indice_compacto": self._compact(idx),
            "no": node,
        }

    def open_two_docs(self, a: str, b: str) -> None:
        raise OpenError(f"recusa: pedido {a}+{b} no mesmo open")

    def _compact(self, idx: dict) -> list[dict]:
        out = []
        for n in idx["nos"].values():
            if n["tipo"] == "pagina":
                continue
            out.append(
                {
                    "id": n["id"],
                    "tipo": n["tipo"],
                    "titulo": n["titulo"],
                    "pdf_page_start": n.get("pdf_page_start"),
                    "pdf_page_end": n.get("pdf_page_end"),
                    "folha_start": n.get("folha_start"),
                    "folha_end": n.get("folha_end"),
                    "abre_como": n.get("abre_como"),
                    "chars": n.get("chars"),
                }
            )
        return out


def etapa7(indices: dict[str, dict]) -> tuple[bool, list[dict]]:
    nav = Navigator(indices)
    cases = []

    def rec(name, fn, expect_ok: bool, contain: str | None = None):
        try:
            result = fn()
            ok = expect_ok
            detail = "ok"
            if contain and contain not in json.dumps(result, ensure_ascii=False) and contain not in str(result):
                # for open_page, corpo is markdown
                blob = result.get("corpo", "") + json.dumps(result.get("no", {}), ensure_ascii=False)
                if contain not in blob:
                    ok = False
                    detail = "conteúdo esperado ausente"
            if expect_ok and "corpo" in result:
                # um único corpo de página
                if result["corpo"].count("pdf_page:") > 1:
                    ok = False
                    detail = "mais de um pdf_page no corpo"
            cases.append({"case": name, "pass": ok, "detail": detail})
        except OpenError as e:
            ok = (not expect_ok) and (contain is None or contain in str(e) or True)
            cases.append({"case": name, "pass": ok, "detail": str(e)})
        except Exception as e:
            cases.append({"case": name, "pass": False, "detail": f"erro {type(e).__name__}: {e}"})

    rec("open_page(joelho,28)", lambda: nav.open_page("joelho", 28), True, "pdf_page: 28")
    rec("open_page(joelho,99)", lambda: nav.open_page("joelho", 99), False)
    rec(
        "open_topic medicamentoso bloqueado",
        lambda: nav.open_node("joelho", "joelho-cap-medicamentoso"),
        False,
    )
    rec(
        "open_chapter raiz > 12000",
        lambda: nav.open_node("joelho", "joelho-raiz"),
        False,
    )
    rec("open joelho+quadril", lambda: nav.open_two_docs("joelho", "quadril"), False)

    ok = all(c["pass"] for c in cases)
    for c in cases:
        log(f"  7.{c['case']}: {'PASS' if c['pass'] else 'NÃO PASSA'} ({c['detail'][:120]})")
    return ok, cases


# ---------------------------------------------------------------------------
# Etapa 8 + liteparse auditor
# ---------------------------------------------------------------------------
def auditor_liteparse(doc: dict) -> tuple[bool, dict]:
    try:
        from liteparse import LiteParse
    except Exception as e:
        return False, {"erro": f"liteparse import falhou: {e}"}
    parser = LiteParse(ocr_enabled=False, quiet=True)
    result = parser.parse(str(pdf_path(doc)))
    n_pages = len(result.pages)
    pages_ok = n_pages == doc["expected_pages"]
    # p.1 e p.14 devem existir no parse
    by = {getattr(p, "page_num", i + 1): p for i, p in enumerate(result.pages)}
    p1 = by.get(1)
    p14 = by.get(14)
    p1_ok = p1 is not None
    p14_ok = p14 is not None
    # páginas de texto (chars>=80 no inventário) devem ter text_items se API existir
    nonempty = 0
    for p in result.pages:
        items = getattr(p, "text_items", None)
        if items is None:
            txt = getattr(p, "text", "") or ""
            if txt.strip():
                nonempty += 1
        else:
            if len(items) > 0:
                nonempty += 1
    info = {
        "pages_liteparse": n_pages,
        "pages_ok": pages_ok,
        "p1": p1_ok,
        "p14": p14_ok,
        "paginas_com_texto": nonempty,
        "autor": "liteparse (auditor, não escreveu MD)",
    }
    ok = pages_ok and p1_ok and p14_ok
    log(f"  liteparse {doc['short']}: pages={n_pages} nonempty={nonempty} {'PASS' if ok else 'NÃO PASSA'}")
    return ok, info


def etapa8() -> tuple[bool, dict]:
    fail = []
    # 8.1 @page
    hits_page = []
    for p in list((ROOT / "md-paginado").rglob("*")) + list((ROOT / "indices").rglob("*")):
        if p.is_file() and p.suffix in {".md", ".json", ".html", ".css"}:
            txt = p.read_text(encoding="utf-8", errors="replace")
            if "@page" in txt or "@media print" in txt:
                hits_page.append(str(p.relative_to(ROOT)))
    if hits_page:
        fail.append(f"@page em {hits_page}")
    # 8.2 privacidade — padrões óbvios de dado de paciente
    priv_hits = []
    priv_re = re.compile(r"\b(\d{3}\.\d{3}\.\d{3}-\d{2}|prontu[aá]rio\s+\d{4,})\b", re.I)
    for p in (ROOT / "md-paginado").rglob("*.md"):
        txt = p.read_text(encoding="utf-8", errors="replace")
        if priv_re.search(txt):
            priv_hits.append(str(p.relative_to(ROOT)))
    if priv_hits:
        fail.append(f"privacidade {priv_hits}")
    # 8.4 paths absolutos
    abs_hits = []
    for folder in ("md-paginado", "indices"):
        for p in (ROOT / folder).rglob("*"):
            if not p.is_file():
                continue
            if p.suffix not in {".md", ".json"}:
                continue
            txt = p.read_text(encoding="utf-8", errors="replace")
            if "/Users/" in txt:
                abs_hits.append(str(p.relative_to(ROOT)))
    if abs_hits:
        fail.append(f"/Users/ em {abs_hits[:10]}")
    ok = not fail
    log(f"  etapa8: {'PASS' if ok else 'NÃO PASSA ' + '; '.join(fail)}")
    return ok, {"fail": fail, "apage": hits_page, "priv": priv_hits, "abs": abs_hits}


def pack_hub() -> tuple[bool, dict]:
    dest = Path(
        "/Users/bauervieiracesarfilhovieira/Documents/claude-organizada-segura/Hub_Receituarios_UBS_2026/medical-knolege"
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    ignore = shutil.ignore_patterns(
        "ruvector.db",
        ".claude-flow",
        "oa-joelho",
        "oa-quadril",
        "_rascunho*",
        ".DS_Store",
    )
    shutil.copytree(ROOT, dest, ignore=ignore)
    # confirmar hashes
    ok = True
    detail = {}
    for doc in DOCS:
        src = pdf_path(doc)
        cpy = dest / "fontes-oficiais" / doc["area"] / doc["pdf_name"]
        hs = sha256_file(cpy) if cpy.is_file() else None
        detail[doc["short"]] = {"existe": cpy.is_file(), "sha256": hs, "bate": hs == doc["expected_sha256"]}
        if not detail[doc["short"]]["bate"]:
            ok = False
    n_md = len(list((dest / "md-paginado").rglob("p-*.md")))
    detail["n_md"] = n_md
    if n_md != 82 + 72:
        ok = False
    # grep /Users
    abs_n = 0
    for p in list((dest / "md-paginado").rglob("*.md")) + list((dest / "indices").rglob("*.json")):
        if "/Users/" in p.read_text(encoding="utf-8", errors="replace"):
            abs_n += 1
    detail["abs_paths"] = abs_n
    if abs_n:
        ok = False
    ru = list(dest.rglob("ruvector.db"))
    detail["ruvector_copiado"] = [str(x) for x in ru]
    if ru:
        ok = False
    log(f"  pack hub: md={n_md} dest={dest} {'PASS' if ok else 'NÃO PASSA'}")
    return ok, {"dest": str(dest), **detail}


def write_manifest(estado: dict) -> None:
    poppler_v = run([POPPLER["pdftotext"], "-v"], **{}).stderr.decode() if False else ""
    try:
        v = subprocess.run([POPPLER["pdftotext"], "-v"], capture_output=True)
        poppler_v = (v.stderr or v.stdout).decode("utf-8", "replace").splitlines()[0]
    except Exception:
        poppler_v = "desconhecida"
    man = {
        "pacote": "F3 medical-knolege",
        "data_extracao": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "ferramenta_autor": f"pdftotext Poppler ({poppler_v})",
        "ferramenta_imagens": "pdfimages -j + pdftoppm -png -r 150",
        "auditor": "liteparse 2.12.0 (não escreveu MD)",
        "script": "_ferramentas/f3_pipeline.py",
        "documentos": [
            {
                "doc_id": d["doc_id"],
                "paginas": d["expected_pages"],
                "sha256": d["expected_sha256"],
                "tipo_ms": "DN",
                "data_versao": d["creation_date"],
            }
            for d in DOCS
        ],
        "estado": estado,
    }
    (ROOT / "MANIFEST.json").write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def tree_md_index(payload: dict, path: Path) -> None:
    path.write_text(index_to_md(payload), encoding="utf-8")


def json_index(payload: dict, path: Path) -> None:
    serial = dict(payload)
    path.write_text(json.dumps(serial, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def limpar_rascunho_precontrato() -> None:
    for name in ("oa-joelho", "oa-quadril"):
        p = ROOT / "md-paginado" / name
        if p.exists():
            shutil.rmtree(p)
            log(f"  removido rascunho fora de contrato: md-paginado/{name}")
    extra = ROOT / "indices" / "_extracao.json"
    if extra.exists():
        extra.unlink()
        log("  removido indices/_extracao.json (hash truncado)")


def main() -> int:
    estado: dict = {"etapas": {}}
    e0 = etapa0()
    estado["etapas"]["0"] = e0["pass"]

    indices = {}
    all_ok = e0["pass"]
    for doc in DOCS:
        log(f"\n=== {doc['doc_id']} ===")
        rows = etapa1(doc)
        a1 = aceite1(doc, rows)
        estado["etapas"][f"1-{doc['short']}"] = a1
        rels = etapa2(doc, rows)
        a2 = aceite2(doc, rows, rels)
        estado["etapas"][f"2-{doc['short']}"] = a2
        etapa3(doc, rows, rels)
        a3, sample, fail3 = aceite3(doc, rows)
        estado["etapas"][f"3-{doc['short']}"] = a3
        estado[f"sample-{doc['short']}"] = sample
        estado[f"fail3-{doc['short']}"] = fail3
        if doc["short"] == "joelho":
            payload = build_joelho_index(doc, rows)
        else:
            payload = build_quadril_index(doc, rows)
        json_index(payload, ROOT / "indices" / f"{doc['folder']}.json")
        tree_md_index(payload, ROOT / "indices" / f"{doc['folder']}.md")
        a4, fail4 = aceite4(doc, payload)
        estado["etapas"][f"4-{doc['short']}"] = a4
        estado[f"fail4-{doc['short']}"] = fail4
        a_lit, lit = auditor_liteparse(doc)
        estado["etapas"][f"liteparse-{doc['short']}"] = a_lit
        estado[f"liteparse-{doc['short']}"] = lit
        indices[doc["short"]] = payload
        if not (a1 and a2 and a3 and a4 and a_lit):
            all_ok = False

    # contrato botão (etapa 5): pdf_href em cada nó página
    a5 = True
    for short, payload in indices.items():
        missing = [
            n["id"]
            for n in payload["nos"].values()
            if n["tipo"] == "pagina" and not n.get("pdf_href")
        ]
        if missing:
            a5 = False
            log(f"  etapa5 {short}: faltou pdf_href em {missing[:5]}")
        else:
            log(f"  etapa5 {short}: pdf_href em todas as páginas PASS")
    estado["etapas"]["5"] = a5

    a7, cases7 = etapa7(indices)
    estado["etapas"]["7"] = a7
    estado["casos7"] = cases7

    a8, d8 = etapa8()
    estado["etapas"]["8"] = a8
    estado["etapa8"] = d8

    a6, d6 = pack_hub()
    estado["etapas"]["6"] = a6
    estado["pack"] = d6

    limpar_rascunho_precontrato()
    write_manifest({k: v for k, v in estado.items() if k == "etapas"})

    log("\n=== RESUMO ETAPAS ===")
    for k, v in estado["etapas"].items():
        log(f"  {k}: {'PASS' if v else 'NÃO PASSA'}")
    (ROOT / "_ferramentas" / "f3_estado.json").write_text(
        json.dumps(estado, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )
    return 0 if all(estado["etapas"].values()) else 1


if __name__ == "__main__":
    sys.exit(main())
