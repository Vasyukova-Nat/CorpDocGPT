@echo off
pip install pyinstaller
pyinstaller --onefile --name Start_CorpDocGPT start_CorpDocGPT.py
echo Start_CorpDocGPT.exe создан в папке dist/
pause