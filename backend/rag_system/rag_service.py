from typing import Dict, List, Generator
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from .ingest_component import IngestComponent

class RAGService:
    def __init__(self, data_dir: str = "./data"):
        self.ingest_component = IngestComponent(persist_dir=data_dir)
        # self.model = "llama3.1:8b"
        # self.model = "llama3.2:1b"
        self.model = "qwen2.5:0.5b"

        self.llm = ChatOllama( # Инициализация LLM
            model=self.model,
            temperature=0.1, # Лучше попробовать 0.3
            num_predict=400,
            top_k=10,
            top_p=0.9
        )

    def _get_system_prompt(self, has_context: bool = False) -> str: # возвращает системный промпт
        if has_context:
            return """Ты корпоративный AI-ассистент МТУСИ. Используй предоставленную информацию из базы знаний университета для ответа на вопрос.
            ТВОЯ ЗАДАЧА: помогать находить информацию в документах базы знаний.
            Отвечай строго на основе предоставленного контекста из базы знаний. Если в контексте нет информации по вопросу, скажи "В документах МТУСИ нет информации по данному вопросу".
            Будь точным и кратким."""
        else:
            return """Ты корпоративный AI-ассистент МТУСИ.
            ТВОЯ ЗАДАЧА: помогать находить информацию в документах базы знаний.
            Если вопрос выходит за рамки твоих знаний, предложи обратиться к официальным документам.
            Будь точным и кратким."""

    def add_document(self, file_path: str, original_filename: str = None) -> Dict: # Добавить документ в базу знаний
        try:
            success = self.ingest_component.ingest_file(file_path, original_filename)
            return {
                "success": success,
                "file_path": file_path,
                "message": "Document successfully added to knowledge base" if success else "Failed to add document"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def query_documents(self, question: str, stream: bool = False) -> Generator[Dict, None, None] | Dict:
        """Поиск по документам с генерацией ответа. Поддерживает потоковый и непотоковый режимы.
        Args:
            question: Вопрос пользователя
            stream: Если True - возвращает генератор для стриминга, если False - возвращает словарь с ответом
        """
        try:
            print(f"Вопрос: {question}")
            relevant_docs = self.ingest_component.query(question)
                        
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
            # context = "\n\n".join([doc.text for doc in relevant_docs[:3]])
            has_context = bool(context and context.strip())
            
            if not has_context:
                if stream:
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
                else:
                    return {
                        "answer": "В загруженных документах нет информации по данному вопросу.",
                        "sources_used": 0,
                        "sources_preview": [],
                        "context_length": 0,
                        "has_context": False
                    }
            
            user_message = f"""
            КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
            {context if has_context else "Нет релевантных документов"}

            ВОПРОС ПОЛЬЗОВАТЕЛЯ: {question}

            ОТВЕТ:"""

            print("Контекст 1: \n", context1, "\n")
            print("Контекст 2: \n", context2, "\n")
            print("Контекст 3: \n", context3)
            
            messages = [
                SystemMessage(content=self._get_system_prompt(has_context=True)),
                HumanMessage(content=user_message)
            ]
            
            sources_data = { # Инф-я об источниках
                "type": "sources", 
                "sources": [doc.metadata.get('file_name', 'Unknown') for doc in relevant_docs[:3]],
                "sources_count": len(relevant_docs),
                "has_sources": True
            }
            
            if stream: # Потоковый режим
                yield sources_data
                
                full_response = ""
                for chunk in self.llm.stream(messages):
                    content = chunk.content
                    if content:
                        full_response += content
                        yield {
                            "type": "content", 
                            "content": content,
                            "done": False
                        }
                
                yield {
                    "type": "content",
                    "content": "",
                    "done": True,
                    "full_response": full_response
                }
            else: # Непотоковый режим
                response = self.llm.invoke(messages)
                return {
                    "answer": response.content,
                    "sources_used": len(relevant_docs),
                    "sources_preview": [doc.metadata.get('file_name', 'Unknown') for doc in relevant_docs[:3]],
                    "context_length": len(context),
                    "has_context": has_context
                }
            
        except Exception as e:
            error_msg = f"Ошибка: {str(e)}"
            if stream:
                yield {"type": "error", "content": error_msg}
            else:
                return {"error": error_msg, "answer": "Извините, произошла ошибка при поиске в документах"}

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