#!/usr/bin/env python3
"""Publica somente arquivos estáticos do produto e identifica a edição pelo Git."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parents[1]
PAGINAS = {
    'index.html', 'index-f2.html', 'atendimento.html', 'pacientes.html',
    'documentos-preenchiveis.html', 'documentos-preenchiveis2.html',
    'receituario-controle-especial.html', 'receituario-simples-sus.html',
    'view-atendimento.html', 'view-pacientes.html',
}
PASTAS = {'js', 'fonts', 'icones-hub', 'esquemas-img', 'medical-knolege', 'Mais conhecimento', 'f1'}
EXTENSOES = {'.html', '.js', '.css', '.png', '.svg', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.pdf'}


def publicar(caminho):
    """Lista permitida exclui banco, provas, backups e arquivos ocultos."""
    if caminho.name == 'sw.js':
        return False  # O worker gerado incorpora o hash final; nunca participa do próprio manifesto.
    partes = caminho.parts
    if any(p.startswith('.') or p.lower() in {'tests', 'testes', 'provas', 'backups'} for p in partes):
        return False
    if len(partes) == 1:
        return caminho.name in PAGINAS or caminho.name in {
            'icone-app.png', 'icone.svg', 'logo-orq.png', 'logo-orq-64.png',
            'manifest.webmanifest', 'robots.txt',
        } or (caminho.suffix in {'.js', '.css'} and not caminho.name.startswith('previa'))
    return partes[0] in PASTAS and caminho.suffix.lower() in EXTENSOES


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--version', default=None)
    args = parser.parse_args()
    versao = args.version or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=RAIZ, text=True).strip()
    if not re.fullmatch(r'[a-zA-Z0-9._-]{7,80}', versao):
        raise SystemExit('Identificador de versão inválido.')
    destino = args.output.resolve()
    if destino == RAIZ or RAIZ in destino.parents and destino.name != '_site':
        raise SystemExit('Use uma pasta externa vazia ou _site para a publicação.')
    if destino.exists() and any(destino.iterdir()):
        raise SystemExit('A pasta de publicação deve estar vazia; nada será sobrescrito.')
    destino.mkdir(parents=True, exist_ok=True)
    rastreados = subprocess.check_output(['git', 'ls-files', '-z'], cwd=RAIZ).decode().split('\0')
    # Os três novos arquivos também podem ser ensaiados antes do primeiro commit.
    rastreados += ['manifest.webmanifest', 'js/pwa-update.js']
    ativos = []
    for nome in sorted(set(filter(None, rastreados))):
        relativo = Path(nome)
        if not publicar(relativo):
            continue
        origem = RAIZ / relativo
        if not origem.is_file() or origem.is_symlink():
            raise SystemExit(f'Arquivo público não regular: {nome}')
        conteudo = origem.read_bytes()
        if nome in {'index.html', 'index-f2.html'}:
            conteudo = conteudo.replace(b'__PWA_RELEASE__', versao.encode())
        alvo = destino / relativo
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_bytes(conteudo)
        ativos.append({'url': quote(nome, safe='/'), 'sha256': hashlib.sha256(conteudo).hexdigest(), 'bytes': len(conteudo)})
    manifesto = {'version': versao, 'assets': ativos}
    serializado = json.dumps(manifesto, ensure_ascii=False, separators=(',', ':')).encode()
    (destino / 'release.json').write_bytes(serializado)
    # SW muda em toda publicação e verifica o manifesto antes de buscar os ativos.
    worker = (RAIZ / 'sw.js').read_text().replace('__PWA_RELEASE__', versao)
    worker = worker.replace('__PWA_MANIFEST_HASH__', hashlib.sha256(serializado).hexdigest())
    (destino / 'sw.js').write_text(worker)
    (destino / '.nojekyll').touch()
    print(json.dumps({'version': versao, 'assets': len(ativos), 'bytes': sum(a['bytes'] for a in ativos), 'output': str(destino)}))


if __name__ == '__main__':
    main()
