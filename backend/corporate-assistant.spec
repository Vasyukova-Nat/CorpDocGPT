# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_all

datas = [('rag_system', 'rag_system')]
binaries = []
hiddenimports = ['rag_system.ingest_component', 'rag_system.ingest_helper', 'rag_system.rag_service', 'rag_system.paths', 'chromadb', 'llama_index.core', 'llama_index.embeddings.huggingface', 'llama_index.vector_stores.chroma', 'sentence_transformers', 'pymupdf', 'unstructured', 'tiktoken_ext.openai_public']
datas += collect_data_files('tiktoken')
datas += collect_data_files('llama_index.core')
tmp_ret = collect_all('llama_index')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('chromadb')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='corporate-assistant',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
