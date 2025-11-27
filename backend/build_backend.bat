@echo off
echo Установка PyInstaller...
pip install pyinstaller

echo Создание спецификации для сборки...
pyinstaller --name backend ^
  --onefile ^
  --add-data "rag_system;rag_system" ^
  --hidden-import=rag_system.ingest_component ^
  --hidden-import=rag_system.ingest_helper ^
  --hidden-import=rag_system.rag_service ^
  --hidden-import=rag_system.paths ^
  --hidden-import=chromadb ^
  --hidden-import=llama_index.core ^
  --hidden-import=llama_index.embeddings.huggingface ^
  --hidden-import=llama_index.vector_stores.chroma ^
  --hidden-import=sentence_transformers ^
  --hidden-import=pymupdf ^
  --hidden-import=unstructured ^
  --hidden-import=tiktoken_ext.openai_public ^
  --collect-all llama_index ^
  --collect-all chromadb ^
  --collect-data tiktoken ^
  --collect-data llama_index.core ^
  app.py

echo Копирование дополнительных файлов...
if not exist "dist\data" mkdir "dist\data"
if not exist "dist\temp_documents" mkdir "dist\temp_documents"

echo Готово! .exe файл находится в папке dist/
pause