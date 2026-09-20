#!/usr/bin/env python3
"""Prova local: variáveis Git herdadas não podem alterar o índice de outro checkout."""
import hashlib
import os
import runpy
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parents[1]


def main():
    # O próprio ensaio também começa em ambiente Git isolado.
    limpo = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    limpo['GIT_TERMINAL_PROMPT'] = '0'

    def git(pasta, *args):
        return subprocess.check_output(['git', *args], cwd=pasta, env=limpo, text=True).strip()

    with tempfile.TemporaryDirectory(prefix='qa-publicacao-env-') as base:
        pasta = Path(base)
        externo = pasta / 'checkout-sentinela'
        interno = pasta / 'checkout-publicacao'
        for repo in (externo, interno):
            repo.mkdir()
            git(repo, 'init', '--quiet')
        (externo / 'sentinela.txt').write_text('Conteúdo que não pertence à publicação.\n')
        git(externo, 'add', 'sentinela.txt')
        indice = externo / '.git/index'
        hash_antes = hashlib.sha256(indice.read_bytes()).hexdigest()
        configuracao_antes = (externo / '.git/config').read_bytes()
        (interno / 'produto.html').write_text('<p>Fixture pública.</p>\n')

        # Índice, pasta Git, árvore e configuração apontam deliberadamente para fora do temporário.
        hostil = dict(limpo, GIT_DIR=str(externo / '.git'), GIT_WORK_TREE=str(externo),
                      GIT_INDEX_FILE=str(indice), GIT_COMMON_DIR=str(externo / '.git'),
                      GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='user.name',
                      GIT_CONFIG_VALUE_0='CONFIGURACAO_INJETADA', GH_HOST='github.com')
        with patch.dict(os.environ, hostil, clear=True):
            modulo = runpy.run_path(str(RAIZ / 'scripts/publish-pages.py'), run_name='publisher_em_ensaio')
        ambiente = modulo['AMBIENTE']
        assert {k for k in ambiente if k.startswith('GIT_')} == {'GIT_TERMINAL_PROMPT'}
        assert ambiente['GH_HOST'] == 'github.com'
        modulo['git']('read-tree', '--empty', cwd=interno)
        modulo['git']('add', '--all', cwd=interno)

        assert hashlib.sha256(indice.read_bytes()).hexdigest() == hash_antes, 'Índice externo foi alterado.'
        assert (externo / '.git/config').read_bytes() == configuracao_antes, 'Configuração externa foi alterada.'
        assert git(externo, 'ls-files') == 'sentinela.txt'
        assert git(interno, 'ls-files') == 'produto.html'
        print('PASS: índice/configuração externos intactos; read-tree/add afetaram somente o checkout temporário.')


if __name__ == '__main__':
    main()
