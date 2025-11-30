import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import requests
import os
import uuid
from rag_system.rag_service import RAGService
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="Corporate AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RAGService()

class GenerateRequest(BaseModel):
    model: str              # Name of the model to be used
    prompt: str             
    stream: bool = False    # Flag to enable streaming of responses

class RAGQueryRequest(BaseModel):
    question: str

@app.get("/")
async def root():
    return {"message": "Corporate AI Assistant API", "status": "running"}

@app.get("/docs")
async def get_docs():
    """Перенаправление на Swagger документацию"""
    return {"message": "Visit /docs for Swagger UI"}

@app.post("/generate")
async def generate_full(request: GenerateRequest):
    """Оригинальный эндпоинт для генерации через Ollama"""
    url = "http://localhost:11434/api/generate"    
    headers = {"Content-Type": "application/json"}  
    data = {
        "model": request.model,     
        "prompt": request.prompt,   
        "stream": request.stream    
    }

    response = requests.post(url, headers=headers, data=json.dumps(data), stream=True)
    
    raw_response = ""
    for line in response.iter_lines():
        if line:
            raw_response += line.decode('utf-8') + "\n"     

    return raw_response

@app.post("/generate_formatted")
async def generate_formatted(request: GenerateRequest):
    """Оригинальный эндпоинт для форматированной генерации"""
    url = "http://localhost:11434/api/generate"    
    headers = {"Content-Type": "application/json"}  
    data = {
        "model": request.model,     
        "prompt": request.prompt,   
        "stream": request.stream   
    }

    response = requests.post(url, headers=headers, data=json.dumps(data), stream=True)
    
    formatted_response = ""
    for line in response.iter_lines():
        if line:
            try:
                json_line = json.loads(line.decode('utf-8'))        
                if "response" in json_line:
                    formatted_response += json_line["response"]     
            except json.JSONDecodeError:
                continue
    
    formatted_response = formatted_response.strip() + "\n"
    
    return {"response": formatted_response}

# ==================== RAG ====================

@app.post("/api/rag/upload")
async def rag_upload_document(file: UploadFile = File(...)):
    """Загрузка документа в RAG систему (базу знаний компании)"""
    temp_filename = None
    try:
        allowed_extensions = ['.pdf', '.docx', '.txt', '.md', '.json']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_extension} not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        temp_dir = "./temp_documents"
        os.makedirs(temp_dir, exist_ok=True)
        
        original_filename = file.filename
        temp_filename = f"{temp_dir}/temp_{uuid.uuid4()}{file_extension}"
        
        with open(temp_filename, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Starting ingestion of {file.filename}")
        result = rag_service.add_document(temp_filename, original_filename)
        
        # Очищаем временный файл ВНЕ зависимости от результата
        try:
            if temp_filename and os.path.exists(temp_filename):
                os.remove(temp_filename)
                logger.info(f"Cleaned up temporary file: {temp_filename}")
        except Exception as cleanup_error:
            logger.warning(f"Could not remove temp file {temp_filename}: {cleanup_error}")
        
        if not result.get("success", False):
            raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
        
        return {
            "success": True,
            "filename": original_filename,
            "message": "Document successfully added to corporate knowledge base",
            "document_id": str(uuid.uuid4())
        }
        
    except HTTPException:
        # Всегда очищаем временный файл даже при исключениях
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
        raise
    except Exception as e:
        # Всегда очищаем временный файл даже при исключениях
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
        logger.error(f"Upload error for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@app.post("/api/rag/query")
async def rag_query(request: RAGQueryRequest):
    """Запрос к базе знаний компании"""
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        result = rag_service.query_documents(request.question.strip())
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "question": request.question,
            "answer": result.get("answer", "No answer generated"),
            "sources_used": result.get("sources_used", 0),
            "sources": result.get("sources_preview", []),
            "context_length": result.get("context_length", 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

@app.post("/api/rag/query/stream")
async def rag_query_stream(request: RAGQueryRequest):
    """Streaming запрос к базе знаний компании"""
    async def generate():
        try:
            # Получаем streaming ответ от RAG сервиса
            for chunk in rag_service.query_documents_stream(request.question):
                yield f"data: {json.dumps(chunk)}\n\n"
                
        except Exception as e:
            error_chunk = {"type": "error", "content": f"Ошибка: {str(e)}"}
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        generate(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/api/rag/stats")
async def rag_stats():
    """Статистика базы знаний компании"""
    try:
        stats = rag_service.get_knowledge_base_stats()
        return {
            "knowledge_base_status": "active",
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

# ==================== CHAT ====================

@app.post("/api/chat") # Сейчас не используется
async def chat_with_assistant(request: RAGQueryRequest):
    """Умный чат с ассистентом (использует базу знаний когда возможно)"""
    try:
        # Определяем, стоит ли использовать RAG для этого вопроса
        use_rag = should_use_rag(request.question)
        
        if use_rag:
            result = rag_service.query_documents(request.question)
            if result.get("sources_used", 0) > 0:
                return {
                    "type": "rag_response",
                    "question": request.question,
                    "answer": result.get("answer", "No answer generated"),
                    "sources_used": result.get("sources_used", 0),
                    "sources": result.get("sources_preview", []),
                    "context_based": True
                }
        
        # Если RAG не подошел или нет документов, используем обычную генерацию
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:0.5b",
                "prompt": f"Ты корпоративный AI-ассистент. Ответь на вопрос: {request.question}",
                "stream": False
            }
        )
        
        return {
            "type": "general_response",
            "question": request.question,
            "answer": response.json().get("response", "No response generated"),
            "context_based": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/api/chat/stream") # Сейчас не используется
async def chat_stream(request: RAGQueryRequest):
    """Streaming чат с ассистентом"""
    async def generate():
        try:
            # Получаем streaming ответ от RAG сервиса
            for chunk in rag_service.query_documents_stream(request.question):
                yield f"data: {json.dumps(chunk)}\n\n"
                
        except Exception as e:
            error_chunk = {"type": "error", "content": f"Ошибка: {str(e)}"}
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        generate(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# ==================== DOCUMENTS LIST & MANAGEMENT ====================

@app.get("/api/rag/documents")
async def rag_get_documents():
    """Получить список всех документов в базе знаний"""
    try:
        documents = rag_service.get_documents_list()
        return documents
        
    except Exception as e:
        logger.error(f"Error getting documents list: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting documents: {str(e)}")

@app.delete("/api/rag/documents/{document_id}")
async def rag_delete_document(document_id: str):
    """Удалить документ из базы знаний по ID"""
    try:
        result = rag_service.delete_document(document_id)
        
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail=result.get("message", "Document not found"))
        
        return {
            "success": True,
            "message": f"Document {document_id} successfully deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

# ==================== FILE ACCESS ====================

@app.get("/api/rag/documents/{document_id}/file")
async def rag_get_document_file(document_id: str):
    """Получить информацию о файле для открытия"""
    try:
        # Получаем список документов чтобы найти файл
        documents = rag_service.get_documents_list()
        target_doc = None
        
        for doc in documents:
            if doc['id'] == document_id:
                target_doc = doc
                break
        
        if not target_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Возвращаем информацию о файле
        return {
            "filename": target_doc['filename'],
            "type": target_doc['type'],
            "size": target_doc['size'],
            "uploadDate": target_doc['uploadDate'],
            "can_preview": target_doc['type'] in ['pdf', 'txt', 'md']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document file info {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting document info: {str(e)}")

# ==================== HEALTH & UTILS ====================

@app.get("/health")
async def health_check():
    """Проверка статуса всех компонентов системы"""
    try:
        ollama_response = requests.get("http://localhost:11434/api/tags")
        ollama_ok = ollama_response.status_code == 200
        
        rag_stats = rag_service.get_knowledge_base_stats()
        rag_ok = "error" not in rag_stats
        
        return {
            "status": "healthy" if ollama_ok and rag_ok else "degraded",
            "components": {
                "ollama": "healthy" if ollama_ok else "unavailable",
                "rag_system": "healthy" if rag_ok else "degraded",
                "knowledge_base_documents": rag_stats.get("document_count", 0)
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

def should_use_rag(question: str) -> bool:
    """Определяет, стоит ли использовать RAG для данного вопроса"""
    question_lower = question.lower()
    
    # Ключевые слова, которые указывают на вопросы о процессах компании
    rag_keywords = [
        'как оформить', 'процедура', 'инструкция', 'документ', 'шаблон',
        'регламент', 'политика', 'правила', 'требования', 'стандарт',
        'компании', 'организации', 'корпоративный', 'внутренний',
        'командировка', 'отпуск', 'увольнение', 'прием', 'договор',
        'отчет', 'заявка', 'согласование', 'подписание'
    ]
    
    return any(keyword in question_lower for keyword in rag_keywords)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)