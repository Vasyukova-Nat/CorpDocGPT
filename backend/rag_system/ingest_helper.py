import logging
from pathlib import Path
from typing import List
from llama_index.core.schema import Document
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.readers import StringIterableReader

logger = logging.getLogger(__name__)

class IngestionHelper:
    """Хелпер для обработки файлов с семантическим разбиением"""
    
    def __init__(self):
        try:
            # Используем русскоязычную модель для лучшего качества
            self.embed_model = HuggingFaceEmbedding(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )
        except Exception as e:
            logger.warning("Failed to load multilingual embedding model, using fallback: %s", e)
            from llama_index.embeddings.mock import MockEmbedding
            self.embed_model = MockEmbedding(embed_dim=384)
        
        # Создаем семантический сплиттер с оптимальными параметрами для русских текстов
        self.splitter = SemanticSplitterNodeParser(
            buffer_size=1,
            breakpoint_percentile_threshold=95,
            embed_model=self.embed_model
        )
    
    def transform_file_into_documents(self, file_name: str, file_data: Path) -> List[Document]:
        """Преобразует файл в документы"""
        try:
            # Сначала загружаем файл как один большой документ
            raw_documents = self._load_file_to_documents(file_name, file_data)
            
            if not raw_documents:
                logger.warning("No documents extracted from %s", file_name)
                return []
            
            # Применяем семантическое разбиение к каждому документу
            all_nodes = []
            for doc in raw_documents:
                # Добавляем метаданные перед разбиением
                doc.metadata["file_name"] = file_name
                doc.metadata["original_doc_id"] = doc.doc_id
                
                # Разбиваем документ на семантические узлы
                nodes = self.splitter.get_nodes_from_documents([doc])
                all_nodes.extend(nodes)
            
            # Преобразуем узлы обратно в документы с сохранением метаданных
            documents = self._nodes_to_documents(all_nodes, file_name)
            
            logger.info("Transformed file=%s into %s semantic documents", file_name, len(documents))
            return documents
            
        except Exception as e:
            logger.error("Error processing file %s: %s", file_name, e)
            # используем обычное разбиение
            return self._fallback_transform(file_name, file_data)

    def _load_file_to_documents(self, file_name: str, file_data: Path) -> List[Document]:
        """Загружает файл в документы"""
        extension = Path(file_name).suffix.lower()
        
        if extension == '.pdf':
            return self._read_pdf(file_data, file_name)
        elif extension in ['.txt', '.md']:
            # Для текстовых файлов используем простое чтение
            return self._read_as_text(file_data, file_name)
        elif extension == '.json':
            # Для JSON используем специальный ридер
            return self._read_json(file_data, file_name)
        else:
            logger.warning("Unsupported extension %s, using text reader", extension)
            return self._read_as_text(file_data, file_name)

    def _read_pdf(self, file_data: Path, file_name: str) -> List[Document]:
        try:
            import fitz  # PyMuPDF
           
            doc = fitz.open(file_data)
            all_text = []
            for page in doc:
                text = page.get_text()
                if text.strip():
                    all_text.append(self._clean_text(text))
            doc.close()

            if not all_text:
                return []
            
            document = Document(
                text="\n\n".join(all_text),
                metadata={"file_name": file_name}
            )
            return [document]
            
        except Exception as e:
            logger.error("PDF reading failed: %s: %s", file_name, e)
            return []

    def _clean_text(self, text: str) -> str:
        """Очищает текст от лишних пробелов и артефактов"""
        import re
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r' +', ' ', text)
        text = re.sub(r'-\n', '', text)
        text = text.strip()
        
        if len(text) < 20:  # фильтруем слишком короткие тексты
            return ""
        return text

    def _read_as_text(self, file_data: Path, file_name: str) -> List[Document]:
        """Читает файл как простой текст"""
        try:
            if isinstance(file_data, Path) and file_data.exists():
                text_content = file_data.read_text(encoding='utf-8', errors='ignore')
            else:
                text_content = str(file_data)
            
            # Создаем один большой документ для семантического разбиения
            document = Document(
                text=text_content,
                metadata={"file_name": file_name}
            )
            return [document]
        except Exception as e:
            logger.error("Text reading failed: %s", e)
            return []

    def _read_json(self, file_data: Path, file_name: str) -> List[Document]:
        """Читает JSON файл"""
        try:
            import json
            if isinstance(file_data, Path) and file_data.exists():
                with open(file_data, 'r', encoding='utf-8') as f:
                    json_content = json.load(f)
                
                # Преобразуем JSON в текстовый формат для семантического разбиения
                if isinstance(json_content, dict):
                    text_content = self._dict_to_text(json_content)
                elif isinstance(json_content, list):
                    text_content = self._list_to_text(json_content)
                else:
                    text_content = str(json_content)
                
                document = Document(
                    text=text_content,
                    metadata={"file_name": file_name, "file_type": "json"}
                )
                return [document]
            return []
        except Exception as e:
            logger.error("JSON reading failed: %s", e)
            return self._read_as_text(file_data, file_name)

    def _dict_to_text(self, data: dict) -> str:
        """Преобразует словарь в читаемый текст"""
        lines = []
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                value_str = str(value)
            else:
                value_str = str(value)
            lines.append(f"{key}: {value_str}")
        return "\n".join(lines)

    def _list_to_text(self, data: list) -> str:
        """Преобразует список в читаемый текст"""
        return "\n".join([str(item) for item in data])

    def _nodes_to_documents(self, nodes: List, file_name: str) -> List[Document]:
        """Преобразует узлы обратно в документы"""
        documents = []
        for i, node in enumerate(nodes):
            document = Document(
                text=node.text,
                metadata={
                    "file_name": file_name,
                    "chunk_id": i,
                    "node_id": node.node_id
                }
            )
            # Настраиваем исключаемые метаданные
            document.excluded_embed_metadata_keys = ["file_name", "chunk_id", "node_id"]
            document.excluded_llm_metadata_keys = ["file_name", "chunk_id", "node_id"]
            documents.append(document)
        return documents

    def _fallback_transform(self, file_name: str, file_data: Path) -> List[Document]:
        """Fallback метод для обработки файлов при ошибках"""
        try:
            reader = StringIterableReader()
            text_content = file_data.read_text(encoding='utf-8', errors='ignore')
            documents = reader.load_data([text_content])
            
            for document in documents:
                document.metadata["file_name"] = file_name
                document.excluded_embed_metadata_keys = ["file_name"]
                document.excluded_llm_metadata_keys = ["file_name"]
            
            logger.info("Used fallback transform for %s, created %s documents", 
                       file_name, len(documents))
            return documents
        except Exception as e:
            logger.error("Fallback transform also failed for %s: %s", file_name, e)
            return []