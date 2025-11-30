from typing import Dict, List, Generator
import ollama
from .ingest_component import IngestComponent
from typing import Generator, Dict

class RAGService:
    def __init__(self, data_dir: str = "./data"):
        self.ingest_component = IngestComponent(persist_dir=data_dir)
        # self.model = "llama3.1:8b"
        # self.model = "llama3.2:1b"
        self.model = "qwen2.5:0.5b"
    
    def add_document(self, file_path: str, original_filename: str = None) -> Dict:
        """Добавить документ в базу знаний"""
        try:
            success = self.ingest_component.ingest_file(file_path, original_filename)
            return {
                "success": success,
                "file_path": file_path,
                "message": "Document successfully added to knowledge base" if success else "Failed to add document"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def query_documents(self, question: str) -> Dict:
        """Поиск по документам с генерацией ответа"""
        try:
            relevant_docs = self.ingest_component.query(question)
            
            context = "\n\n".join([doc.text for doc in relevant_docs[:3]])  # Берем топ-3
            
            if context:
                prompt = f"""
                Ты корпоративный AI-ассистент МТУСИ. Используй предоставленную информацию из базы знаний университета для ответа на вопрос.

                КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ МТУСИ:
                {context}

                ВОПРОС ПОЛЬЗОВАТЕЛЯ:
                {question}

                ОТВЕТ (будь точным и используй только информацию из контекста):
                """
            else:
                prompt = f"""
                Ты корпоративный AI-ассистент МТУСИ. Ответь на вопрос на основе твоих общих знаний о процессах университета.

                ВОПРОС: {question}

                ОТВЕТ:
                """
            
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={'temperature': 0.3}
            )
            
            return {
                "answer": response['response'],
                "sources_used": len(relevant_docs),
                "sources_preview": [doc.metadata.get('file_name', 'Unknown') for doc in relevant_docs[:3]],
                "context_length": len(context)
            }
            
        except Exception as e:
            return {"error": str(e), "answer": "Извините, произошла ошибка при поиске в документах"}
    
    def query_documents_stream(self, question: str) -> Generator[Dict, None, None]:
        """Streaming версия поиска по документам"""
        try:
            print("Вопрос: ", question, " \n")
            relevant_docs = self.ingest_component.query(question)

            if not relevant_docs:
                yield {
                    "type": "sources", 
                    "sources": [],
                    "sources_count": 0,
                    "has_sources": False
                }
                yield {
                    "type": "content", 
                    "content": "В базе знаний МТУСИ пока нет документов. Пожалуйста, загрузите документы через раздел 'База документов'.",
                    "done": True
                }
                return
        
            # context = "\n\n".join([doc.text for doc in relevant_docs[:3]])
            context_parts = []
            context1 = ""
            context2 = "" 
            context3 = ""
            
            for i, doc in enumerate(relevant_docs[:3]):
                if i < len(relevant_docs):
                    context_parts.append(doc.text)
                    if i == 0:
                        context1 = doc.text
                    elif i == 1:
                        context2 = doc.text
                    elif i == 2:
                        context3 = doc.text

            context = "\n\n".join(context_parts)

            if not context.strip():
                yield {
                    "type": "sources", 
                    "sources": [],
                    "sources_count": 0,
                    "has_sources": False
                }
                yield {
                    "type": "content", 
                    "content": "В загруженных документах нет информации по данному вопросу.",
                    "done": True
                }
                return
            
            prompt = f"""Ты корпоративный AI-ассистент МТУСИ. 

            ИНФОРМАЦИЯ ИЗ БАЗЫ ЗНАНИЙ:
            {context}

            ВОПРОС: {question}

            Отвечай ТОЛЬКО на основе информации из базы знаний. 

            ОТВЕТ:"""

            print("Контекст 1: \n", context1, "\n")
            print("Контекст 2: \n", context2, "\n")
            print("Контекст 3: \n", context3)
            
            # Streaming генерация через Ollama
            stream = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                options={'temperature': 0.1, 'num_predict': 400}
            )
            
            # Отправляем информацию об источниках сначала
            yield {
                "type": "sources", 
                "sources": [doc.metadata.get('file_name', 'Unknown') for doc in relevant_docs[:3]],
                "sources_count": len(relevant_docs),
                "has_sources": True
            }
            
            # Затем streaming ответ
            full_response = ""
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    content = chunk['message']['content']
                    full_response += content
                    yield {
                        "type": "content", 
                        "content": content,
                        "done": False
                    }
            
            # Финальный chunk
            yield {
                "type": "content",
                "content": "",
                "done": True,
                "full_response": full_response
            }
            
        except Exception as e:
            yield {"type": "error", "content": f"Ошибка: {str(e)}"}

    def get_knowledge_base_stats(self) -> Dict:
        """Получить статистику базы знаний"""
        return self.ingest_component.get_stats()
    
    def get_documents_list(self) -> List[dict]:
        """Получить список документов"""
        return self.ingest_component.get_documents_list()
    
    def delete_document(self, document_id: str) -> Dict:
        """Удалить документ из базы знаний по ID"""
        try:
            success = self.ingest_component.delete_document(document_id)
            return {
                "success": success,
                "message": f"Document {document_id} successfully deleted" if success else f"Document {document_id} not found"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}