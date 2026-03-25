import logging
import time
import json
from datetime import datetime
from pathlib import Path
from typing import List
from llama_index.core import VectorStoreIndex
from llama_index.core.schema import Document
from llama_index.core.storage import StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

from .ingest_helper import IngestionHelper

logger = logging.getLogger(__name__)

class IngestComponent:
    def __init__(self, persist_dir: str = "./data/chroma_db", max_retries: int = 3):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.max_retries = max_retries
        self.file_metadata_file = self.persist_dir / "file_metadata.json"
        self.file_metadata = self._load_file_metadata()
        
        self.ingestion_helper = IngestionHelper()
        
        self.vector_store = self._initialize_vector_store()
        self.storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )
        
        self.index = self._initialize_index()
    
    def _load_file_metadata(self) -> dict:
        """Загружает метаданные файлов из JSON"""
        try:
            if self.file_metadata_file.exists():
                with open(self.file_metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading file metadata: {e}")
        return {}

    def _save_file_metadata(self):
        """Сохраняет метаданные файлов в JSON"""
        try:
            with open(self.file_metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.file_metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving file metadata: {e}")

    def _initialize_vector_store(self):
        """Инициализирует векторное хранилище с retry логикой"""
        for attempt in range(self.max_retries):
            try:
                chroma_client = chromadb.PersistentClient(path=str(self.persist_dir))
                document_collection = chroma_client.get_or_create_collection("corporate_docs")
                return ChromaVectorStore(chroma_collection=document_collection)
            except Exception as e:
                logger.warning("Vector store initialization attempt %d failed: %s", attempt + 1, e)
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(1)
    
    def _initialize_index(self):
        """Инициализирует или загружает индекс"""
        for attempt in range(self.max_retries):
            try:
                # Пытаемся загрузить существующий индекс
                index = VectorStoreIndex.from_vector_store(
                    vector_store=self.vector_store,
                    embed_model=self.ingestion_helper.embed_model,
                    storage_context=self.storage_context
                )
                logger.info("Loaded existing vector store index")
                return index
            except Exception as e:
                if attempt == self.max_retries - 1:
                    logger.info("Creating new vector store index after %d attempts: %s", self.max_retries, e)
                    # Создаем новый пустой индекс
                    index = VectorStoreIndex.from_documents(
                        [],
                        storage_context=self.storage_context,
                        embed_model=self.ingestion_helper.embed_model
                    )
                    index.storage_context.persist(persist_dir=self.persist_dir)
                    return index
                logger.warning("Index loading attempt %d failed, retrying: %s", attempt + 1, e)
                time.sleep(1)
    
    def ingest_file(self, file_path: str, original_filename: str = None) -> bool:
        """Добавляет файл в базу знаний с семантическим разбиением"""
        file_path = Path(file_path)
        if not file_path.exists():
            logger.error("File not found: %s", file_path)
            return False
        
        # Используем оригинальное имя файла если передано, иначе берем из пути
        if original_filename:
            display_filename = original_filename
        else:
            display_filename = file_path.name
        
        self.file_metadata[display_filename] = {
            "original_filename": display_filename,
            "upload_date": datetime.now().isoformat(),
            "file_size": file_path.stat().st_size,
            "file_path": str(file_path),
            "internal_temp_name": file_path.name
        }
        self._save_file_metadata()
        
        for attempt in range(self.max_retries):
            try:
                documents = self.ingestion_helper.transform_file_into_documents(
                    display_filename, file_path
                )
                
                if not documents:
                    logger.warning("No documents extracted from %s", file_path)
                    return False
                
                logger.info("Ingesting %s semantic documents from %s", len(documents), file_path)
                
                # Вставляем документы в индекс
                for document in documents:
                    self.index.insert(document)
                
                # Сохраняем изменения
                self.index.storage_context.persist(persist_dir=self.persist_dir)
                logger.info("Successfully ingested %s with %s semantic documents", 
                           file_path, len(documents))
                return True
                
            except Exception as e:
                logger.warning("Ingestion attempt %d failed for %s: %s", attempt + 1, file_path, e)
                if attempt == self.max_retries - 1:
                    logger.error("All ingestion attempts failed for %s", file_path)
                    return False
                time.sleep(2 ** attempt)
    
    def query(self, question: str, top_k: int = 5) -> List[Document]:
        """Ищет релевантные документы для вопроса"""
        if not question or not question.strip():
            logger.warning("Empty query received")
            return []
            
        for attempt in range(self.max_retries):
            try:
                retriever = self.index.as_retriever(similarity_top_k=top_k)
                relevant_docs = retriever.retrieve(question.strip())
                found_documents = [doc.node for doc in relevant_docs]
                
                logger.debug("Query '%s' found %s documents", question, len(found_documents))
                
                # Логируем найденные документы для отладки
                for i, doc in enumerate(found_documents):
                    logger.debug("Doc %d: %s (similarity: %.4f)", 
                                i, doc.metadata.get('file_name', 'Unknown'), 
                                relevant_docs[i].score if hasattr(relevant_docs[i], 'score') else 0)
                
                return found_documents
                
            except Exception as e:
                logger.warning("Query attempt %d failed: %s", attempt + 1, e)
                if attempt == self.max_retries - 1:
                    logger.error("All query attempts failed for: %s", question)
                    return []
                time.sleep(1)
    
    def get_stats(self) -> dict:
        """Возвращает статистику базы знаний"""
        try:
            collection = self.vector_store._collection
            count = collection.count() if hasattr(collection, 'count') else 0
            return {
                "document_count": count,
                "vector_store": "ChromaDB",
                "embedding_model": "paraphrase-multilingual-MiniLM-L12-v2",
                "persist_dir": str(self.persist_dir),
                "status": "active",
                "retry_config": f"{self.max_retries} attempts",
                "splitter": "semantic"
            }
        except Exception as e:
            logger.error("Error getting stats: %s", e)
            return {
                "document_count": 0, 
                "error": str(e),
                "status": "error"
            }
        
    def get_documents_list(self) -> List[dict]:
        """Получить список документов с реальными метаданными"""
        try:
            collection = self.vector_store._collection
            if hasattr(collection, 'get'):
                results = collection.get()
            
                if not results or 'metadatas' not in results or not results['metadatas']:
                    return []
            
                documents_map = {}
                doc_counter = 1
            
                for i, metadata in enumerate(results['metadatas']):
                    if metadata and 'file_name' in metadata:
                        internal_filename = metadata['file_name']
                    
                        if internal_filename not in documents_map:
                            # Ищем метаданные по внутреннему имени
                            file_meta = None
                            for meta_key, meta_value in self.file_metadata.items():
                                if meta_value.get('internal_temp_name') == internal_filename or meta_key == internal_filename:
                                    file_meta = meta_value
                                    break
                        
                            display_name = file_meta.get("original_filename", internal_filename) if file_meta else internal_filename
                        
                            doc_id = f"doc_{doc_counter}"
                            doc_counter += 1
                        
                            documents_map[internal_filename] = {
                                "id": doc_id,
                                "filename": display_name,
                                "uploadDate": file_meta.get("upload_date", "2024-01-01T00:00:00Z") if file_meta else "2024-01-01T00:00:00Z",
                                "size": file_meta.get("file_size", 0) if file_meta else 0,
                                "type": display_name.split('.')[-1].lower() if '.' in display_name else 'unknown',
                                "chunks_count": 0,
                                "internal_filename": internal_filename
                            }
                        documents_map[internal_filename]["chunks_count"] += 1
            
                return list(documents_map.values())
        
            return []
        
        except Exception as e:
            logger.error(f"Error getting documents list: {e}")
            return []
    
    def delete_document(self, document_id: str) -> bool:
        """Удаляет документ из базы знаний по ID"""
        try:
            documents = self.get_documents_list()
            internal_filename_to_delete = None
        
            for doc in documents:
                if doc['id'] == document_id:
                    internal_filename_to_delete = doc.get('internal_filename')
                    break
        
            if not internal_filename_to_delete:
                logger.error(f"Document with ID {document_id} not found")
                return False
        
            collection = self.vector_store._collection
            if hasattr(collection, 'get'):
                results = collection.get()
            
                if not results or 'ids' not in results or not results['ids']:
                    return False
            
                ids_to_delete = []
                for i, metadata in enumerate(results['metadatas']):
                    if metadata and 'file_name' in metadata and metadata['file_name'] == internal_filename_to_delete:
                        ids_to_delete.append(results['ids'][i])
            
                if ids_to_delete:
                    collection.delete(ids=ids_to_delete)

                    meta_key_to_delete = None
                    for meta_key, meta_value in self.file_metadata.items():
                        if meta_value.get('internal_temp_name') == internal_filename_to_delete or meta_key == internal_filename_to_delete:
                            meta_key_to_delete = meta_key
                            break
                
                    if meta_key_to_delete and meta_key_to_delete in self.file_metadata:
                        del self.file_metadata[meta_key_to_delete]
                        self._save_file_metadata()
                
                    logger.info(f"Deleted document {internal_filename_to_delete} with {len(ids_to_delete)} chunks")
                    return True
                else:
                    logger.error(f"No chunks found for document {internal_filename_to_delete}")
        
            return False
        
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            return False
    
    def health_check(self) -> dict:
        """Проверка здоровья компонента"""
        try:
            stats = self.get_stats()
            index_ok = self.index is not None
            store_ok = self.vector_store is not None
            
            return {
                "status": "healthy" if index_ok and store_ok else "degraded",
                "components": {
                    "index": "healthy" if index_ok else "error",
                    "vector_store": "healthy" if store_ok else "error",
                    "embedding_model": "healthy",
                    "semantic_splitter": "healthy"
                },
                "statistics": stats
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }