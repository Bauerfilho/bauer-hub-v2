#!/usr/bin/env python3
"""Publica a edição de main em gh-pages, com versão automática e histórico preservado."""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPOSITORIO = 'Bauerfilho/bauer-hub-v2'
SITE = 'https://bauerfilho.github.io/bauer-hub-v2/'
# Git permite redirecionar índice, repositório, árvore e configuração por ambiente.
# Nenhum GIT_* do chamador pode atravessar para o checkout temporário de publicação.
# A autenticação GH_* e os arquivos normais de configuração do Git são preservados.
AMBIENTE = {chave: valor for chave, valor in os.environ.items() if not chave.startswith('GIT_')}
AMBIENTE.update(GIT_TERMINAL_PROMPT='0', GH_PROMPT_DISABLED='1')


def executar(args, cwd=RAIZ, entrada=None):
    """Sem shell, sem pergunta de senha e com teto de tempo por comando."""
    return subprocess.run(args, cwd=cwd, input=entrada, text=True, capture_output=True,
                          check=True, timeout=180, env=AMBIENTE).stdout.strip()


def git(*args, cwd=RAIZ):
    return executar(['git', *args], cwd=cwd)


def remoto(branch):
    linhas = git('ls-remote', '--heads', 'origin', 'refs/heads/' + branch).splitlines()
    return linhas[0].split()[0] if linhas else None


def conferir_fonte(versao=None):
    """O pacote deve representar exatamente um commit já publicado em main."""
    if git('status', '--porcelain', '--untracked-files=all'):
        raise RuntimeError('O checkout contém alterações ou arquivos não rastreados. Faça o commit antes de publicar.')
    atual = git('rev-parse', 'HEAD')
    if versao and atual != versao:
        raise RuntimeError('HEAD mudou durante a preparação. A publicação foi interrompida.')
    if remoto('main') != atual:
        raise RuntimeError('HEAD precisa ser exatamente o commit atual de origin/main.')
    return atual


def api(caminho, metodo='GET', dados=None):
    args = ['gh', 'api', '--method', metodo, f'repos/{REPOSITORIO}/pages' + caminho]
    if dados is not None:
        args.extend(['--input', '-'])
    retorno = executar(args, entrada=json.dumps(dados) if dados is not None else None)
    return json.loads(retorno) if retorno else {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wait', type=int, default=0, metavar='SEGUNDOS',
                        help='Acompanhar o build por até 600 segundos; padrão: apenas informar o estado.')
    args = parser.parse_args()
    if not 0 <= args.wait <= 600:
        parser.error('--wait deve estar entre 0 e 600 segundos.')
    if not shutil.which('git') or not shutil.which('gh'):
        raise RuntimeError('Git e GitHub CLI (gh) precisam estar disponíveis; nenhuma dependência será instalada.')
    origem = git('remote', 'get-url', 'origin')
    esperados = {
        'https://github.com/bauerfilho/bauer-hub-v2',
        'git@github.com:bauerfilho/bauer-hub-v2',
        'ssh://git@github.com/bauerfilho/bauer-hub-v2',
    }
    if origem.lower().removesuffix('.git').rstrip('/') not in esperados:
        raise RuntimeError('Origin não corresponde ao repositório autorizado Bauerfilho/bauer-hub-v2.')
    versao = conferir_fonte()
    pasta = Path(tempfile.mkdtemp(prefix='receituarios-publicacao-'))
    site = pasta / 'site'
    checkout = pasta / 'gh-pages'
    relato = {'source': versao, 'repo': REPOSITORIO, 'site': SITE,
              'artifact': str(site), 'report': str(pasta / 'publicacao.json'), 'state': 'preparando'}

    def registrar(**dados):
        relato.update(dados)
        Path(relato['report']).write_text(json.dumps(relato, ensure_ascii=False, indent=2) + '\n')

    registrar()
    try:
        executar([sys.executable, str(RAIZ / 'scripts/build-pwa.py'), '--output', str(site), '--version', versao])
        # Repositório temporário contém somente o pacote: a árvore de trabalho original fica intacta.
        checkout.mkdir()
        git('init', '--quiet', cwd=checkout)
        git('remote', 'add', 'origin', origem, cwd=checkout)
        pai = remoto('gh-pages')
        if pai:
            git('fetch', '--quiet', '--depth=1', 'origin', 'refs/heads/gh-pages', cwd=checkout)
            if git('rev-parse', 'FETCH_HEAD', cwd=checkout) != pai:
                raise RuntimeError('gh-pages mudou durante a preparação. Nenhum push foi realizado.')
            git('reset', '--soft', 'FETCH_HEAD', cwd=checkout)
        git('read-tree', '--empty', cwd=checkout)
        for item in site.iterdir():
            destino = checkout / item.name
            if item.is_dir():
                shutil.copytree(item, destino)
            else:
                shutil.copy2(item, destino)
        git('add', '--all', cwd=checkout)
        arvore = git('write-tree', cwd=checkout)
        diferente = not pai or arvore != git('rev-parse', 'HEAD^{tree}', cwd=checkout)
        if diferente:
            identidade = re.fullmatch(r'(.*) <([^<>]+)> \d+ [+-]\d+', git('var', 'GIT_AUTHOR_IDENT'))
            if not identidade:
                raise RuntimeError('Configure a identidade de commit do Git antes de publicar.')
            git('config', 'user.name', identidade.group(1), cwd=checkout)
            git('config', 'user.email', identidade.group(2), cwd=checkout)
            git('commit', '--quiet', '-m', 'Publicar PWA da fonte ' + versao, cwd=checkout)
        publicado = git('rev-parse', 'HEAD', cwd=checkout)
        conferir_fonte(versao)
        if remoto('gh-pages') != pai:
            raise RuntimeError('Outra publicação avançou gh-pages. Nenhum push foi realizado; confira a concorrência.')
        if diferente:
            # Sem force: uma corrida remota também é recusada pelo próprio Git.
            git('push', 'origin', 'HEAD:refs/heads/gh-pages', cwd=checkout)
        registrar(state='branch-publicada', deployment_commit=publicado, new_commit=diferente)
        api('', 'PUT', {'build_type': 'legacy', 'source': {'branch': 'gh-pages', 'path': '/'}})
        try:
            api('/builds', 'POST')  # Uma única solicitação; não há repetição automática de build.
        except subprocess.CalledProcessError as erro:
            # O push pode ter disparado o mesmo build antes desta solicitação.
            if '(HTTP 409)' not in (erro.stderr or ''):
                raise
        limite = time.monotonic() + args.wait
        while True:
            estado = api('/builds/latest')
            nosso = estado.get('commit') == publicado
            situacao = 'build-' + estado.get('status', 'desconhecido') if nosso else 'aguardando-build-da-edicao'
            registrar(state=situacao, build=estado,
                      release_url=SITE + 'release.json')
            if nosso and estado.get('status') == 'errored':
                raise RuntimeError('O build nativo do Pages falhou; consulte o relatório preservado.')
            if nosso and estado.get('status') == 'built':
                break
            restante = limite - time.monotonic()
            if restante <= 0:
                break  # Pendente é informado; nunca interpretado como publicação comprovada.
            time.sleep(min(10, restante))
        print(json.dumps(relato, ensure_ascii=False, indent=2))
    except Exception:
        registrar(state=relato['state'] + '-interrompido')
        print('Relatório preservado em ' + relato['report'], file=sys.stderr)
        raise


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.SubprocessError) as erro:
        print('Publicação interrompida: ' + str(erro), file=sys.stderr)
        if isinstance(erro, subprocess.CalledProcessError) and erro.stderr:
            print(erro.stderr.strip(), file=sys.stderr)
        raise SystemExit(1)
